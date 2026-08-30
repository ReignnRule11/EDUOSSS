import { ROLE_PRIORITY, Role } from "@eduos/shared";
import type { AuthPrincipal } from "@eduos/shared";
import { Injectable } from "@nestjs/common";
import { Prisma, UserStatus } from "@prisma/client";
import * as bcrypt from "bcryptjs";

import type { CreateUserDto } from "./dto/create-user.dto";
import type { QueryUsersDto } from "./dto/query-users.dto";
import type { UpdateUserDto } from "./dto/update-user.dto";
import { UsersRepository } from "./users.repository";
import {
  ConflictResourceException,
  ForbiddenOperationException,
  ResourceNotFoundException,
} from "../../common/exceptions/business.exceptions";
import {
  buildOrderBy,
  buildPaginationMeta,
  toPaginationArgs,
} from "../../common/utils/pagination.util";
import { PrismaService } from "../../database/prisma.service";
import { generateOpaqueToken } from "../auth/auth.utils";

@Injectable()
export class UsersService {
  constructor(
    private readonly repository: UsersRepository,
    private readonly prisma: PrismaService,
  ) {}

  async create(actor: AuthPrincipal, dto: CreateUserDto) {
    this.assertCanAssignRole(actor, dto.role);

    const existing = await this.repository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictResourceException(
        "A user with this email already exists in the tenant",
      );
    }

    const password = dto.password ?? this.generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await this.repository.create({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone ?? null,
      role: dto.role,
      status: (dto.status ?? UserStatus.ACTIVE) as UserStatus,
    } as Prisma.UserUncheckedCreateInput);

    // Grant the user a membership in this tenant so they can be resolved
    // by the tenant-switching flow.
    await this.prisma.scoped.userTenant.create({
      data: { userId: user.id, tenantId: user.tenantId, role: dto.role },
    });

    return { user, temporaryPassword: dto.password ? undefined : password };
  }

  async findAll(query: QueryUsersDto) {
    const pagination = toPaginationArgs(query);
    const orderBy = buildOrderBy(query, [
      "firstName",
      "lastName",
      "email",
      "role",
      "status",
      "createdAt",
    ]) as Prisma.UserOrderByWithRelationInput;

    const { items, totalItems } = await this.repository.findMany({
      pagination,
      orderBy,
      search: query.search,
      status: query.status,
      role: query.role,
      active: query.active,
    });

    return {
      items,
      meta: buildPaginationMeta(totalItems, pagination.page, pagination.limit),
    };
  }

  async findOne(id: string) {
    const user = await this.repository.findById(id);
    if (!user) {
      throw new ResourceNotFoundException("User", id);
    }
    return user;
  }

  async update(actor: AuthPrincipal, id: string, dto: UpdateUserDto) {
    await this.findOne(id);
    if (dto.role) {
      this.assertCanAssignRole(actor, dto.role);
    }
    const updated = await this.repository.update(id, {
      ...(dto.firstName ? { firstName: dto.firstName } : {}),
      ...(dto.lastName ? { lastName: dto.lastName } : {}),
      ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
      ...(dto.role ? { role: dto.role } : {}),
      ...(dto.status ? { status: dto.status } : {}),
      ...(dto.password
        ? { passwordHash: await bcrypt.hash(dto.password, 12) }
        : {}),
    });
    if (updated.count === 0) {
      throw new ResourceNotFoundException("User", id);
    }
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.repository.update(id, { status: UserStatus.INACTIVE });
  }

  /**
   * Clears a temporary account lockout (failed-login counter) and reactivates
   * a user whose status was set to LOCKED. Also revokes nothing - the user can
   * sign in immediately with a valid password.
   */
  async unlock(id: string): Promise<void> {
    await this.findOne(id);
    await this.repository.update(id, {
      status: UserStatus.ACTIVE,
      failedLoginCount: 0,
      lockedUntil: null,
    });
  }

  private assertCanAssignRole(actor: AuthPrincipal, targetRole: string): void {
    // Only a platform SUPER_ADMIN may create or assign the SUPER_ADMIN role.
    if (targetRole === Role.SUPER_ADMIN) {
      if (actor.role !== Role.SUPER_ADMIN) {
        throw new ForbiddenOperationException(
          "Only a platform Super Admin can assign the Super Admin role",
        );
      }
      return;
    }

    if (actor.role === Role.SUPER_ADMIN) return;

    // A TENANT_ADMIN manages tenant-level users/roles: it may assign any
    // role except SUPER_ADMIN, but never platform-level roles.
    if (actor.role === Role.TENANT_ADMIN) {
      return;
    }

    // Other roles may only assign strictly more junior roles.
    const actorPriority = ROLE_PRIORITY[actor.role as Role] ?? 100;
    const targetPriority = ROLE_PRIORITY[targetRole as Role] ?? 100;
    if (targetPriority <= actorPriority) {
      throw new ForbiddenOperationException(
        "You cannot create or assign a user with a role equal to or higher than your own",
      );
    }
  }

  private generateTemporaryPassword(): string {
    return `${generateOpaqueToken().slice(0, 12)}Aa1!`;
  }
}
