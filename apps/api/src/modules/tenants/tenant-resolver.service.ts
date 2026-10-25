import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Request } from "express";
import * as jwt from "jsonwebtoken";

import { PrismaService } from "../../database/prisma.service";
import { RedisService } from "../../database/redis.service";

export interface TenantResolution {
  id: string;
  slug: string;
  status: string;
  resolvedBy: "header" | "domain" | "subdomain" | "jwt";
}

export type TenantResolutionMode = "header" | "domain" | "subdomain";

const CACHE_PREFIX = "tenant:resolver:";
const CACHE_TTL = 300;
const SKIPPED_SUBDOMAINS = new Set([
  "www",
  "app",
  "api",
  "admin",
  "mail",
  "localhost",
  "eduos",
]);

@Injectable()
export class TenantResolverService {
  private readonly logger = new Logger(TenantResolverService.name);
  private readonly modes: Set<TenantResolutionMode>;
  private readonly platformApexDomains: string[];
  private readonly config: ConfigService;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    config: ConfigService,
  ) {
    this.config = config;
    const rawModes = (
      config.get<string>("tenantResolutionModes") ?? "header,domain,subdomain"
    )
      .split(",")
      .map((m) => m.trim()) as TenantResolutionMode[];
    this.modes = new Set(
      rawModes.filter((m) => ["header", "domain", "subdomain"].includes(m)),
    );
    this.platformApexDomains = (
      config.get<string>("platformApexDomains") ?? "monkeycode-ai.live"
    )
      .split(",")
      .map((d) => d.trim().toLowerCase())
      .filter(Boolean);
  }

  /** Resolves the tenant for a request using the configured mode priority. */
  async resolve(req: Request): Promise<TenantResolution | null> {
    if (this.modes.has("header")) {
      const headerValue = this.headerSlug(req);
      if (headerValue) {
        const tenant = await this.lookupByRef(headerValue);
        if (tenant) return { ...tenant, resolvedBy: "header" };

        // An explicit but unknown tenant header must not fall through to the
        // authenticated token's tenant. That would silently ignore a failed
        // tenant-selection claim and can conceal cross-tenant probing.
        return {
          id: "",
          slug: headerValue,
          status: "SUSPENDED",
          resolvedBy: "header",
        };
      }
    }

    const hostname = this.hostname(req);
    if (!hostname) return null;

    if (this.modes.has("domain")) {
      const tenant = await this.lookupByDomain(hostname);
      if (tenant) return { ...tenant, resolvedBy: "domain" };
    }

    if (this.modes.has("subdomain")) {
      const subdomain = this.extractSubdomain(hostname);
      if (subdomain) {
        const tenant = await this.lookupByRef(subdomain);
        if (tenant) return { ...tenant, resolvedBy: "subdomain" };
      }
    }

    // Final fallback: derive the tenant from a verified access token so
    // authenticated clients do not need to send the tenant header on every
    // request. The token's tenantId is only trusted after signature check.
    const fromToken = this.resolveFromToken(req);
    if (fromToken) return fromToken;

    return null;
  }

  private async resolveFromToken(
    req: Request,
  ): Promise<TenantResolution | null> {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) return null;
    const token = header.slice(7).trim();
    if (!token) return null;

    try {
      const payload = jwt.verify(
        token,
        this.config.getOrThrow<string>("jwt.accessSecret"),
      ) as { tenantId?: string } | null;
      if (payload?.tenantId) {
        // Always read the tenant's CURRENT status directly from the database.
        // Tenant status is security-critical: a cached (up to 300s) status must
        // never let a suspended/deactivated tenant keep authorizing requests.
        const tenant = await this.prisma.tenant.findFirst({
          where: { id: payload.tenantId, deletedAt: null },
          select: { id: true, slug: true, status: true },
        });
        if (tenant) {
          return {
            id: tenant.id,
            slug: tenant.slug,
            status: tenant.status,
            resolvedBy: "jwt",
          };
        }
        // Tenant no longer resolvable (deleted) — never grant access.
        return {
          id: payload.tenantId,
          slug: "",
          status: "SUSPENDED",
          resolvedBy: "jwt",
        };
      }
    } catch {
      // Token invalid/expired: leave resolution to the guards.
      return null;
    }
    return null;
  }

  private headerSlug(req: Request): string | null {
    const raw = req.headers["x-tenant-id"] ?? req.headers["x-tenant-slug"];
    if (typeof raw === "string" && raw.trim().length > 0) {
      return raw.trim();
    }
    return null;
  }

  private hostname(req: Request): string | null {
    const host = req.headers.host;
    if (!host) return null;
    const withoutPort = host.split(":")[0];
    return withoutPort ? withoutPort.toLowerCase() : null;
  }

  private isPlatformApex(hostname: string): boolean {
    return this.platformApexDomains.some(
      (apex) => hostname === apex || hostname.endsWith(`.${apex}`),
    );
  }

  private extractSubdomain(hostname: string): string | null {
    if (this.isPlatformApex(hostname)) {
      return null;
    }
    const labels = hostname.split(".");
    if (labels.length < 2) return null;
    const candidate = labels[0];
    if (!candidate || SKIPPED_SUBDOMAINS.has(candidate)) return null;
    return candidate;
  }

  private async lookupByRef(
    ref: string,
  ): Promise<Omit<TenantResolution, "resolvedBy"> | null> {
    const cacheKey = `${CACHE_PREFIX}ref:${ref}`;
    const cached =
      await this.redis.get<Omit<TenantResolution, "resolvedBy">>(cacheKey);
    if (cached) return cached;

    const tenant = await this.prisma.tenant.findFirst({
      where: { OR: [{ slug: ref }, { id: ref }], deletedAt: null },
      select: { id: true, slug: true, status: true },
    });
    if (!tenant) return null;

    const record = { id: tenant.id, slug: tenant.slug, status: tenant.status };
    await this.redis.set(cacheKey, record, CACHE_TTL);
    return record;
  }

  private async lookupByDomain(
    hostname: string,
  ): Promise<Omit<TenantResolution, "resolvedBy"> | null> {
    const cacheKey = `${CACHE_PREFIX}domain:${hostname}`;
    const cached =
      await this.redis.get<Omit<TenantResolution, "resolvedBy">>(cacheKey);
    if (cached) return cached;

    const candidates = [
      hostname,
      hostname.startsWith("www.") ? hostname.slice(4) : `www.${hostname}`,
    ];
    const domainRecord = await this.prisma.tenantDomain.findFirst({
      where: { domain: { in: candidates }, isVerified: true },
      select: { tenant: { select: { id: true, slug: true, status: true } } },
    });
    if (!domainRecord) return null;

    const record = {
      id: domainRecord.tenant.id,
      slug: domainRecord.tenant.slug,
      status: domainRecord.tenant.status,
    };
    await this.redis.set(cacheKey, record, CACHE_TTL);
    return record;
  }
}
