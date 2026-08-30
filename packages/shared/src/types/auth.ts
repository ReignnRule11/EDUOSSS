/** Minimal authenticated principal carried by JWT payloads. */
export interface JwtAccessPayload {
  sub: string;
  email: string;
  tenantId: string;
  role: string;
  permissions: string[];
  sessionId: string;
}

export interface JwtRefreshPayload {
  sub: string;
  sessionId: string;
  tokenVersion: number;
}

/** Authenticated request principal injected into the request context. */
export interface AuthPrincipal {
  userId: string;
  email: string;
  tenantId: string;
  role: string;
  permissions: string[];
  sessionId: string;
}
