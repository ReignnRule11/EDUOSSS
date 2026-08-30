import { AsyncLocalStorage } from "async_hooks";

export interface TenantContextStore {
  tenantId: string | null;
  tenantSlug: string | null;
  tenantStatus: string | null;
  resolvedBy: "header" | "domain" | "subdomain" | "jwt" | "none";
}

export class TenantContext {
  private static readonly storage = new AsyncLocalStorage<TenantContextStore>();

  static run<T>(store: TenantContextStore, fn: () => T): T {
    return this.storage.run(store, fn);
  }

  static getStore(): TenantContextStore | undefined {
    return this.storage.getStore();
  }

  static getTenantId(): string | null {
    return this.storage.getStore()?.tenantId ?? null;
  }

  static getTenantSlug(): string | null {
    return this.storage.getStore()?.tenantSlug ?? null;
  }

  static getTenantStatus(): string | null {
    return this.storage.getStore()?.tenantStatus ?? null;
  }

  /** Requires an active tenant context or throws. */
  static requireTenantId(): string {
    const tenantId = this.getTenantId();
    if (!tenantId) {
      throw new Error("Tenant context is not available");
    }
    return tenantId;
  }
}
