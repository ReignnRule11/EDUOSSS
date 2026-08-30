import type { AuthPrincipal } from "@eduos/shared";
import type { Request } from "express";

/** Express request enriched by guards/middleware. */
export interface AuthenticatedRequest extends Request {
  user: AuthPrincipal;
  requestId: string;
  startedAt: number;
}

export interface RequestWithUser extends Request {
  user?: AuthPrincipal;
  requestId: string;
  startedAt: number;
}
