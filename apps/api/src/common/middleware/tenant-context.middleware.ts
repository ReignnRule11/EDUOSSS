import { randomUUID } from "crypto";

import { Injectable, Logger, type NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";

import { TenantResolverService } from "../../modules/tenants/tenant-resolver.service";
import {
  TenantContext,
  type TenantContextStore,
} from "../context/tenant.context";

/**
 * 1. Assigns a requestId and records the request start time.
 * 2. Resolves the tenant via header, custom domain or subdomain
 *    (see TenantResolverService) and exposes it through AsyncLocalStorage
 *    so repositories and guards can enforce tenant isolation.
 */
@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantContextMiddleware.name);

  constructor(private readonly resolver: TenantResolverService) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    (req as Request & { requestId: string; startedAt: number }).requestId =
      randomUUID();
    (req as Request & { startedAt: number }).startedAt = Date.now();

    const emptyStore: TenantContextStore = {
      tenantId: null,
      tenantSlug: null,
      tenantStatus: null,
      resolvedBy: "none",
    };

    const rawTenantHeader =
      req.headers["x-tenant-id"] ?? req.headers["x-tenant-slug"];
    const requestedTenantHeader =
      typeof rawTenantHeader === "string" && rawTenantHeader.trim().length > 0
        ? rawTenantHeader.trim()
        : null;

    try {
      const resolution = await this.resolver.resolve(req);
      if (resolution) {
        TenantContext.run(
          {
            tenantId: resolution.id,
            tenantSlug: resolution.slug,
            tenantStatus: resolution.status,
            resolvedBy: resolution.resolvedBy,
          },
          () => next(),
        );
        return;
      }
    } catch (error) {
      this.logger.warn(`Tenant resolution failed: ${(error as Error).message}`);
    }

    // An explicitly supplied tenant is an authorization claim. Never silently
    // fall back to the JWT tenant when that claim cannot be resolved (including
    // resolver/cache failures); protected routes must fail closed in TenantGuard.
    if (requestedTenantHeader) {
      TenantContext.run(
        {
          tenantId: null,
          tenantSlug: requestedTenantHeader,
          tenantStatus: "INVALID",
          resolvedBy: "header",
        },
        () => next(),
      );
      return;
    }

    TenantContext.run(emptyStore, () => next());
  }
}
