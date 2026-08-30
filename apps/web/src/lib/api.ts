import { getAccessToken, getActiveTenant } from "./auth-storage";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api/v1";

export class ApiError extends Error {
  statusCode: number;
  errorCode: string;
  details?: unknown;

  constructor(
    message: string,
    statusCode: number,
    errorCode: string,
    details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
  }
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  /** Skip the X-Tenant-Id header (login/onboarding only). */
  skipTenantHeader?: boolean;
}

export interface ApiEnvelope<T> {
  data: T;
  meta?: Record<string, unknown>;
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<ApiEnvelope<T>> {
  const { body, headers, skipTenantHeader, ...rest } = options;
  const token = getAccessToken();
  const tenant = getActiveTenant();

  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(headers as Record<string, string> | undefined),
  };
  if (token) requestHeaders.Authorization = `Bearer ${token}`;
  if (tenant?.slug && !skipTenantHeader)
    requestHeaders["X-Tenant-Id"] = tenant.slug;

  const response = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: requestHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const json = (await response.json().catch(() => null)) as {
    success: boolean;
    data?: T;
    meta?: Record<string, unknown>;
    message?: string;
    errorCode?: string;
    details?: unknown;
  } | null;

  if (!response.ok || json?.success === false) {
    const error = new ApiError(
      json?.message ?? `Request failed (${response.status})`,
      response.status,
      json?.errorCode ?? "UNKNOWN",
      json?.details,
    );
    if (response.status === 401) {
      window.dispatchEvent(new CustomEvent("eduos:unauthorized"));
    }
    throw error;
  }

  return { data: json?.data as T, meta: json?.meta };
}

export const api = {
  get<T>(path: string, options?: RequestOptions): Promise<ApiEnvelope<T>> {
    return apiRequest<T>(path, { ...options, method: "GET" });
  },
  post<T>(
    path: string,
    body?: unknown,
    options?: RequestOptions,
  ): Promise<ApiEnvelope<T>> {
    return apiRequest<T>(path, { ...options, method: "POST", body });
  },
  patch<T>(
    path: string,
    body?: unknown,
    options?: RequestOptions,
  ): Promise<ApiEnvelope<T>> {
    return apiRequest<T>(path, { ...options, method: "PATCH", body });
  },
  delete<T>(path: string, options?: RequestOptions): Promise<ApiEnvelope<T>> {
    return apiRequest<T>(path, { ...options, method: "DELETE" });
  },
};
