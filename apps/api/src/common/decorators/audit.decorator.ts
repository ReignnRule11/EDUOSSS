import type { AuditAction } from "@eduos/shared";
import { SetMetadata } from "@nestjs/common";

import {
  AUDIT_ACTION_KEY,
  AUDIT_RESOURCE_KEY,
  SKIP_AUDIT_KEY,
} from "../constants/decorator-keys.constant";

export interface AuditOptions {
  action: AuditAction;
  resource: string;
  /** Extracts the resource id from the request/response. Defaults to req.params.id. */
  resourceId?: (
    req: { params?: Record<string, string> },
    res: unknown,
  ) => string | null;
}

/**
 * Records an audit entry for the route via AuditInterceptor.
 */
export const Audited = (options: AuditOptions): MethodDecorator => {
  return (target, propertyKey, descriptor) => {
    SetMetadata(AUDIT_ACTION_KEY, options.action)(
      target,
      propertyKey,
      descriptor,
    );
    SetMetadata(AUDIT_RESOURCE_KEY, options.resource)(
      target,
      propertyKey,
      descriptor,
    );
    if (options.resourceId) {
      SetMetadata("auditResourceIdResolver", options.resourceId)(
        target,
        propertyKey,
        descriptor,
      );
    }
  };
};

/** Excludes a route from audit logging. */
export const SkipAudit = (): MethodDecorator => {
  return (target, propertyKey, descriptor) => {
    SetMetadata(SKIP_AUDIT_KEY, true)(target, propertyKey, descriptor);
  };
};
