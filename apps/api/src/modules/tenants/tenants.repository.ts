import { Injectable } from "@nestjs/common";
import { Prisma, TenantStatus } from "@prisma/client";

import { ConflictResourceException } from "../../common/exceptions/business.exceptions";
import { PrismaService } from "../../database/prisma.service";

/**
 * Data-access layer for the global Tenant catalog and tenant onboarding.
 * Deliberately NOT tenant-scoped: tenants are the isolation boundary itself
 * and are managed by platform super-admins / the public onboarding flow.
 */
@Injectable()
export class TenantsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.TenantCreateInput) {
    return this.prisma.tenant.create({ data });
  }

  findById(id: string) {
    return this.prisma.tenant.findUnique({ where: { id } });
  }

  findBySlug(slug: string) {
    return this.prisma.tenant.findFirst({
      where: { slug, deletedAt: null },
      include: this.detailInclude,
    });
  }

  findByRef(ref: string) {
    return this.prisma.tenant.findFirst({
      where: { OR: [{ slug: ref }, { id: ref }], deletedAt: null },
      include: this.detailInclude,
    });
  }

  findAll(
    args: Prisma.TenantFindManyArgs & { where?: Prisma.TenantWhereInput },
  ) {
    return this.prisma.tenant.findMany({
      ...args,
      include: this.detailInclude,
    });
  }

  count(where: Prisma.TenantWhereInput = {}) {
    return this.prisma.tenant.count({ where });
  }

  update(id: string, data: Prisma.TenantUpdateInput) {
    return this.prisma.tenant.update({ where: { id }, data });
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.tenant.update({
      where: { id },
      data: { deletedAt: new Date(), status: TenantStatus.SUSPENDED },
    });
  }

  /** Storage usage across all tenant-scoped file records. */
  async storageUsage(
    tenantId: string,
  ): Promise<{ used: bigint; quota: bigint }> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { storageUsed: true, storageQuota: true },
    });
    if (!tenant)
      throw new ConflictResourceException(`Tenant ${tenantId} not found`);
    return { used: tenant.storageUsed, quota: tenant.storageQuota };
  }

  addDomain(tenantId: string, domain: string, isPrimary: boolean) {
    return this.prisma.tenantDomain.create({
      data: { tenantId, domain, isPrimary },
    });
  }

  listDomains(tenantId: string) {
    return this.prisma.tenantDomain.findMany({
      where: { tenantId },
      orderBy: { createdAt: "asc" },
    });
  }

  findDomain(domain: string) {
    return this.prisma.tenantDomain.findUnique({ where: { domain } });
  }

  verifyDomain(id: string) {
    return this.prisma.tenantDomain.update({
      where: { id },
      data: { isVerified: true, verifiedAt: new Date() },
    });
  }

  removeDomain(id: string): Promise<Prisma.BatchPayload> {
    return this.prisma.tenantDomain.deleteMany({ where: { id } });
  }

  // ---- Memberships (multi-tenant switching) ----

  createMembership(userId: string, tenantId: string, role: string) {
    return this.prisma.userTenant.create({
      data: { userId, tenantId, role },
    });
  }

  findMembership(userId: string, tenantId: string) {
    return this.prisma.userTenant.findUnique({
      where: { userId_tenantId: { userId, tenantId } },
    });
  }

  listMembershipsForUser(userId: string) {
    return this.prisma.userTenant.findMany({
      where: { userId, status: "ACTIVE" },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            status: true,
          },
        },
      },
    });
  }

  private get detailInclude(): Prisma.TenantInclude {
    return {
      _count: {
        select: {
          users: true,
          schools: true,
          students: true,
          teachers: true,
          files: true,
        },
      },
      domains: {
        select: { id: true, domain: true, isVerified: true, isPrimary: true },
      },
    };
  }
}
