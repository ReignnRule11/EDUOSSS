import type { AuthPrincipal } from "@eduos/shared";
import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { IS_PUBLIC_KEY, ROLES_KEY } from "../constants/decorator-keys.constant";
import { ForbiddenOperationException } from "../exceptions/business.exceptions";

/**
 * Enforces role restrictions declared via @Roles(...).
 * SUPER_ADMIN bypasses role checks. Public routes are skipped.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ user?: AuthPrincipal }>();
    const user = request.user;
    if (!user) {
      throw new ForbiddenOperationException();
    }
    if (user.role === "SUPER_ADMIN") {
      return true;
    }
    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenOperationException(
        "Your role does not allow this action",
      );
    }
    return true;
  }
}
