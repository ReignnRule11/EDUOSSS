import type { JwtRefreshPayload } from "@eduos/shared";
import { Role } from "@eduos/shared";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";

import { generateOpaqueToken, hashToken } from "./auth.utils";
import type { ChangePasswordDto } from "./dto/change-password.dto";
import type { ForgotPasswordDto } from "./dto/forgot-password.dto";
import type { LoginDto } from "./dto/login.dto";
import type { MfaConfirmDto } from "./dto/mfa-confirm.dto";
import type { MfaDisableDto } from "./dto/mfa-disable.dto";
import type { RegisterDto } from "./dto/register.dto";
import type { ResetPasswordDto } from "./dto/reset-password.dto";
import type { SwitchTenantDto } from "./dto/switch-tenant.dto";
import type { VerifyEmailDto } from "./dto/verify-email.dto";
import type { VerifyMfaLoginDto } from "./dto/verify-mfa.dto";
import { TokenService } from "./token.service";
import {
  buildOtpauthUrl,
  generateBackupCodes,
  generateTotpSecret,
  hashBackupCode,
  verifyBackupCode,
  verifyTotp,
} from "./totp.utils";
import { TenantContext } from "../../common/context/tenant.context";
import {
  AccountLockedException,
  BadRequestOperationException,
  ConflictResourceException,
  EmailNotVerifiedException,
  ForbiddenOperationException,
  InvalidCredentialsException,
  InvalidMfaCodeException,
  InvalidTokenException,
  ResourceNotFoundException,
  UnauthorizedOperationException,
} from "../../common/exceptions/business.exceptions";
import { PrismaService } from "../../database/prisma.service";
import { RedisService } from "../../database/redis.service";
import { MailService } from "../mail/mail.service";

const LOGIN_ATTEMPT_KEY_PREFIX = "auth:login-attempts:";

type AuditAction =
  | "LOGIN"
  | "LOGIN_FAILED"
  | "REFRESH"
  | "CREATE"
  | "PASSWORD_RESET"
  | "EMAIL_VERIFY"
  | "MFA_ENABLE"
  | "MFA_DISABLE"
  | "SESSION_REVOKE";

