import { TenantContext } from "../context/tenant.context";

/**
 * Base repository enforcing tenant isolation at the data-access layer.
 * Every query helper automatically merges the current tenantId from the
 * AsyncLocalStorage context, so callers cannot accidentally leak data
 * across tenants.
 */
export abstract class BaseRepository {
  /** The current request tenantId (throws when unavailable). */
  protected tenantId(): string {
    return TenantContext.requireTenantId();
  }

  /** Combines caller `where` with the mandatory tenant filter. */
  protected tenantWhere<T extends Record<string, unknown>>(
    where: T = {} as T,
  ): T & { tenantId: string } {
    return { ...where, tenantId: this.tenantId() };
  }

  /** Guards create payloads so tenantId can never be supplied by callers. */
  protected withTenant<T extends Record<string, unknown>>(
    data: T,
  ): T & { tenantId: string } {
    return { ...data, tenantId: this.tenantId() };
  }
}
