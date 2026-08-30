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

    TenantContext.run(emptyStore, () => next());
  }
}
