import type { PaginationMetaDto } from "../dto/pagination-meta.dto";
import type { PaginationQueryDto } from "../dto/pagination-query.dto";

export interface PaginationArgs {
  skip: number;
  take: number;
  page: number;
  limit: number;
}

export function toPaginationArgs(query: PaginationQueryDto): PaginationArgs {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  return {
    skip: (page - 1) * limit,
    take: limit,
    page,
    limit,
  };
}

export type PrismaOrderBy = Record<string, "asc" | "desc">;

/**
 * Builds a Prisma orderBy clause, guarding against arbitrary sort fields.
 * Sort fields not present in `allowedFields` are silently ignored.
 */
export function buildOrderBy(
  query: PaginationQueryDto,
  allowedFields: string[],
): PrismaOrderBy {
  const field = query.sortBy ?? "createdAt";
  if (!allowedFields.includes(field)) {
    return { createdAt: "desc" };
  }
  return { [field]: query.sortOrder ?? "desc" };
}

export function buildPaginationMeta(
  totalItems: number,
  page: number,
  limit: number,
): PaginationMetaDto {
  const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / limit);
  return {
    page,
    limit,
    totalItems,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}
