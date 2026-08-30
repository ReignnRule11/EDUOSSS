import { Injectable } from "@nestjs/common";
import { Prisma, UserStatus } from "@prisma/client";

import { BaseRepository } from "../../common/repositories/base.repository";
import { PaginationArgs } from "../../common/utils/pagination.util";
import { PrismaService } from "../../database/prisma.service";

/** Tenant-scoped data-access layer for users. */
@Injectable()
export class UsersRepository extends BaseRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findMany(args: {
    pagination: PaginationArgs;
    orderBy: Prisma.UserOrderByWithRelationInput;
    search?: string;
    status?: UserStatus;
    role?: string;
    active?: boolean;
  }) {
    const where = this.buildWhere(args);
    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.scoped.user.findMany({
        where,
        skip: args.pagination.skip,
        take: args.pagination.take,
        orderBy: args.orderBy,
        select: this.publicSelect,
      }),
      this.prisma.scoped.user.count({ where }),
    ]);
    return { items, totalItems };
  }

  async findById(id: string) {
    return this.prisma.scoped.user.findFirst({
      where: this.tenantWhere({ id }),
      select: this.publicSelect,
    });
  }

  async findByEmail(email: string) {
    return this.prisma.scoped.user.findFirst({
      where: this.tenantWhere({ email: email.toLowerCase().trim() }),
    });
  }

  async create(data: Prisma.UserUncheckedCreateInput) {
    return this.prisma.scoped.user.create({
      data,
      select: this.publicSelect,
    });
  }

  async update(id: string, data: Prisma.UserUpdateInput) {
    return this.prisma.scoped.user.updateMany({
      where: this.tenantWhere({ id }),
      data,
    });
  }

  async count(where: Prisma.UserWhereInput = {}): Promise<number> {
    return this.prisma.scoped.user.count({ where: this.tenantWhere(where) });
  }

  private buildWhere(args: {
    search?: string;
    status?: UserStatus;
    role?: string;
    active?: boolean;
  }): Prisma.UserWhereInput {
    const conditions: Prisma.UserWhereInput[] = [];
    if (args.search) {
      conditions.push({
        OR: [
          { firstName: { contains: args.search, mode: "insensitive" } },
          { lastName: { contains: args.search, mode: "insensitive" } },
          { email: { contains: args.search, mode: "insensitive" } },
        ],
      });
    }
    if (args.status) conditions.push({ status: args.status });
    if (args.role) conditions.push({ role: args.role });
    if (args.active !== undefined) {
      conditions.push({
        status: args.active ? UserStatus.ACTIVE : { not: UserStatus.ACTIVE },
      });
    }

    return this.tenantWhere({
      AND: conditions.length > 0 ? conditions : undefined,
    });
  }

  private get publicSelect(): Prisma.UserSelect {
    return {
      id: true,
      tenantId: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      avatarUrl: true,
      role: true,
      status: true,
      mfaEnabled: true,
      emailVerifiedAt: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
    };
  }
}
