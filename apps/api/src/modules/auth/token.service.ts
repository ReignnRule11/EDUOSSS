import {
  ROLE_PERMISSIONS,
  type JwtAccessPayload,
  type JwtRefreshPayload,
} from "@eduos/shared";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";

import { hashToken } from "./auth.utils";

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: number;
  sessionId: string;
}

export interface MfaChallenge {
  mfaToken: string;
  expiresAt: number;
}

export interface IssuedRefreshSession {
  rawToken: string;
  tokenHash: string;
  expiresAt: Date;
  sessionId: string;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  issueAccessToken(payload: JwtAccessPayload): string {
    return this.jwtService.sign(payload, {
      secret: this.config.get<string>("jwt.accessSecret"),
      expiresIn: this.config.get<string>("jwt.accessExpiresIn"),
    });
  }

  /** Issues a refresh token, returns both the raw token and the hashed record. */
  issueRefreshSession(
    userId: string,
    tokenVersion: number,
  ): IssuedRefreshSession {
    const sessionId = hashToken(
      `${userId}:${Date.now()}:${Math.random()}`,
    ).slice(0, 32);
    const rawToken = this.jwtService.sign(
      { sub: userId, sessionId, tokenVersion } satisfies JwtRefreshPayload,
      {
        secret: this.config.get<string>("jwt.refreshSecret"),
        expiresIn: this.config.get<string>("jwt.refreshExpiresIn"),
      },
    );
    const expiresInSeconds = this.parseExpiryToSeconds(
      this.config.get<string>("jwt.refreshExpiresIn") ?? "7d",
    );
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

    return {
      rawToken,
      tokenHash: hashToken(rawToken),
      expiresAt,
      sessionId,
    };
  }

  /** Builds the full access+refresh pair for a principal. */
  issueTokenPair(principal: {
    userId: string;
    email: string;
    tenantId: string;
    role: string;
    tokenVersion: number;
  }): TokenPair {
    const permissions = ROLE_PERMISSIONS[principal.role] ?? [];
    const session = this.issueRefreshSession(
      principal.userId,
      principal.tokenVersion,
    );
    const accessPayload: JwtAccessPayload = {
      sub: principal.userId,
      email: principal.email,
      tenantId: principal.tenantId,
      role: principal.role,
      permissions: [...permissions],
      sessionId: session.sessionId,
    };
    const accessToken = this.issueAccessToken(accessPayload);
    const accessTtl = this.parseExpiryToSeconds(
      this.config.get<string>("jwt.accessExpiresIn") ?? "15m",
    );

    return {
      accessToken,
      refreshToken: session.rawToken,
      accessTokenExpiresAt: Date.now() + accessTtl * 1000,
      sessionId: session.sessionId,
    };
  }

  /**
   * Issues a short-lived single-purpose token used to carry an MFA
   * challenge from login to the second step. It is not a session token:
   * it only proves the first factor (password) was satisfied.
   */
  issueMfaChallenge(principal: {
    userId: string;
    email: string;
    tenantId: string;
    role: string;
  }): MfaChallenge {
    const accessTtl = this.parseExpiryToSeconds("5m");
    const token = this.jwtService.sign(
      {
        sub: principal.userId,
        email: principal.email,
        tenantId: principal.tenantId,
        role: principal.role,
        purpose: "mfa",
      },
      {
        secret: this.config.get<string>("jwt.accessSecret"),
        expiresIn: 300,
      },
    );
    return { mfaToken: token, expiresAt: Date.now() + accessTtl * 1000 };
  }

  hashRefreshToken(rawToken: string): string {
    return hashToken(rawToken);
  }

  private parseExpiryToSeconds(expiry: string): number {
    const match = /^(\d+)([smhd])$/.exec(expiry);
    if (!match) return 604800;
    const value = Number(match[1]);
    const unit = match[2]!;
    const multipliers: Record<string, number> = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
    };
    return value * (multipliers[unit] ?? 1);
  }
}
