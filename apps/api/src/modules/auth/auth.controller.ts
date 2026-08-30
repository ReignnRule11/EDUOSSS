import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import type { Request } from "express";

import { AuthService } from "./auth.service";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { LoginDto } from "./dto/login.dto";
import { MfaConfirmDto } from "./dto/mfa-confirm.dto";
import { MfaDisableDto } from "./dto/mfa-disable.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { RegisterDto } from "./dto/register.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { SwitchTenantDto } from "./dto/switch-tenant.dto";
import { VerifyEmailDto } from "./dto/verify-email.dto";
import { VerifyMfaLoginDto } from "./dto/verify-mfa.dto";
import { SkipAudit } from "../../common/decorators/audit.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Public } from "../../common/decorators/public.decorator";

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 900_000 } })
  @Post("login")
  @ApiOperation({
    summary: "Sign in; returns tokens or an MFA challenge when enabled",
  })
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto, req.ip, req.headers["user-agent"]);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 900_000 } })
  @Post("mfa/verify-login")
  @ApiOperation({
    summary: "Complete a password+MFA sign in with a TOTP/backup code",
  })
  @HttpCode(HttpStatus.OK)
  verifyMfaLogin(@Body() dto: VerifyMfaLoginDto, @Req() req: Request) {
    return this.authService.verifyMfaLogin(
      dto,
      req.ip,
      req.headers["user-agent"],
    );
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 900_000 } })
  @Post("register")
  @ApiOperation({ summary: "Self-service account creation (student / parent)" })
  register(@Body() dto: RegisterDto, @Req() req: Request) {
    return this.authService.register(dto, req.ip, req.headers["user-agent"]);
  }

  @Public()
  @Throttle({ default: { limit: 30, ttl: 900_000 } })
  @Post("refresh")
  @ApiOperation({ summary: "Rotate refresh token and issue a new token pair" })
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshTokenDto, @Req() req: Request) {
    return this.authService.refresh(
      dto.refreshToken,
      req.ip,
      req.headers["user-agent"],
    );
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 900_000 } })
  @Post("forgot-password")
  @ApiOperation({ summary: "Request a password reset link (no enumeration)" })
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 900_000 } })
  @Post("reset-password")
  @ApiOperation({ summary: "Set a new password using a reset token" })
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 900_000 } })
  @Post("verify-email")
  @ApiOperation({ summary: "Verify an email address using a token link" })
  @HttpCode(HttpStatus.OK)
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto);
  }

  @ApiBearerAuth()
  @Post("verify-email/send")
  @ApiOperation({ summary: "Resend the email verification link" })
  @HttpCode(HttpStatus.OK)
  sendEmailVerification(@CurrentUser("userId") userId: string) {
    return this.authService.sendEmailVerification(userId);
  }

  @ApiBearerAuth()
  @Post("mfa/setup")
  @ApiOperation({
    summary:
      "Start MFA enrollment; returns secret, otpauth URL and backup codes",
  })
  @HttpCode(HttpStatus.OK)
  setupMfa(@CurrentUser("userId") userId: string) {
    return this.authService.setupMfa(userId);
  }

  @ApiBearerAuth()
  @Post("mfa/confirm")
  @ApiOperation({ summary: "Confirm MFA enrollment with a TOTP code" })
  @HttpCode(HttpStatus.OK)
  confirmMfa(
    @CurrentUser("userId") userId: string,
    @Body() dto: MfaConfirmDto,
  ) {
    return this.authService.confirmMfa(userId, dto);
  }

  @ApiBearerAuth()
  @Post("mfa/disable")
  @ApiOperation({ summary: "Disable MFA using a password or TOTP/backup code" })
  @HttpCode(HttpStatus.OK)
  disableMfa(
    @CurrentUser("userId") userId: string,
    @Body() dto: MfaDisableDto,
  ) {
    return this.authService.disableMfa(userId, dto);
  }

  @ApiBearerAuth()
  @Get("sessions")
  @ApiOperation({
    summary: "List the active sessions/devices for the current user",
  })
  listSessions(
    @CurrentUser() principal: { userId: string; sessionId: string },
  ) {
    return this.authService.listSessions(principal.userId, principal.sessionId);
  }

  @ApiBearerAuth()
  @Delete("sessions/:id")
  @ApiOperation({ summary: "Revoke a single session/device" })
  @HttpCode(HttpStatus.OK)
  revokeSession(
    @CurrentUser("userId") userId: string,
    @Param("id") id: string,
    @Req() req: Request,
  ) {
    return this.authService.revokeSession(
      userId,
      id,
      req.ip,
      req.headers["user-agent"],
    );
  }

  @ApiBearerAuth()
  @Delete("sessions")
  @ApiOperation({ summary: "Revoke every other active session" })
  @HttpCode(HttpStatus.OK)
  revokeAllSessions(
    @CurrentUser() principal: { userId: string; sessionId: string },
    @Req() req: Request,
  ) {
    return this.authService.revokeAllSessions(
      principal.userId,
      principal.sessionId,
      req.ip,
      req.headers["user-agent"],
    );
  }

  @ApiBearerAuth()
  @Post("switch-tenant")
  @ApiOperation({
    summary: "Switch the active tenant context for the current user",
  })
  @HttpCode(HttpStatus.OK)
  switchTenant(
    @CurrentUser("userId") userId: string,
    @Body() dto: SwitchTenantDto,
    @Req() req: Request,
  ) {
    return this.authService.switchTenant(
      userId,
      dto,
      req.ip,
      req.headers["user-agent"],
    );
  }

  @ApiBearerAuth()
  @Post("logout")
  @ApiOperation({ summary: "Revoke the active refresh session" })
  @HttpCode(HttpStatus.NO_CONTENT)
  @SkipAudit()
  async logout(@Body() dto: RefreshTokenDto): Promise<void> {
    await this.authService.logout(dto.refreshToken);
  }

  @ApiBearerAuth()
  @Post("change-password")
  @ApiOperation({ summary: "Change own password and revoke active sessions" })
  @HttpCode(HttpStatus.NO_CONTENT)
  @SkipAudit()
  async changePassword(
    @CurrentUser("userId") userId: string,
    @Body() dto: ChangePasswordDto,
  ): Promise<void> {
    await this.authService.changePassword(userId, dto);
  }

  @ApiBearerAuth()
  @Get("me")
  @ApiOperation({ summary: "Return the authenticated user profile" })
  me(@CurrentUser("userId") userId: string) {
    return this.authService.getProfile(userId);
  }
}
