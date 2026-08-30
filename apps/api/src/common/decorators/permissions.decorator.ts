import { SetMetadata } from "@nestjs/common";

import { PERMISSIONS_KEY } from "../constants/decorator-keys.constant";

/**
 * Restricts a route to authenticated principals holding at least one
 * of the provided permissions. Evaluated by PermissionsGuard.
 */
export const Permissions = (
  ...permissions: string[]
): MethodDecorator & ClassDecorator =>
  SetMetadata(PERMISSIONS_KEY, permissions);
