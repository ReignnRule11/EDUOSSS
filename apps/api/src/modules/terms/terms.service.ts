import { Injectable } from "@nestjs/common";
import { Prisma, TermStatus } from "@prisma/client";

import type { CreateTermDto } from "./dto/create-term.dto";
import type { QueryTermsDto } from "./dto/query-terms.dto";
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
export class TermsService extends BaseRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(dto: CreateTermDto) {
    await this.assertSessionBelongsToTenant(dto.sessionId);
    const conflict = await this.prisma.scoped.academicTerm.findFirst({
      where: this.tenantWhere({
        sessionId: dto.sessionId,
        number: dto.number,
      }),
    });
    if (conflict) {
      throw new ConflictResourceException(
        `Term number ${dto.number} already exists in this session`,
      );
    }
    return this.prisma.scoped.academicTerm.create({
      data: { ...dto } as Prisma.AcademicTermUncheckedCreateInput,
      include: this.termInclude,
    });
  }

  async findAll(query: QueryTermsDto) {
    const pagination = toPaginationArgs(query);
    const where: Prisma.AcademicTermWhereInput = {
      deletedAt: null,
      ...(query.sessionId ? { sessionId: query.sessionId } : {}),
      ...(query.status ? { status: query.status as TermStatus } : {}),
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(query.currentOnly ? { isCurrent: true } : {}),
      ...(query.search
        ? { name: { contains: query.search, mode: "insensitive" } }
        : {}),
    };

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.scoped.academicTerm.findMany({
        where: this.tenantWhere(where),
        skip: pagination.skip,
        take: pagination.take,
        orderBy: buildOrderBy(query, [
          "name",
          "number",
          "status",
          "startDate",
          "endDate",
          "createdAt",
        ]) as Prisma.AcademicTermOrderByWithRelationInput,
        include: this.termInclude,
      }),
      this.prisma.scoped.academicTerm.count({
        where: this.tenantWhere(where),
      }),
    ]);

    return {
      items,
      meta: buildPaginationMeta(totalItems, pagination.page, pagination.limit),
    };
  }

  async findOne(id: string) {
    const term = await this.prisma.scoped.academicTerm.findFirst({
      where: this.tenantWhere({ id, deletedAt: null }),
      include: this.termInclude,
    });
    if (!term) {
      throw new ResourceNotFoundException("Term", id);
    }
    return term;
  }

  async update(id: string, dto: Partial<CreateTermDto>) {
    await this.findOne(id);
    if (dto.sessionId) {
      await this.assertSessionBelongsToTenant(dto.sessionId);
    }
    return this.prisma.scoped.academicTerm.update({
      where: { id },
      data: dto as Prisma.AcademicTermUpdateInput,
      include: this.termInclude,
    });
  }

  /** Marks one term as current within its session and demotes others. */
  async setCurrent(id: string) {
    const term = await this.findOne(id);
    await this.prisma.$transaction([
      this.prisma.scoped.academicTerm.updateMany({
        where: this.tenantWhere({
          sessionId: term.sessionId,
          isCurrent: true,
        }),
        data: { isCurrent: false },
      }),
      this.prisma.scoped.academicTerm.update({
        where: { id },
        data: { isCurrent: true, status: TermStatus.ACTIVE },
      }),
    ]);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.scoped.academicTerm.update({
      where: { id },
      data: { isActive: false, isCurrent: false, deletedAt: new Date() },
    });
  }

  private async assertSessionBelongsToTenant(sessionId: string): Promise<void> {
    const session = await this.prisma.scoped.academicSession.findFirst({
      where: this.tenantWhere({ id: sessionId, deletedAt: null }),
      select: { id: true },
    });
    if (!session) {
      throw new BadRequestOperationException(
        "The provided sessionId does not belong to this tenant",
      );
    }
  }

  private get termInclude(): Prisma.AcademicTermInclude {
    return {
      session: {
        select: { id: true, name: true, code: true, isCurrent: true },
      },
    };
  }
}
