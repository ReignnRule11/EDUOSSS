import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import type { QueryAuditLogsDto } from "./dto/query-audit-logs.dto";
import {
  buildOrderBy,
  buildPaginationMeta,
  toPaginationArgs,
} from "../../common/utils/pagination.util";
import { PrismaService } from "../../database/prisma.service";

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryAuditLogsDto) {
    const pagination = toPaginationArgs(query);
    const conditions: Prisma.AuditLogWhereInput[] = [];

    if (query.actorId) conditions.push({ actorId: query.actorId });
    if (query.resource) conditions.push({ resource: query.resource });
    if (query.action) conditions.push({ action: query.action });
    if (query.from)
      conditions.push({ createdAt: { gte: new Date(query.from) } });
    if (query.to) conditions.push({ createdAt: { lte: new Date(query.to) } });
    if (query.search) {
      conditions.push({
        OR: [
          { actorEmail: { contains: query.search, mode: "insensitive" } },
          { resource: { contains: query.search, mode: "insensitive" } },
        ],
      });
    }

    const where: Prisma.AuditLogWhereInput = {
      AND: conditions.length > 0 ? conditions : undefined,
    };
    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.scoped.auditLog.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: buildOrderBy(query, [
          "createdAt",
          "action",
          "resource",
        ]) as Prisma.AuditLogOrderByWithRelationInput,
      }),
      this.prisma.scoped.auditLog.count({ where }),
    ]);

    return {
      items,
      meta: buildPaginationMeta(totalItems, pagination.page, pagination.limit),
    };
  }
}
