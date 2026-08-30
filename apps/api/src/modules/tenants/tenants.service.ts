import { Role } from "@eduos/shared";
import { Injectable, Logger } from "@nestjs/common";
import { Prisma, TenantStatus } from "@prisma/client";
import * as bcrypt from "bcryptjs";

import type { CreateTenantDto } from "./dto/create-tenant.dto";
import type { OnboardTenantDto } from "./dto/onboard-tenant.dto";
import type { QueryTenantsDto } from "./dto/query-tenants.dto";
import type {
  AddTenantDomainDto,
  UpdateBrandingDto,
  UpdateModulesDto,
  UpdateStorageQuotaDto,
  UpdateSubscriptionDto,
} from "./dto/tenant-admin.dto";
import type { UpdateTenantDto } from "./dto/update-tenant.dto";
import { TenantsRepository } from "./tenants.repository";
import {
  BadRequestOperationException,
  ConflictResourceException,
  ResourceNotFoundException,
} from "../../common/exceptions/business.exceptions";
import {
  buildOrderBy,
  buildPaginationMeta,
  toPaginationArgs,
} from "../../common/utils/pagination.util";
import { PrismaService } from "../../database/prisma.service";
import { RedisService } from "../../database/redis.service";

const RESOLVER_CACHE_PREFIX = "tenant:resolver:";

@Injectable()
export class TenantsService {
  private readonly logger = new Logger(TenantsService.name);

  constructor(
    private readonly repository: TenantsRepository,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  // ---------------------------------------------------------------
  // Platform catalog (super admin)
  // ---------------------------------------------------------------

  async create(dto: CreateTenantDto) {
    const existing = await this.repository.findBySlug(dto.slug);
    if (existing) {
      throw new ConflictResourceException(
        `Tenant slug "${dto.slug}" is already taken`,
      );
    }
    return this.repository.create({
      name: dto.name,
      slug: dto.slug,
      status: dto.status,
      settings: (dto.settings ?? {}) as Prisma.InputJsonValue,
    });
  }

  async findAll(query: QueryTenantsDto) {
    const pagination = toPaginationArgs(query);
    const where: Prisma.TenantWhereInput = {
      deletedAt: null,
      ...(query.status ? { status: query.status as TenantStatus } : {}),
      ...(query.name
        ? { name: { contains: query.name, mode: "insensitive" } }
        : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: "insensitive" } },
              { slug: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const orderBy = buildOrderBy(query, [
      "name",
      "slug",
      "status",
      "createdAt",
      "updatedAt",
    ]) as Prisma.TenantOrderByWithRelationInput;
    const [items, totalItems] = await Promise.all([
      this.repository.findAll({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy,
      }),
      this.repository.count(where),
    ]);

    return {
      items,
      meta: buildPaginationMeta(totalItems, pagination.page, pagination.limit),
    };
  }

  async findOne(id: string) {
    const tenant = await this.repository.findById(id);
    if (!tenant || tenant.deletedAt) {
      throw new ResourceNotFoundException("Tenant", id);
    }
    return tenant;
  }

  async update(id: string, dto: UpdateTenantDto) {
    await this.findOne(id);
    if (dto.slug) {
      const conflict = await this.repository.findBySlug(dto.slug);
      if (conflict && conflict.id !== id) {
        throw new ConflictResourceException(
          `Tenant slug "${dto.slug}" is already taken`,
        );
      }
    }
    const updated = await this.repository.update(id, {
      ...(dto.name ? { name: dto.name } : {}),
      ...(dto.slug ? { slug: dto.slug } : {}),
      ...(dto.status ? { status: dto.status } : {}),
      ...(dto.settings !== undefined
        ? { settings: dto.settings as Prisma.InputJsonValue }
        : {}),
    });
    await this.invalidateResolverCache(id, updated.slug);
    return updated;
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.repository.softDelete(id);
    await this.invalidateResolverCache(id);
  }

  // ---------------------------------------------------------------
  // Onboarding (public)
  // ---------------------------------------------------------------

  /**
   * Atomically provisions a new school tenant: tenant + admin user +
   * default school + admin membership + optional custom domain.
   */
  async onboard(dto: OnboardTenantDto) {
    const existing = await this.repository.findBySlug(dto.slug);
    if (existing) {
      throw new ConflictResourceException(
        `Tenant slug "${dto.slug}" is already taken`,
      );
    }

    const schoolCode = this.deriveSchoolCode(dto.slug);

    const result = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: dto.name,
          slug: dto.slug,
          status: TenantStatus.ACTIVE,
          plan: dto.plan ?? "FREE",
          subscriptionStatus: "TRIAL",
          enabledModules: ["academics", "attendance", "grades", "finance"],
          branding: { theme: "default" },
          settings: { academicYear: new Date().getFullYear().toString() },
        },
      });

