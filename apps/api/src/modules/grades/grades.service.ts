import type { AuthPrincipal } from "@eduos/shared";
import { Injectable } from "@nestjs/common";
import { GradeTerm, type Prisma } from "@prisma/client";

import type { CreateGradeDto } from "./dto/create-grade.dto";
import type { QueryGradesDto } from "./dto/query-grades.dto";
import {
  BadRequestOperationException,
  ConflictResourceException,
  ForbiddenOperationException,
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
} from "../../common/utils/student-scope.util";
import { PrismaService } from "../../database/prisma.service";

/** Maps a 0-100 score to a letter grade. */
export function scoreToLetterGrade(score: number): string {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

@Injectable()
export class GradesService extends BaseRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(dto: CreateGradeDto, recordedById?: string) {
    await this.assertAllInTenant(
      dto.studentId,
      dto.classGroupId,
      dto.subjectId,
    );

    const conflict = await this.prisma.scoped.grade.findFirst({
      where: {
        studentId: dto.studentId,
        subjectId: dto.subjectId,
        academicYear: dto.academicYear,
        term: dto.term,
      },
    });
    if (conflict) {
      throw new ConflictResourceException(
        "A grade for this student/subject/term already exists",
      );
    }

    const letterGrade =
      dto.score !== undefined ? scoreToLetterGrade(dto.score) : null;
    return this.prisma.scoped.grade.create({
      data: {
        studentId: dto.studentId,
        classGroupId: dto.classGroupId,
        subjectId: dto.subjectId,
        academicYear: dto.academicYear,
        term: dto.term,
        score: dto.score,
        letterGrade,
        remark: dto.remark,
        recordedById,
      } as Prisma.GradeUncheckedCreateInput,
      include: this.include,
    });
  }

  async findAll(query: QueryGradesDto, actor?: AuthPrincipal) {
    const pagination = toPaginationArgs(query);
    const conditions: Prisma.GradeWhereInput[] = [];
    if (query.studentId) conditions.push({ studentId: query.studentId });
    if (query.classGroupId)
      conditions.push({ classGroupId: query.classGroupId });
    if (query.subjectId) conditions.push({ subjectId: query.subjectId });
    if (query.academicYear)
      conditions.push({ academicYear: query.academicYear });
    if (query.term) conditions.push({ term: query.term });

    const scope = actor
      ? await resolveStudentScope(this.prisma.scoped, actor)
      : { studentIds: null as string[] | null };
    if (scope.studentIds !== null) {
      conditions.push({ studentId: { in: scope.studentIds } });
    }

    const where: Prisma.GradeWhereInput = {
      AND: conditions.length > 0 ? conditions : undefined,
    };
    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.scoped.grade.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: buildOrderBy(query, [
          "score",
          "academicYear",
          "term",
          "createdAt",
        ]) as Prisma.GradeOrderByWithRelationInput,
        include: this.include,
      }),
      this.prisma.scoped.grade.count({ where }),
    ]);

    return {
      items,
      meta: buildPaginationMeta(totalItems, pagination.page, pagination.limit),
    };
  }

  async findOne(id: string, actor?: AuthPrincipal) {
    const grade = await this.prisma.scoped.grade.findFirst({
      where: { id },
      include: this.include,
    });
    if (!grade) throw new ResourceNotFoundException("Grade", id);
    const scope = actor
      ? await resolveStudentScope(this.prisma.scoped, actor)
      : { studentIds: null as string[] | null };
    assertStudentInScope(scope, grade.studentId);
    return grade;
  }

  async update(id: string, dto: Partial<CreateGradeDto>) {
    await this.findOne(id);
    const letterGrade =
      dto.score !== undefined ? scoreToLetterGrade(dto.score) : undefined;
    return this.prisma.scoped.grade.update({
      where: { id },
      data: {
        ...(dto.score !== undefined ? { score: dto.score } : {}),
        ...(letterGrade !== undefined ? { letterGrade } : {}),
        ...(dto.remark !== undefined ? { remark: dto.remark } : {}),
      },
      include: this.include,
    });
  }

  /** Class average and grade distribution for a class/subject/term. */
  async classSummary(
    classGroupId: string,
    academicYear: string,
    term: GradeTerm,
    actor?: AuthPrincipal,
  ) {
    const scope = actor
      ? await resolveStudentScope(this.prisma.scoped, actor)
      : { studentIds: null as string[] | null };
    if (scope.studentIds !== null) {
      // A viewer (student/parent) must not see the whole class aggregate.
      throw new ForbiddenOperationException();
    }
    const where: Prisma.GradeWhereInput = { classGroupId, academicYear, term };
    const grades = await this.prisma.scoped.grade.findMany({
      where,
      select: { score: true, letterGrade: true },
    });

    const scored = grades.filter((g) => g.score !== null) as Array<{
      score: number;
      letterGrade: string | null;
    }>;
    const average =
      scored.length > 0
        ? scored.reduce((acc, g) => acc + g.score, 0) / scored.length
        : 0;

    const distribution: Record<string, number> = {};
    for (const grade of grades) {
      if (grade.letterGrade) {
        distribution[grade.letterGrade] =
          (distribution[grade.letterGrade] ?? 0) + 1;
      }
    }

    return {
      classGroupId,
      academicYear,
      term,
      records: grades.length,
      average: Number(average.toFixed(2)),
      distribution,
    };
  }

  private async assertAllInTenant(
    studentId: string,
    classGroupId: string,
    subjectId: string,
  ): Promise<void> {
    const [student, classGroup, subject] = await Promise.all([
      this.prisma.scoped.student.findFirst({
        where: { id: studentId },
        select: { id: true },
      }),
      this.prisma.scoped.classGroup.findFirst({
        where: { id: classGroupId },
        select: { id: true },
      }),
      this.prisma.scoped.subject.findFirst({
        where: { id: subjectId },
        select: { id: true },
      }),
    ]);
    if (!student)
      throw new BadRequestOperationException(
        "The provided studentId does not belong to this tenant",
      );
    if (!classGroup)
      throw new BadRequestOperationException(
        "The provided classGroupId does not belong to this tenant",
      );
    if (!subject)
      throw new BadRequestOperationException(
        "The provided subjectId does not belong to this tenant",
      );
  }

  private get include(): Prisma.GradeInclude {
    return {
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          admissionNumber: true,
        },
      },
      subject: { select: { id: true, name: true, code: true } },
      classGroup: { select: { id: true, name: true } },
    };
  }
}
