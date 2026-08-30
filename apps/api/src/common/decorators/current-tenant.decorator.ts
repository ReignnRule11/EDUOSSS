import { createParamDecorator, type ExecutionContext } from "@nestjs/common";

import { TenantContext } from "../context/tenant.context";

/** Injects the resolved tenantId (or slug) into a handler parameter. */
export const CurrentTenant = createParamDecorator(
  (data: "id" | "slug" | undefined, _ctx: ExecutionContext): string | null => {
    if (data === "slug") return TenantContext.getTenantSlug();
    return TenantContext.getTenantId();
  },
);
