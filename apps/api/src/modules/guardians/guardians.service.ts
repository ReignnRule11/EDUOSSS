import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";

import type { CreateGuardianDto } from "./dto/create-guardian.dto";
import type { QueryGuardiansDto } from "./dto/query-guardians.dto";
import {
  BadRequestOperationException,
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
export class GuardiansService extends BaseRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(dto: CreateGuardianDto) {
    await this.assertStudentInTenant(dto.studentId);
    return this.prisma.scoped.guardian.create({
      data: { ...dto } as Prisma.GuardianUncheckedCreateInput,
      include: this.include,
    });
  }

  async findAll(query: QueryGuardiansDto) {
    const pagination = toPaginationArgs(query);
    const conditions: Prisma.GuardianWhereInput[] = [];
    if (query.studentId) conditions.push({ studentId: query.studentId });
    if (query.relationship)
      conditions.push({ relationship: query.relationship });

    const where: Prisma.GuardianWhereInput = {
      deletedAt: null,
      AND: conditions.length > 0 ? conditions : undefined,
    };

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.scoped.guardian.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: buildOrderBy(query, [
          "firstName",
          "lastName",
          "relationship",
          "createdAt",
        ]) as Prisma.GuardianOrderByWithRelationInput,
        include: this.include,
      }),
      this.prisma.scoped.guardian.count({ where }),
    ]);

    return {
      items,
      meta: buildPaginationMeta(totalItems, pagination.page, pagination.limit),
    };
  }

  async findOne(id: string) {
    const guardian = await this.prisma.scoped.guardian.findFirst({
      where: { id },
      include: this.include,
    });
    if (!guardian) throw new ResourceNotFoundException("Guardian", id);
    return guardian;
  }

  async update(id: string, dto: Partial<CreateGuardianDto>) {
    const existing = await this.findOne(id);
    const { studentId, ...rest } = dto;
    if (studentId && studentId !== existing.studentId) {
      await this.assertStudentInTenant(studentId);
    }
    return this.prisma.scoped.guardian.update({
      where: { id },
      data: { ...rest } as Prisma.GuardianUpdateInput,
      include: this.include,
    });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.scoped.guardian.updateMany({
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

  private get include(): Prisma.GuardianInclude {
    return {
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          admissionNumber: true,
        },
      },
    };
  }
}
