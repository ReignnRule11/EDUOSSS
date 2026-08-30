"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { api } from "./api";
import {
  authStorage,
  type AuthUser,
  type LoginResponse,
  type LoginResult,
  type TenantSummary,
} from "./auth-storage";

interface LoginCredentials {
  email: string;
  password: string;
  tenantSlug: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  tenants: TenantSummary[];
  activeTenant: TenantSummary | null;
  loading: boolean;
  login: (credentials: LoginCredentials) => Promise<LoginResponse>;
  verifyMfaLogin: (mfaToken: string, code: string) => Promise<void>;
  logout: () => void;
  switchTenant: (tenantRef: string) => Promise<void>;
  setActiveTenant: (tenant: TenantSummary) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [tenants, setTenants] = useState<TenantSummary[]>([]);
  const [activeTenant, setActiveTenantState] = useState<TenantSummary | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUser(authStorage.getUser());
    setTenants(authStorage.getAvailableTenants());
    setActiveTenantState(authStorage.getActiveTenant());
    setLoading(false);
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      authStorage.clear();
      setUser(null);
      setTenants([]);
      setActiveTenantState(null);
      router.push("/login");
    };
    window.addEventListener("eduos:unauthorized", handleUnauthorized);
    return () =>
      window.removeEventListener("eduos:unauthorized", handleUnauthorized);
  }, [router]);

  const login = useCallback(
    async ({ email, password, tenantSlug }: LoginCredentials) => {
      const { data } = await api.post<LoginResponse>(
        "/auth/login",
        {
          email,
          password,
          tenantSlug,
        },
        { skipTenantHeader: true },
      );

      if ("requiresMfa" in data && data.requiresMfa) {
        return data;
      }

      authStorage.setSession(data as LoginResult);
      setUser((data as LoginResult).user);
      setTenants((data as LoginResult).availableTenants);
      setActiveTenantState(authStorage.getActiveTenant());
      router.push("/dashboard");
      return data;
    },
    [router],
  );

  const verifyMfaLogin = useCallback(
    async (mfaToken: string, code: string) => {
      const { data } = await api.post<LoginResult>("/auth/mfa/verify-login", {
        mfaToken,
        code,
      });
      authStorage.setSession(data);
      setUser(data.user);
      setTenants(data.availableTenants);
      setActiveTenantState(authStorage.getActiveTenant());
      router.push("/dashboard");
    },
    [router],
  );

  const logout = useCallback(() => {
    authStorage.clear();
    setUser(null);
    setTenants([]);
    setActiveTenantState(null);
    router.push("/login");
  }, [router]);

  const switchTenant = useCallback(
    async (tenantRef: string) => {
      const { data: result } = await api.post<{
        accessToken: string;
        user: AuthUser;
        availableTenants: TenantSummary[];
      }>("/auth/switch-tenant", { tenantRef });
      authStorage.setAccessToken(result.accessToken);
      const target = result.availableTenants.find(
        (t) => t.slug === tenantRef || t.id === tenantRef,
      );
      if (target) {
        authStorage.setActiveTenant(target);
        setActiveTenantState(target);
      }
      setUser(result.user);
      setTenants(result.availableTenants);
      router.refresh();
    },
    [router],
  );

  const setActiveTenant = useCallback((tenant: TenantSummary) => {
    authStorage.setActiveTenant(tenant);
    setActiveTenantState(tenant);
  }, []);

  const value = useMemo(
    () => ({
      user,
      tenants,
      activeTenant,
      loading,
      login,
      verifyMfaLogin,
      logout,
      switchTenant,
      setActiveTenant,
    }),
    [
      user,
      tenants,
      activeTenant,
      loading,
      login,
      verifyMfaLogin,
      logout,
      switchTenant,
      setActiveTenant,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
