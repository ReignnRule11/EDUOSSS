import type { AuthPrincipal } from "@eduos/shared";
import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { IS_PUBLIC_KEY } from "../constants/decorator-keys.constant";
import { TenantContext } from "../context/tenant.context";
import {
  BadRequestOperationException,
  ForbiddenOperationException,
} from "../exceptions/business.exceptions";

/**
 * Enforces multi-tenant isolation:
 * 1. Public routes bypass tenant checks.
 * 2. A tenant must be resolvable (header/subdomain) or derivable from the token.
 * 3. The resolved tenant must be ACTIVE.
 * 4. An authenticated principal's tenantId must match the resolved tenant
 *    (prevents cross-tenant access even with a valid token).
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ user?: AuthPrincipal }>();
    const user = request.user;

    const store = TenantContext.getStore();
    let tenantId = store?.tenantId ?? null;

    if (!tenantId && user?.tenantId) {
      tenantId = user.tenantId;
    }

    if (!tenantId) {
      throw new BadRequestOperationException(
        "Tenant could not be resolved. Provide the X-Tenant-Id header.",
      );
    }

    if (store?.tenantStatus && store.tenantStatus !== "ACTIVE") {
      throw new ForbiddenOperationException(
        "This tenant account is not active",
      );
    }

    if (user && user.tenantId !== tenantId) {
      throw new ForbiddenOperationException("Tenant isolation violation");
    }

    return true;
  }
}
