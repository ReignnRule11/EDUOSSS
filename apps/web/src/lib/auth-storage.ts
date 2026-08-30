import type { AuthPrincipal } from "@eduos/shared";

export interface TenantSummary {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  plan: string;
  status: string;
  role?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatarUrl: string | null;
  role: string;
  status: string;
  tenantId: string;
  mfaEnabled: boolean;
  emailVerifiedAt: string | null;
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: number;
  user: AuthUser;
  availableTenants: TenantSummary[];
}

export interface MfaChallenge {
  requiresMfa: true;
  mfaToken: string;
  mfaExpiresAt: number;
}

export type LoginResponse = LoginResult | MfaChallenge;

const KEYS = {
  accessToken: "eduos.accessToken",
  refreshToken: "eduos.refreshToken",
  user: "eduos.user",
  tenants: "eduos.availableTenants",
  activeTenant: "eduos.activeTenant",
} as const;

function read<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function remove(key: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(key);
}

export const authStorage = {
  getAccessToken(): string | null {
    return read<string>(KEYS.accessToken);
  },
  getRefreshToken(): string | null {
    return read<string>(KEYS.refreshToken);
  },
  getUser(): AuthUser | null {
    return read<AuthUser>(KEYS.user);
  },
  getAvailableTenants(): TenantSummary[] {
    return read<TenantSummary[]>(KEYS.tenants) ?? [];
  },
  getActiveTenant(): TenantSummary | null {
    return read<TenantSummary>(KEYS.activeTenant);
  },
  setSession(result: LoginResult): void {
    write(KEYS.accessToken, result.accessToken);
    write(KEYS.refreshToken, result.refreshToken);
    write(KEYS.user, result.user);
    write(KEYS.tenants, result.availableTenants);
    const current = read<TenantSummary>(KEYS.activeTenant);
    if (!current) {
      const fallback =
        result.availableTenants.find((t) => t.slug === result.user.tenantId) ??
        result.availableTenants[0];
      if (fallback) write(KEYS.activeTenant, fallback);
    }
  },
  setAccessToken(token: string): void {
    write(KEYS.accessToken, token);
  },
  setActiveTenant(tenant: TenantSummary): void {
    write(KEYS.activeTenant, tenant);
  },
  clear(): void {
    remove(KEYS.accessToken);
    remove(KEYS.refreshToken);
    remove(KEYS.user);
    remove(KEYS.tenants);
    remove(KEYS.activeTenant);
  },
};

// Re-export helpers consumed by the api client.
export const getAccessToken = authStorage.getAccessToken;
export const getActiveTenant = authStorage.getActiveTenant;

export type { AuthPrincipal };
