import { Injectable } from "@nestjs/common";
import { EnrollmentStatus, TransferStatus, type Prisma } from "@prisma/client";

import type { CreateStudentTransferDto } from "./dto/create-student-transfer.dto";
import type { QueryStudentTransfersDto } from "./dto/query-student-transfers.dto";
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
import { PrismaService } from "../../database/prisma.service";

@Injectable()
export class StudentTransfersService extends BaseRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(dto: CreateStudentTransferDto, createdById?: string) {
    await this.assertStudentInTenant(dto.studentId);
    await this.assertSchoolInTenant(dto.toSchoolId);
    if (dto.fromSchoolId) await this.assertSchoolInTenant(dto.fromSchoolId);
    if (dto.toClassGroupId) {
      await this.assertClassInTenant(dto.toClassGroupId);
    }

    return this.prisma.scoped.studentTransfer.create({
      data: {
        ...dto,
        createdById,
        status: TransferStatus.PENDING,
      } as Prisma.StudentTransferUncheckedCreateInput,
      include: this.include,
    });
  }

  async findAll(query: QueryStudentTransfersDto) {
    const pagination = toPaginationArgs(query);
    const conditions: Prisma.StudentTransferWhereInput[] = [];
    if (query.studentId) conditions.push({ studentId: query.studentId });
    if (query.status) conditions.push({ status: query.status });
    if (query.toSchoolId) conditions.push({ toSchoolId: query.toSchoolId });

    const where: Prisma.StudentTransferWhereInput = {
      deletedAt: null,
      AND: conditions.length > 0 ? conditions : undefined,
    };

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.scoped.studentTransfer.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: buildOrderBy(query, [
          "transferDate",
          "status",
          "createdAt",
        ]) as Prisma.StudentTransferOrderByWithRelationInput,
        include: this.include,
      }),
      this.prisma.scoped.studentTransfer.count({ where }),
    ]);

    return {
      items,
      meta: buildPaginationMeta(totalItems, pagination.page, pagination.limit),
    };
  }

  async findOne(id: string) {
    const transfer = await this.prisma.scoped.studentTransfer.findFirst({
      where: { id },
      include: this.include,
    });
    if (!transfer) throw new ResourceNotFoundException("Student transfer", id);
    return transfer;
  }

  async update(id: string, dto: Partial<CreateStudentTransferDto>) {
    const existing = await this.findOne(id);
    const { studentId, fromSchoolId, toSchoolId, toClassGroupId, ...rest } =
      dto;
    if (studentId && studentId !== existing.studentId) {
      await this.assertStudentInTenant(studentId);
    }
    if (fromSchoolId && fromSchoolId !== existing.fromSchoolId) {
      await this.assertSchoolInTenant(fromSchoolId);
    }
    if (toSchoolId && toSchoolId !== existing.toSchoolId) {
      await this.assertSchoolInTenant(toSchoolId);
    }
    if (toClassGroupId && toClassGroupId !== existing.toClassGroupId) {
      await this.assertClassInTenant(toClassGroupId);
    }

    return this.prisma.scoped.studentTransfer.update({
      where: { id },
      data: { ...rest } as Prisma.StudentTransferUpdateInput,
      include: this.include,
    });
  }

  /** Approves a pending transfer. */
  async approve(id: string, approvedById?: string) {
    const transfer = await this.findOne(id);
    if (transfer.status !== TransferStatus.PENDING) {
      throw new ConflictResourceException(
        `Transfer is already ${transfer.status.toLowerCase()}`,
      );
    }
    return this.prisma.scoped.studentTransfer.update({
      where: { id },
      data: {
        status: TransferStatus.APPROVED,
        approvedById,
        approvedAt: new Date(),
      },
      include: this.include,
    });
  }

  /**
   * Completes a transfer: moves the student to the destination school
   * (and class when provided) and closes their current enrollment.
   */
  async complete(id: string, completedById?: string) {
    const transfer = await this.findOne(id);
    if (transfer.status !== TransferStatus.APPROVED) {
      throw new ConflictResourceException(
        "Only approved transfers can be completed",
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.student.update({
        where: { id: transfer.studentId },
        data: { schoolId: transfer.toSchoolId },
      });

      await tx.enrollment.updateMany({
        where: {
          studentId: transfer.studentId,
          status: EnrollmentStatus.ACTIVE,
        },
        data: { status: EnrollmentStatus.TRANSFERRED },
      });

      if (transfer.toClassGroupId) {
        await tx.enrollment.create({
          data: {
            tenantId: this.tenantId(),
            studentId: transfer.studentId,
            classGroupId: transfer.toClassGroupId,
            academicYear: new Date(transfer.transferDate)
              .getFullYear()
              .toString(),
            term: "FIRST",
            status: EnrollmentStatus.ACTIVE,
          },
        });
      }
    });

    return this.prisma.scoped.studentTransfer.update({
      where: { id },
      data: {
        status: TransferStatus.COMPLETED,
        completedById,
        completedAt: new Date(),
      },
      include: this.include,
    });
  }

  /** Rejects a pending transfer. */
  async reject(id: string, approvedById?: string) {
    const transfer = await this.findOne(id);
    if (transfer.status !== TransferStatus.PENDING) {
      throw new ConflictResourceException(
        `Transfer is already ${transfer.status.toLowerCase()}`,
      );
    }
    return this.prisma.scoped.studentTransfer.update({
      where: { id },
      data: {
        status: TransferStatus.REJECTED,
        approvedById,
        approvedAt: new Date(),
      },
      include: this.include,
    });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.scoped.studentTransfer.updateMany({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private async assertStudentInTenant(studentId: string): Promise<void> {
    const student = await this.prisma.scoped.student.findFirst({
      where: { id: studentId },
      select: { id: true },
    });
    if (!student) {
      throw new BadRequestOperationException(
        "The provided studentId does not belong to this tenant",
      );
    }
  }

  private async assertSchoolInTenant(schoolId: string): Promise<void> {
    const school = await this.prisma.scoped.school.findFirst({
      where: { id: schoolId },
      select: { id: true },
    });
    if (!school) {
      throw new BadRequestOperationException(
        "The provided schoolId does not belong to this tenant",
      );
    }
  }

  private async assertClassInTenant(classGroupId: string): Promise<void> {
    const classGroup = await this.prisma.scoped.classGroup.findFirst({
      where: { id: classGroupId },
      select: { id: true },
    });
    if (!classGroup) {
      throw new BadRequestOperationException(
        "The provided classGroupId does not belong to this tenant",
      );
    }
  }

  private get include(): Prisma.StudentTransferInclude {
    return {
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          admissionNumber: true,
        },
      },
      toSchool: { select: { id: true, name: true, code: true } },
      fromSchool: { select: { id: true, name: true, code: true } },
      toClassGroup: { select: { id: true, name: true } },
    };
  }
}
