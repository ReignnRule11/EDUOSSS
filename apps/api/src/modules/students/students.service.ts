import type { AuthPrincipal } from "@eduos/shared";
import { Injectable } from "@nestjs/common";
import { AcademicStatus, Prisma } from "@prisma/client";

import type { BulkImportStudentsDto } from "./dto/bulk-import-students.dto";
import type { CreateStudentDto } from "./dto/create-student.dto";
import type { QueryStudentsDto } from "./dto/query-students.dto";
import {
  BadRequestOperationException,
  ConflictResourceException,
  ResourceNotFoundException,
} from "../../common/exceptions/business.exceptions";
import { BaseRepository } from "../../common/repositories/base.repository";
import {
  buildOrderBy,
  buildPaginationMeta,
  toPaginationArgs,
} from "../../common/utils/pagination.util";
import {
  assertStudentInScope,
  resolveStudentScope,
  type StudentScope,
} from "../../common/utils/student-scope.util";
import { PrismaService } from "../../database/prisma.service";
import { FilesService } from "../files/files.service";
import { TimelineService } from "../timeline/timeline.service";

const SEARCHABLE = [
  "admissionNumber",
  "firstName",
  "lastName",
  "guardianName",
  "guardianPhone",
  "guardianEmail",
] as const;

@Injectable()
export class StudentsService extends BaseRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly timelineService: TimelineService,
    private readonly filesService: FilesService,
  ) {
    super();
  }

  async create(dto: CreateStudentDto, createdById?: string) {
    await this.assertSchoolBelongsToTenant(dto.schoolId);

    const conflict = await this.prisma.scoped.student.findFirst({
      where: this.tenantWhere({ admissionNumber: dto.admissionNumber }),
    });
    if (conflict) {
      throw new ConflictResourceException(
        `Admission number "${dto.admissionNumber}" already exists`,
      );
    }

    const student = await this.prisma.scoped.student.create({
      data: {
        ...dto,
        academicStatus: dto.academicStatus ?? AcademicStatus.ACTIVE,
      } as Prisma.StudentUncheckedCreateInput,
      include: this.studentInclude,
    });

    if (createdById) {
      await this.timelineService.record(
        {
          studentId: student.id,
          eventType: "REGISTRATION",
          title: "Student registered",
          description: `${student.firstName} ${student.lastName} (${student.admissionNumber}) was registered`,
        },
        createdById,
      );
    }

    return student;
  }

  async findAll(query: QueryStudentsDto, actor?: AuthPrincipal) {
    const pagination = toPaginationArgs(query);
    const scope = actor
      ? await resolveStudentScope(this.prisma.scoped, actor)
      : { studentIds: null as string[] | null };
    const where = this.buildWhere(query, scope);

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.scoped.student.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: buildOrderBy(query, [
          "admissionNumber",
          "firstName",
          "lastName",
          "gradeLevel",
          "createdAt",
        ]) as Prisma.StudentOrderByWithRelationInput,
        include: this.studentInclude,
      }),
      this.prisma.scoped.student.count({ where }),
    ]);

    return {
      items,
      meta: buildPaginationMeta(totalItems, pagination.page, pagination.limit),
    };
  }

  async findOne(id: string, actor?: AuthPrincipal) {
    const scope = actor
      ? await resolveStudentScope(this.prisma.scoped, actor)
      : { studentIds: null as string[] | null };
    assertStudentInScope(scope, id);
    const student = await this.prisma.scoped.student.findFirst({
      where: this.tenantWhere({ id }),
      include: this.profileInclude,
    });
    if (!student) {
      throw new ResourceNotFoundException("Student", id);
    }
    return student;
  }

  async update(
    id: string,
    dto: Partial<CreateStudentDto>,
    updatedById?: string,
  ) {
    const existing = await this.findOne(id);
    if (dto.schoolId) {
      await this.assertSchoolBelongsToTenant(dto.schoolId);
    }
    if (dto.admissionNumber) {
      const conflict = await this.prisma.scoped.student.findFirst({
        where: this.tenantWhere({
          admissionNumber: dto.admissionNumber,
          id: { not: id },
        }),
      });
      if (conflict) {
        throw new ConflictResourceException(
          `Admission number "${dto.admissionNumber}" already exists`,
        );
      }
    }

    const student = await this.prisma.scoped.student.update({
      where: { id },
      data: dto as Prisma.StudentUpdateInput,
      include: this.profileInclude,
    });

    if (updatedById) {
      const changed = Object.keys(dto).filter((key) => {
        const next = (dto as Record<string, unknown>)[key];
        const prev = (existing as unknown as Record<string, unknown>)[key];
        return next !== undefined && next !== prev;
      });
      if (changed.length > 0) {
        await this.timelineService.record(
          {
            studentId: id,
            eventType: "PROFILE_UPDATE",
            title: "Profile updated",
            description: `Updated: ${changed.join(", ")}`,
          },
          updatedById,
        );
      }
    }

    return student;
  }

  /** Transitions a student's academic status and records a timeline event. */
  async updateStatus(
    id: string,
    status: AcademicStatus,
    note?: string,
    actorId?: string,
  ) {
    const student = await this.findOne(id);
    const studentRecord = await this.prisma.scoped.student.update({
      where: { id },
      data: { academicStatus: status },
      include: this.profileInclude,
    });

    await this.timelineService.record(
      {
        studentId: id,
        eventType: "STATUS_CHANGE",
        title: `Status changed to ${status.replaceAll("_", " ")}`,
        description:
          note ??
          `Academic status changed from ${student.academicStatus} to ${status}`,
      },
      actorId,
    );

    return studentRecord;
  }

  /** Uploads a photo for a student and records a profile update event. */
  async uploadPhoto(
    id: string,
    file: {
      originalname: string;
      mimetype: string;
      buffer: Buffer;
      size: number;
    },
    actorId?: string,
  ) {
    await this.findOne(id);

    const supported = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!supported.includes(file.mimetype)) {
      throw new BadRequestOperationException(
        `Unsupported image type "${file.mimetype}". Allowed: ${supported.join(", ")}`,
      );
    }

    const stored = await this.filesService.upload(file, undefined, actorId);

    const student = await this.prisma.scoped.student.update({
      where: { id },
      data: { photoUrl: stored.url },
      include: this.profileInclude,
    });

    await this.timelineService.record(
      {
        studentId: id,
        eventType: "PROFILE_UPDATE",
        title: "Profile photo uploaded",
      },
      actorId,
    );

    return student;
  }

  /** Bulk-creates students from a list. Skips duplicates when requested. */
  async bulkImport(dto: BulkImportStudentsDto, actorId?: string) {
    const results = {
      created: 0,
      skipped: 0,
      errors: [] as Array<{ admissionNumber: string; message: string }>,
    };

    for (const record of dto.students) {
      try {
        await this.assertSchoolBelongsToTenant(record.schoolId);
        const conflict = await this.prisma.scoped.student.findFirst({
          where: this.tenantWhere({ admissionNumber: record.admissionNumber }),
        });
        if (conflict) {
          if (dto.skipDuplicates) {
            results.skipped += 1;
            continue;
          }
          throw new ConflictResourceException(
            `Admission number "${record.admissionNumber}" already exists`,
          );
        }
        const student = await this.prisma.scoped.student.create({
          data: {
            ...record,
            academicStatus: record.academicStatus ?? AcademicStatus.ACTIVE,
          } as Prisma.StudentUncheckedCreateInput,
        });
        results.created += 1;
        await this.timelineService
          .record(
            {
              studentId: student.id,
              eventType: "REGISTRATION",
              title: "Student registered (bulk import)",
              description: `${record.firstName} ${record.lastName} imported in bulk`,
            },
            actorId,
          )
          .catch(() => undefined);
      } catch (error) {
        results.errors.push({
          admissionNumber: record.admissionNumber,
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return results;
  }

  /** Streams all students as CSV rows for export. */
  async exportCsv(query: QueryStudentsDto) {
    const where = this.buildWhere(query);
    const students = await this.prisma.scoped.student.findMany({
      where,
      orderBy: { admissionNumber: "asc" },
      include: { school: { select: { name: true, code: true } } },
    });

    const header = [
      "Admission Number",
      "First Name",
      "Last Name",
      "Gender",
      "Grade Level",
      "Academic Status",
      "Date of Birth",
      "School",
      "Guardian Name",
      "Guardian Phone",
      "Guardian Email",
      "Address",
    ];

    const rows = students.map((s) => [
      s.admissionNumber,
      s.firstName,
      s.lastName,
      s.gender,
      s.gradeLevel ?? "",
      s.academicStatus,
      s.dateOfBirth ? s.dateOfBirth.toISOString().slice(0, 10) : "",
      s.school?.name ?? "",
      s.guardianName ?? "",
      s.guardianPhone ?? "",
      s.guardianEmail ?? "",
      (s.address ?? "").replace(/,/g, " "),
    ]);

    const escape = (value: string) => `"${value.replaceAll('"', '""')}"`;
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => escape(cell)).join(","))
      .join("\n");

    return {
      csv,
      filename: `students-${new Date().toISOString().slice(0, 10)}.csv`,
    };
  }

  async remove(id: string, actorId?: string): Promise<void> {
    const student = await this.findOne(id);
    await this.prisma.scoped.student.update({
      where: { id },
      data: { academicStatus: "DROPPED", deletedAt: new Date() },
    });
    if (actorId) {
      await this.timelineService.record(
        {
          studentId: id,
          eventType: "STATUS_CHANGE",
          title: "Student archived",
          description: `${student.firstName} ${student.lastName} was archived`,
        },
        actorId,
      );
    }
  }

  private buildWhere(
    query: QueryStudentsDto,
    scope: StudentScope = { studentIds: null },
  ): Prisma.StudentWhereInput {
    const conditions: Prisma.StudentWhereInput[] = [];

    if (scope.studentIds !== null) {
      conditions.push({ id: { in: scope.studentIds } });
    }
    if (query.search) {
      conditions.push({
        OR: SEARCHABLE.map((field) => ({
          [field]: { contains: query.search, mode: "insensitive" as const },
        })),
      });
    }
    if (query.schoolId) conditions.push({ schoolId: query.schoolId });
    if (query.gender) conditions.push({ gender: query.gender });
    if (query.academicStatus)
      conditions.push({ academicStatus: query.academicStatus });
    if (query.gradeLevel) conditions.push({ gradeLevel: query.gradeLevel });
    if (query.active !== undefined) {
      conditions.push({
        academicStatus: query.active ? "ACTIVE" : { not: "ACTIVE" },
      });
    }

    return this.tenantWhere({
      AND: conditions.length > 0 ? conditions : undefined,
    });
  }

  private async assertSchoolBelongsToTenant(schoolId: string): Promise<void> {
    const school = await this.prisma.scoped.school.findFirst({
      where: this.tenantWhere({ id: schoolId }),
      select: { id: true },
    });
    if (!school) {
      throw new BadRequestOperationException(
        "The provided schoolId does not belong to this tenant",
      );
    }
  }

  private get studentInclude(): Prisma.StudentInclude {
    return {
      school: { select: { id: true, name: true, code: true } },
      enrollments: {
        select: {
          id: true,
          academicYear: true,
          term: true,
          status: true,
          classGroup: { select: { id: true, name: true } },
        },
      },
    };
  }

  private get profileInclude(): Prisma.StudentInclude {
    return {
      ...this.studentInclude,
      guardians: {
        where: { deletedAt: null },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        select: {
          id: true,
          firstName: true,
          lastName: true,
          relationship: true,
          phone: true,
          email: true,
          isPrimary: true,
          isEmergencyContact: true,
          occupation: true,
        },
      },
      medicalRecords: {
        where: { deletedAt: null },
        orderBy: { recordDate: "desc" },
        select: {
          id: true,
          recordType: true,
          title: true,
          recordDate: true,
          notes: true,
        },
      },
      disciplineRecords: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          category: true,
          severity: true,
          status: true,
          description: true,
          incidentDate: true,
        },
      },
      documents: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          category: true,
          fileName: true,
          mimeType: true,
          fileSize: true,
          notes: true,
        },
      },
    };
  }
}
