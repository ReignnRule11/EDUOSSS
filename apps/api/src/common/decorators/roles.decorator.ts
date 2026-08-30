import { SetMetadata } from "@nestjs/common";

import { ROLES_KEY } from "../constants/decorator-keys.constant";

/**
 * Restricts a route to one or more roles.
 * Evaluated by RolesGuard in addition to permission checks.
 */
export const Roles = (...roles: string[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles);
