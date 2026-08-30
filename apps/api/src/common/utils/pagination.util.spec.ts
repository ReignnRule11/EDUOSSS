import {
  buildOrderBy,
  buildPaginationMeta,
  toPaginationArgs,
} from "./pagination.util";
import type { PaginationQueryDto } from "../dto/pagination-query.dto";

function q(overrides: Partial<PaginationQueryDto> = {}): PaginationQueryDto {
  return {
    page: 1,
    limit: 20,
    search: undefined,
    sortBy: "createdAt",
    sortOrder: "desc",
    ...overrides,
  };
}

describe("toPaginationArgs", () => {
  it("uses defaults when no query params are provided", () => {
    expect(toPaginationArgs(q())).toEqual({
      skip: 0,
      take: 20,
      page: 1,
      limit: 20,
    });
  });

  it("computes skip/take from page and limit", () => {
    expect(toPaginationArgs(q({ page: 3, limit: 10 }))).toEqual({
      skip: 20,
      take: 10,
      page: 3,
      limit: 10,
    });
  });

  it("forwards page/limit values as provided (DTO validation enforces minimums)", () => {
    const args = toPaginationArgs(
      q({ page: 2, limit: 5 } as unknown as Partial<PaginationQueryDto>),
    );
    expect(args.skip).toBe(5);
    expect(args.take).toBe(5);
  });
});

describe("buildOrderBy", () => {
  it("falls back to createdAt desc when the field is not allowed", () => {
    expect(buildOrderBy(q({ sortBy: "id" }), ["name", "createdAt"])).toEqual({
      createdAt: "desc",
    });
  });

  it("honours allowed fields and sort direction", () => {
    expect(
      buildOrderBy(q({ sortBy: "name", sortOrder: "asc" }), ["name"]),
    ).toEqual({
      name: "asc",
    });
  });

  it("defaults sortOrder to desc", () => {
    expect(buildOrderBy(q({ sortBy: "name" }), ["name"])).toEqual({
      name: "desc",
    });
  });
});

describe("buildPaginationMeta", () => {
  it("builds correct pagination metadata", () => {
    expect(buildPaginationMeta(95, 2, 20)).toEqual({
      page: 2,
      limit: 20,
      totalItems: 95,
      totalPages: 5,
      hasNextPage: true,
      hasPreviousPage: true,
    });
  });

  it("returns zero pages for an empty result set", () => {
    expect(buildPaginationMeta(0, 1, 20).totalPages).toBe(0);
  });

  it("handles the last page edge case", () => {
    const meta = buildPaginationMeta(40, 2, 20);
    expect(meta.totalPages).toBe(2);
    expect(meta.hasNextPage).toBe(false);
  });
});
