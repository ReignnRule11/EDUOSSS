import {
  ROLE_PERMISSIONS,
  type AuthPrincipal,
  type JwtAccessPayload,
} from "@eduos/shared";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";

import { PrismaService } from "../../../database/prisma.service";

/**
 * JWT strategy that re-validates the principal against the database on every
 * authenticated request.
 *
 * The access token only proves possession of a signed token; authorization is
 * derived from the CURRENT user record, membership and tenant status. This
 * ensures a demoted/revoked/deactivated user cannot keep exercising a stale
 * token's old role/permissions after it has been changed server-side.
 *
 * Identity lookup uses the (global, PK-scoped) User row matching the token's
 * subject; membership is validated through the tenant-scoped UserTenant row so
 * a token cannot be used outside an active membership.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>("jwt.accessSecret"),
    });
  }

  async validate(payload: JwtAccessPayload): Promise<AuthPrincipal> {
    if (!payload.sub || !payload.tenantId) {
      throw new UnauthorizedException("Invalid token payload");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        tenantId: true,
      },
    });
    if (!user) {
      throw new UnauthorizedException("Account no longer exists");
    }
    if (user.status !== "ACTIVE") {
      throw new UnauthorizedException("Account is not active");
    }

    // Determine the CURRENT effective role for this tenant via the membership.
    const membership = await this.prisma.scoped.userTenant.findFirst({
      where: { userId: user.id, tenantId: payload.tenantId },
      select: { role: true, status: true },
    });

    // A user whose membership was revoked must lose access immediately.
    if (membership && membership.status !== "ACTIVE") {
      throw new UnauthorizedException("Membership is no longer active");
    }

    const role =
      membership?.role ??
      (user.tenantId === payload.tenantId ? user.role : undefined);
    if (!role) {
      throw new UnauthorizedException("No active membership in this tenant");
    }

    const permissions = ROLE_PERMISSIONS[role] ?? [];

    return {
      userId: user.id,
      email: user.email,
      tenantId: payload.tenantId,
      role,
      permissions: [...permissions],
      sessionId: payload.sessionId,
    };
  }
}
