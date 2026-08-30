import { Injectable } from "@nestjs/common";
import { Prisma, type SchoolType } from "@prisma/client";

import type { CreateSchoolDto } from "./dto/create-school.dto";
import type { QuerySchoolsDto } from "./dto/query-schools.dto";
import {
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
export class SchoolsService extends BaseRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(dto: CreateSchoolDto) {
    const conflict = await this.prisma.scoped.school.findFirst({
      where: this.tenantWhere({ code: dto.code }),
    });
    if (conflict) {
      throw new ConflictResourceException(
        `A school with code "${dto.code}" already exists`,
      );
    }
    return this.prisma.scoped.school.create({
      data: { ...dto } as Prisma.SchoolUncheckedCreateInput,
    });
  }

  async findAll(query: QuerySchoolsDto) {
    const pagination = toPaginationArgs(query);
    const where: Prisma.SchoolWhereInput = {
      ...(query.type ? { type: query.type as SchoolType } : {}),
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: "insensitive" } },
              { code: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.scoped.school.findMany({
        where: this.tenantWhere(where),
        skip: pagination.skip,
        take: pagination.take,
        orderBy: buildOrderBy(query, [
          "name",
          "code",
          "type",
          "createdAt",
          "updatedAt",
        ]) as Prisma.SchoolOrderByWithRelationInput,
        include: {
          _count: { select: { students: true, teachers: true, classes: true } },
        },
      }),
      this.prisma.scoped.school.count({ where: this.tenantWhere(where) }),
    ]);

    return {
      items,
      meta: buildPaginationMeta(totalItems, pagination.page, pagination.limit),
    };
  }

  async findOne(id: string) {
    const school = await this.prisma.scoped.school.findFirst({
      where: this.tenantWhere({ id }),
      include: {
        _count: { select: { students: true, teachers: true, classes: true } },
      },
    });
    if (!school) {
      throw new ResourceNotFoundException("School", id);
    }
    return school;
  }

  async update(id: string, dto: Partial<CreateSchoolDto>) {
    await this.findOne(id);
    if (dto.code) {
      const conflict = await this.prisma.scoped.school.findFirst({
        where: this.tenantWhere({ code: dto.code, id: { not: id } }),
      });
      if (conflict) {
        throw new ConflictResourceException(
          `A school with code "${dto.code}" already exists`,
        );
      }
    }
    return this.prisma.scoped.school.update({
      where: { id },
      data: dto as Prisma.SchoolUpdateInput,
    });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.scoped.school.update({
      where: { id },
      data: { isActive: false, deletedAt: new Date() },
    });
  }
}
