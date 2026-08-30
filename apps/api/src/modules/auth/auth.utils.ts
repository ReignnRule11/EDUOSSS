import { createHash, randomBytes } from "crypto";

/** Deterministic hash of a raw refresh token stored in the database. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Generates a cryptographically random opaque token. */
export function generateOpaqueToken(): string {
  return randomBytes(48).toString("hex");
}

export interface ParsedToken {
  token: string;
  isValid: boolean;
}

/** Extracts a Bearer token from an Authorization header. */
export function extractBearerToken(authorizationHeader?: string): ParsedToken {
  if (!authorizationHeader) return { token: "", isValid: false };
  const [scheme, token] = authorizationHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token)
    return { token: "", isValid: false };
  return { token, isValid: true };
}