      const passwordHash = await bcrypt.hash(dto.adminPassword, 12);
      const admin = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: dto.adminEmail.toLowerCase().trim(),
          passwordHash,
          firstName: dto.adminFirstName,
          lastName: dto.adminLastName,
          role: Role.TENANT_ADMIN,
          status: "ACTIVE",
        },
      });

      await tx.userTenant.create({
        data: {
          userId: admin.id,
          tenantId: tenant.id,
          role: Role.TENANT_ADMIN,
        },
      });

      const school = await tx.school.create({
        data: {
          tenantId: tenant.id,
          name: dto.schoolName ?? dto.name,
          code: schoolCode,
          type: "K_12",
          academicYear: new Date().getFullYear().toString(),
        },
      });

      let domainId: string | null = null;
      if (dto.customDomain) {
        const domain = await tx.tenantDomain.create({
          data: {
            tenantId: tenant.id,
            domain: dto.customDomain.toLowerCase(),
            isPrimary: true,
          },
        });
        domainId = domain.id;
      }

      await tx.auditLog.create({
        data: {
          tenantId: tenant.id,
          actorId: admin.id,
          actorEmail: admin.email,
          role: admin.role,
          action: "CREATE",
          resource: "tenant.onboarding",
          metadata: { schoolCode },
        },
      });

      return { tenant, admin, school, domainId };
    });

    this.logger.log(
      `Tenant onboarded: ${result.tenant.slug} (${result.tenant.id})`,
    );
    return {
      tenant: {
        id: result.tenant.id,
        name: result.tenant.name,
        slug: result.tenant.slug,
        status: result.tenant.status,
        plan: result.tenant.plan,
      },
      school: {
        id: result.school.id,
        name: result.school.name,
        code: result.school.code,
      },
      domainId: result.domainId,
    };
  }

  // ---------------------------------------------------------------
  // Tenant self-service (current tenant from context)
  // ---------------------------------------------------------------

  async getSettings(tenantId: string) {
    const tenant = await this.repository.findById(tenantId);
    if (!tenant) throw new ResourceNotFoundException("Tenant", tenantId);
    return tenant;
  }

  async updateBranding(tenantId: string, dto: UpdateBrandingDto) {
    await this.findOne(tenantId);
    return this.repository.update(tenantId, {
      ...(dto.logoUrl !== undefined ? { logoUrl: dto.logoUrl } : {}),
      ...(dto.branding !== undefined
        ? { branding: dto.branding as Prisma.InputJsonValue }
        : {}),
    });
  }

  async updateSubscription(tenantId: string, dto: UpdateSubscriptionDto) {
    await this.findOne(tenantId);
    const updated = await this.repository.update(tenantId, {
      ...(dto.plan ? { plan: dto.plan } : {}),
      ...(dto.subscriptionStatus
        ? { subscriptionStatus: dto.subscriptionStatus }
        : {}),
      ...(dto.subscriptionExpiresAt
        ? { subscriptionExpiresAt: dto.subscriptionExpiresAt }
        : {}),
      ...(dto.seats ? { seats: dto.seats } : {}),
    });
    await this.invalidateResolverCache(tenantId, updated.slug);
    return updated;
  }

  async updateModules(tenantId: string, dto: UpdateModulesDto) {
    await this.findOne(tenantId);
    return this.repository.update(tenantId, {
      enabledModules: dto.enabledModules,
    });
  }

  async getUsage(tenantId: string) {
    const usage = await this.repository.storageUsage(tenantId);
    const fileCount = await this.prisma.storedFile.count({
      where: { tenantId },
    });
    const seatCount = await this.prisma.user.count({
      where: { tenantId, status: "ACTIVE" },
    });
    return {
      storage: {
        usedBytes: usage.used.toString(),
        quotaBytes: usage.quota.toString(),
        usedGiB: this.toGiB(usage.used),
        quotaGiB: this.toGiB(usage.quota),
        usedPercent:
          usage.quota > 0
            ? Number((Number(usage.used) / Number(usage.quota)) * 100)
            : 0,
      },
      files: fileCount,
      activeSeats: seatCount,
    };
  }

  async updateStorageQuota(tenantId: string, dto: UpdateStorageQuotaDto) {
    await this.findOne(tenantId);
    return this.repository.update(tenantId, {
      storageQuota: BigInt(dto.storageQuota),
    });
  }

  async addDomain(tenantId: string, dto: AddTenantDomainDto) {
    await this.findOne(tenantId);
    const normalized = dto.domain.toLowerCase().replace(/^https?:\/\//, "");
    const conflict = await this.repository.findDomain(normalized);
    if (conflict) {
      throw new ConflictResourceException(
        `Domain "${normalized}" is already in use`,
      );
    }
    const domain = await this.repository.addDomain(
      tenantId,
      normalized,
      dto.isPrimary ?? false,
    );
    await this.redis.delete(`${RESOLVER_CACHE_PREFIX}domain:${normalized}`);
    return domain;
  }

  async listDomains(tenantId: string) {
    await this.findOne(tenantId);
    return this.repository.listDomains(tenantId);
  }

  async verifyDomain(tenantId: string, domainId: string) {
    await this.findOne(tenantId);
    const domain = await this.repository.listDomains(tenantId);
    const record = domain.find((d) => d.id === domainId);
    if (!record) {
      throw new ResourceNotFoundException("TenantDomain", domainId);
    }
    const updated = await this.repository.verifyDomain(domainId);
    await this.redis.delete(`${RESOLVER_CACHE_PREFIX}domain:${record.domain}`);
    return updated;
  }

  async removeDomain(tenantId: string, domainId: string): Promise<void> {
    await this.findOne(tenantId);
    const domain = await this.repository.listDomains(tenantId);
    const record = domain.find((d) => d.id === domainId);
    if (!record) {
      throw new ResourceNotFoundException("TenantDomain", domainId);
    }
    await this.repository.removeDomain(domainId);
    await this.redis.delete(`${RESOLVER_CACHE_PREFIX}domain:${record.domain}`);
  }

  // ---------------------------------------------------------------

  private deriveSchoolCode(slug: string): string {
    const code = slug
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 6)
      .toUpperCase();
    if (code.length < 3) {
      throw new BadRequestOperationException(
        "Slug is too short to derive a school code",
      );
    }
    return code;
  }

  private toGiB(bytes: bigint): number {
    return Number(bytes) / 1073741824;
  }

  private async invalidateResolverCache(
    id: string,
    slug?: string,
  ): Promise<void> {
    // Purge every resolver cache key that could reference this tenant so a
    // status change (e.g. suspension) is enforced immediately, regardless of
    // which resolution mode (header ref, domain, subdomain) was used.
    const keys = [`${RESOLVER_CACHE_PREFIX}ref:${id}`];
    if (slug) keys.push(`${RESOLVER_CACHE_PREFIX}ref:${slug}`);
    await Promise.all(keys.map((key) => this.redis.delete(key)));
    // Domain/subdomain lookups cache by hostname; clear those too so a
    // suspended tenant is not reachable via a cached domain lookup.
    await this.redis.deleteByPattern(`${RESOLVER_CACHE_PREFIX}domain:*`);
  }
}
