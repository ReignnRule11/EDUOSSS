import type { AuthPrincipal } from "@eduos/shared";
import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import {
  IS_PUBLIC_KEY,
  PERMISSIONS_KEY,
} from "../constants/decorator-keys.constant";
import { ForbiddenOperationException } from "../exceptions/business.exceptions";

/**
 * Enforces fine-grained permission checks declared via @Permissions(...).
 * The principal's permission list is embedded in the JWT at login time.
 * Public routes are skipped.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ user?: AuthPrincipal }>();
    const user = request.user;
    if (!user) {
      throw new ForbiddenOperationException();
    }

    const granted = new Set(user.permissions ?? []);
    const allowed = requiredPermissions.some((permission) =>
      granted.has(permission),
    );
    if (!allowed) {
      throw new ForbiddenOperationException("You lack the required permission");
    }
    return true;
  }
}