interface SessionUser {
  id: string;
  email: string;
  tenantId: string;
  role: string;
  status: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatarUrl: string | null;
  mfaEnabled: boolean;
  emailVerifiedAt: Date | null;
  lastLoginAt: Date | null;
  createdAt: Date;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly redis: RedisService,
    private readonly mail: MailService,
  ) {}

  async login(dto: LoginDto, ipAddress?: string, userAgent?: string) {
    const tenant = await this.resolveTenant(dto.tenantSlug);

    const user = await this.prisma.user.findUnique({
      where: {
        tenantId_email: {
          tenantId: tenant.id,
          email: dto.email.toLowerCase().trim(),
        },
      },
    });

    if (!user) {
      await this.recordFailedAttempt(tenant.id, dto.email);
      throw new InvalidCredentialsException();
    }

    this.assertNotLocked(user);

    const passwordOk = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordOk) {
      await this.recordFailedAttempt(tenant.id, dto.email);
      await this.handleFailedLogin(user, ipAddress, userAgent);
      throw new InvalidCredentialsException();
    }

    await this.resetFailedLogins(user.id);

    if (user.status !== "ACTIVE") {
      throw new ForbiddenOperationException("Your account is not active");
    }

    const requireEmailVerification =
      this.config.get<boolean>("auth.requireEmailVerification") ?? false;
    if (
      requireEmailVerification &&
      !user.emailVerifiedAt &&
      user.role !== Role.SUPER_ADMIN
    ) {
      await this.writeAudit(
        "LOGIN_FAILED",
        "auth.login.email-not-verified",
        user.id,
        user.tenantId,
        user.email,
        user.role,
        ipAddress,
        userAgent,
      );
      throw new EmailNotVerifiedException();
    }

    if (user.mfaEnabled) {
      const challenge = this.tokenService.issueMfaChallenge({
        userId: user.id,
        email: user.email,
        tenantId: user.tenantId,
        role: user.role,
      });
      return {
        requiresMfa: true,
        mfaToken: challenge.mfaToken,
        mfaExpiresAt: challenge.expiresAt,
      };
    }

    return this.completeLogin(user, ipAddress, userAgent);
  }

  async verifyMfaLogin(
    dto: VerifyMfaLoginDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    let payload: { sub: string; purpose?: string };
    try {
      payload = await this.jwtService.verifyAsync<typeof payload>(
        dto.mfaToken,
        {
          secret: this.config.getOrThrow<string>("jwt.accessSecret"),
        },
      );
    } catch {
      throw new UnauthorizedOperationException(
        "The MFA challenge has expired, sign in again",
      );
    }
    if (payload.purpose !== "mfa" || !payload.sub) {
      throw new UnauthorizedOperationException("Invalid MFA challenge");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user || !user.mfaEnabled || !user.mfaSecret) {
      throw new UnauthorizedOperationException("MFA is not enabled");
    }
    if (user.status !== "ACTIVE") {
      throw new ForbiddenOperationException("Your account is not active");
    }

    const backupHashes = user.mfaBackupCodes ?? [];
    const totpValid = verifyTotp(user.mfaSecret, dto.code, {
      windowSeconds: this.config.get<number>("auth.mfaWindowSeconds") ?? 30,
    });
    const backupValid = verifyBackupCode(dto.code, backupHashes);

    if (!totpValid && !backupValid) {
      await this.writeAudit(
        "LOGIN_FAILED",
        "auth.login.mfa",
        user.id,
        user.tenantId,
        user.email,
        user.role,
        ipAddress,
        userAgent,
      );
      throw new InvalidMfaCodeException();
    }

    if (backupValid) {
      const usedHash = hashBackupCode(dto.code);
      await this.prisma.user.update({
        where: { id: user.id },
        data: { mfaBackupCodes: backupHashes.filter((h) => h !== usedHash) },
      });
    }

    return this.completeLogin(user, ipAddress, userAgent);
  }

  async register(dto: RegisterDto, ipAddress?: string, userAgent?: string) {
    const tenant = await this.resolveTenant(dto.tenantSlug);
    const email = dto.email.toLowerCase().trim();

    const existing = await this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId: tenant.id, email } },
    });
    if (existing) {
      throw new ConflictResourceException(
        "An account with this email already exists",
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        tenantId: tenant.id,
        email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: dto.role,
        status: "ACTIVE",
      },
    });

    await this.prisma.userTenant.create({
      data: { userId: user.id, tenantId: tenant.id, role: user.role },
    });

    const session = await this.issueSession(
      user,
      user.role,
      ipAddress,
      userAgent,
    );
    await this.writeAudit(
      "CREATE",
      "user.register",
      user.id,
      user.tenantId,
      user.email,
      user.role,
      ipAddress,
      userAgent,
    );

    const availableTenants = await this.availableTenants(user.id);

    return {
      ...session.tokens,
      user: this.sanitizeUser(user),
      availableTenants,
    };
  }

  async switchTenant(
    userId: string,
    dto: SwitchTenantDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedOperationException("User not found");

    const membership = await this.prisma.userTenant.findFirst({
      where: {
        userId,
        tenant: { OR: [{ id: dto.tenantRef }, { slug: dto.tenantRef }] },
      },
    });
    if (!membership) {
      throw new ResourceNotFoundException("Tenant membership", dto.tenantRef);
    }
    if (membership.status !== "ACTIVE") {
      throw new ForbiddenOperationException(
        "Your membership in this tenant is not active",
      );
    }

    const tenant = await this.prisma.tenant.findFirst({
      where: { id: membership.tenantId, deletedAt: null },
    });
    if (!tenant) throw new ResourceNotFoundException("Tenant", dto.tenantRef);
    if (tenant.status !== "ACTIVE") {
      throw new ForbiddenOperationException(
        "This tenant account is not active",
      );
    }

    const session = await this.issueSession(
      { ...user, tenantId: tenant.id },
      membership.role,
      ipAddress,
      userAgent,
    );

    await this.writeAudit(
      "REFRESH",
      "auth.switch-tenant",
      user.id,
      tenant.id,
      user.email,
      membership.role,
      ipAddress,
      userAgent,
    );

    const availableTenants = await this.availableTenants(user.id);

    return {
      ...session.tokens,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        plan: tenant.plan,
      },
      user: this.sanitizeUser({
        ...user,
        tenantId: tenant.id,
        role: membership.role,
      }),
      availableTenants,
    };
  }

  async refresh(refreshToken: string, ipAddress?: string, userAgent?: string) {
    let payload: JwtRefreshPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtRefreshPayload>(
        refreshToken,
        {
          secret: this.config.getOrThrow<string>("jwt.refreshSecret"),
        },
      );
    } catch {
      throw new UnauthorizedOperationException(
        "Invalid or expired refresh token",
      );
    }

    const tokenHash = hashToken(refreshToken);
    const session = await this.prisma.refreshToken.findFirst({
      where: { tokenHash, revokedAt: null },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      throw new UnauthorizedOperationException(
        "Refresh token is no longer valid",
      );
    }

    const newPair = this.tokenService.issueTokenPair({
      userId: session.user.id,
      email: session.user.email,
      tenantId: session.user.tenantId,
      role: session.user.role,
      tokenVersion: (payload.tokenVersion ?? 0) + 1,
    });

    const newHash = this.tokenService.hashRefreshToken(newPair.refreshToken);
    await this.prisma.$transaction([
      this.prisma.refreshToken.update({
        where: { id: session.id },
        data: {
          revokedAt: new Date(),
          replacedBy: newHash,
          lastUsedAt: new Date(),
        },
      }),
      this.prisma.refreshToken.create({
        data: {
          tenantId: session.user.tenantId,
          userId: session.user.id,
          sessionId: newPair.sessionId,
          tokenHash: newHash,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          ipAddress,
          userAgent,
        },
      }),
    ]);

    await this.writeAudit(
      "REFRESH",
      "auth.refresh",
      session.user.id,
      session.user.tenantId,
      session.user.email,
      session.user.role,
      ipAddress,
      userAgent,
    );

    return {
      ...newPair,
      user: this.sanitizeUser(session.user),
    };
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = hashToken(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedOperationException();

    if (!(await bcrypt.compare(dto.currentPassword, user.passwordHash))) {
      throw new InvalidCredentialsException();
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  // ---------------- Password recovery ----------------

  async forgotPassword(dto: ForgotPasswordDto) {
    let tenant: { id: string } | null = null;
    try {
      tenant = await this.resolveTenant(dto.tenantSlug);
    } catch {
      tenant = null;
    }

    if (tenant) {
      const user = await this.prisma.user.findUnique({
        where: {
          tenantId_email: {
            tenantId: tenant.id,
            email: dto.email.toLowerCase().trim(),
          },
        },
      });
      if (user && user.status !== "INACTIVE") {
        const rawToken = this.createOpaqueToken();
        const ttl =
          this.config.get<number>("auth.passwordResetTtlSeconds") ?? 3600;
        await this.prisma.passwordResetToken.create({
          data: {
            tenantId: user.tenantId,
            userId: user.id,
            tokenHash: hashToken(rawToken),
            expiresAt: new Date(Date.now() + ttl * 1000),
          },
        });
        await this.mail.sendPasswordReset(user.email, user.firstName, rawToken);
      }
    }

    return {
      message:
        "If an account exists for that email, a reset link has been sent.",
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashToken(dto.token) },
      include: { user: true },
    });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new InvalidTokenException();
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: {
          passwordHash,
          failedLoginCount: 0,
          lockedUntil: null,
          ...(record.user.status === "LOCKED" ? { status: "ACTIVE" } : {}),
        },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    await this.writeAudit(
      "PASSWORD_RESET",
      "auth.reset-password",
      record.userId,
      record.user.tenantId,
      record.user.email,
      record.user.role,
    );

    return { message: "Your password has been reset. You can now sign in." };
  }

  // ---------------- Email verification ----------------

  async sendEmailVerification(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedOperationException();

    if (user.emailVerifiedAt) {
      throw new ConflictResourceException("Your email is already verified");
    }

    const rawToken = this.createOpaqueToken();
    const ttl =
      this.config.get<number>("auth.emailVerificationTtlSeconds") ?? 86400;
    await this.prisma.emailVerificationToken.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + ttl * 1000),
      },
    });
    await this.mail.sendEmailVerification(user.email, user.firstName, rawToken);

    return { message: "A verification email has been sent." };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const record = await this.prisma.emailVerificationToken.findUnique({
      where: { tokenHash: hashToken(dto.token) },
      include: { user: true },
    });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new InvalidTokenException(
        "This verification link is invalid or has expired",
      );
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { emailVerifiedAt: new Date() },
      }),
      this.prisma.emailVerificationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);

    await this.writeAudit(
      "EMAIL_VERIFY",
      "auth.verify-email",
      record.userId,
      record.user.tenantId,
      record.user.email,
      record.user.role,
    );

    return { message: "Your email has been verified." };
  }

  // ---------------- MFA ----------------

  async setupMfa(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedOperationException();
    if (user.mfaEnabled) {
      throw new ConflictResourceException("MFA is already enabled");
    }

    const secret = generateTotpSecret();
    const backupCodes = generateBackupCodes(
      this.config.get<number>("auth.mfaBackupCodeCount") ?? 10,
    );

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        mfaSecret: secret,
        mfaBackupCodes: backupCodes.map(hashBackupCode),
        mfaEnabled: false,
      },
    });

    const otpauthUrl = buildOtpauthUrl({
      secret,
      accountName: user.email,
      issuer: this.config.get<string>("auth.mfaIssuer") ?? "EduOS",
    });

    return { secret, otpauthUrl, backupCodes, mfaEnabled: false };
  }

  async confirmMfa(userId: string, dto: MfaConfirmDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedOperationException();
    if (user.mfaEnabled) {
      throw new ConflictResourceException("MFA is already enabled");
    }
    if (!user.mfaSecret) {
      throw new BadRequestOperationException("MFA setup has not been started");
    }

    const windowSeconds =
      this.config.get<number>("auth.mfaWindowSeconds") ?? 30;
    if (!verifyTotp(user.mfaSecret, dto.code, { windowSeconds })) {
      throw new InvalidMfaCodeException();
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: true },
    });
    await this.writeAudit(
      "MFA_ENABLE",
      "auth.mfa.enable",
      userId,
      user.tenantId,
      user.email,
      user.role,
    );

    return { message: "MFA is now enabled", mfaEnabled: true };
  }

  async disableMfa(userId: string, dto: MfaDisableDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedOperationException();
    if (!user.mfaEnabled) {
      throw new BadRequestOperationException("MFA is not enabled");
    }

    const passwordOk =
      !!dto.password && (await bcrypt.compare(dto.password, user.passwordHash));
    const codeOk =
      !!dto.code &&
      (verifyTotp(user.mfaSecret ?? "", dto.code, {
        windowSeconds: this.config.get<number>("auth.mfaWindowSeconds") ?? 30,
      }) ||
        verifyBackupCode(dto.code, user.mfaBackupCodes ?? []));

    if (!passwordOk && !codeOk) {
      throw new InvalidMfaCodeException();
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: false, mfaSecret: null, mfaBackupCodes: [] },
    });
    await this.writeAudit(
      "MFA_DISABLE",
      "auth.mfa.disable",
      userId,
      user.tenantId,
      user.email,
      user.role,
    );

    return { message: "MFA has been disabled", mfaEnabled: false };
  }

  // ---------------- Session / device management ----------------

  async listSessions(userId: string, currentSessionId: string | undefined) {
    const rows = await this.prisma.refreshToken.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { lastUsedAt: "desc" },
      select: {
        id: true,
        sessionId: true,
        createdAt: true,
        lastUsedAt: true,
        expiresAt: true,
        ipAddress: true,
        userAgent: true,
      },
    });

    return rows.map((row) => ({
      id: row.id,
      sessionId: row.sessionId,
      createdAt: row.createdAt,
      lastUsedAt: row.lastUsedAt ?? row.createdAt,
      expiresAt: row.expiresAt,
      ipAddress: row.ipAddress ?? null,
      userAgent: row.userAgent ?? null,
      current: !!row.sessionId && row.sessionId === currentSessionId,
    }));
  }

  async revokeSession(
    userId: string,
    sessionId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedOperationException();

    const result = await this.prisma.refreshToken.updateMany({
      where: { id: sessionId, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (result.count === 0) {
      throw new ResourceNotFoundException("Session", sessionId);
    }

    await this.writeAudit(
      "SESSION_REVOKE",
      "auth.sessions.revoke",
      userId,
      user.tenantId,
      user.email,
      user.role,
      ipAddress,
      userAgent,
    );
    return { message: "Session revoked" };
  }

  async revokeAllSessions(
    userId: string,
    currentSessionId: string | undefined,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedOperationException();

    const result = await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
        sessionId: { not: currentSessionId },
      },
      data: { revokedAt: new Date() },
    });

    await this.writeAudit(
      "SESSION_REVOKE",
      "auth.sessions.revoke-all",
      userId,
      user.tenantId,
      user.email,
      user.role,
      ipAddress,
      userAgent,
    );
    return {
      message: `Revoked ${result.count} other session(s)`,
      revoked: result.count,
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatarUrl: true,
        role: true,
        status: true,
        emailVerifiedAt: true,
        mfaEnabled: true,
        lastLoginAt: true,
        tenantId: true,
        createdAt: true,
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
            logoUrl: true,
            plan: true,
          },
        },
      },
    });
    if (!user) throw new UnauthorizedOperationException("User not found");

    const availableTenants = await this.availableTenants(userId);
    return { ...user, availableTenants };
  }

  async availableTenants(userId: string) {
    const memberships = await this.prisma.userTenant.findMany({
      where: {
        userId,
        status: "ACTIVE",
        tenant: { status: "ACTIVE", deletedAt: null },
      },
      select: {
        role: true,
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            plan: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    if (memberships.length > 0) {
      return memberships.map((m) => ({ ...m.tenant, role: m.role }));
    }

    // Legacy fallback: users created before memberships existed.
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            plan: true,
            status: true,
          },
        },
      },
    });
    return user?.tenant ? [{ ...user.tenant, role: "TENANT_ADMIN" }] : [];
  }

  // ---------------------------------------------------------------

  private async completeLogin(
    user: SessionUser,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const session = await this.issueSession(
      user,
      user.role,
      ipAddress,
      userAgent,
    );

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await this.writeAudit(
      "LOGIN",
      "auth.login",
      user.id,
      user.tenantId,
      user.email,
      user.role,
      ipAddress,
      userAgent,
    );

    const availableTenants = await this.availableTenants(user.id);

    return {
      ...session.tokens,
      user: this.sanitizeUser(user),
      availableTenants,
    };
  }

  private async issueSession(
    user: SessionUser,
    role: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const tokens = this.tokenService.issueTokenPair({
      userId: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role,
      tokenVersion: 1,
    });

    await this.prisma.refreshToken.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        sessionId: tokens.sessionId,
        tokenHash: this.tokenService.hashRefreshToken(tokens.refreshToken),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        lastUsedAt: new Date(),
        ipAddress,
        userAgent,
      },
    });

    return { tokens };
  }

  private async resolveTenant(slug?: string) {
    const requestedSlug =
      slug?.trim() ||
      TenantContext.getTenantSlug() ||
      TenantContext.getTenantId();
    if (!requestedSlug) {
      throw new BadRequestOperationException(
        "tenantSlug is required, or provide the X-Tenant-Id header",
      );
    }
    const tenant = await this.prisma.tenant.findFirst({
      where: {
        OR: [{ slug: requestedSlug }, { id: requestedSlug }],
        deletedAt: null,
      },
    });
    if (!tenant) {
      throw new BadRequestOperationException(
        `Tenant "${requestedSlug}" was not found`,
      );
    }
    if (tenant.status !== "ACTIVE") {
      throw new ForbiddenOperationException(
        "This tenant account is not active",
      );
    }
    return tenant;
  }

  private assertNotLocked(user: { lockedUntil: Date | null }): void {
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((user.lockedUntil.getTime() - Date.now()) / 1000),
      );
      throw new AccountLockedException(retryAfterSeconds);
    }
  }

  private async handleFailedLogin(
    user: {
      id: string;
      tenantId: string;
      email: string;
      role: string;
      failedLoginCount: number;
    },
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.writeAudit(
      "LOGIN_FAILED",
      "auth.login",
      user.id,
      user.tenantId,
      user.email,
      user.role,
      ipAddress,
      userAgent,
    );

    const maxAttempts = this.config.get<number>("auth.maxLoginAttempts") ?? 5;
    const next = (user.failedLoginCount ?? 0) + 1;

    if (next >= maxAttempts) {
      const lockoutMs = this.config.get<number>("auth.lockoutMs") ?? 900000;
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginCount: 0,
          lockedUntil: new Date(Date.now() + lockoutMs),
        },
      });
    } else {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginCount: next },
      });
    }
  }

  private async resetFailedLogins(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { failedLoginCount: 0, lockedUntil: null },
    });
  }

  private async recordFailedAttempt(
    tenantId: string,
    email: string,
  ): Promise<void> {
    const key = `${LOGIN_ATTEMPT_KEY_PREFIX}${tenantId}:${email.toLowerCase()}`;
    const current = Number((await this.redis.get<number>(key)) ?? 0);
    await this.redis.set(key, current + 1, 900);
  }

  private createOpaqueToken(): string {
    return generateOpaqueToken();
  }

  private sanitizeUser(user: SessionUser) {
    const {
      id,
      email,
      firstName,
      lastName,
      phone,
      avatarUrl,
      role,
      status,
      mfaEnabled,
      emailVerifiedAt,
      tenantId,
      lastLoginAt,
      createdAt,
    } = user;
    return {
      id,
      email,
      firstName,
      lastName,
      phone,
      avatarUrl,
      role,
      status,
      mfaEnabled,
      emailVerifiedAt,
      tenantId,
      lastLoginAt,
      createdAt,
    };
  }

  private async writeAudit(
    action: AuditAction,
    resource: string,
    actorId: string,
    tenantId: string,
    email: string,
    role: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          tenantId,
          actorId,
          actorEmail: email,
          role,
          action,
          resource,
          ipAddress,
          userAgent,
        },
      });
    } catch (error) {
      this.logger.warn(`Audit write failed: ${(error as Error).message}`);
    }
  }
}
