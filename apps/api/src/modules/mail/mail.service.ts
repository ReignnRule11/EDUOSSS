import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

export interface SendEmailInput {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/**
 * Central outbound email channel.
 *
 * When `SMTP_HOST` is configured the message is delivered over SMTP. Otherwise
 * the service falls back to "preview mode": the rendered message is written to
 * the API logs so developers can inspect what an email would look like. This
 * keeps the whole flow exercisable in local/preview environments without a
 * mail server.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter | null;
  private readonly from: string;
  private readonly publicBaseUrl: string;

  constructor(config: ConfigService) {
    this.from =
      config.get<string>("mail.from") ?? "EduOS <no-reply@eduos.local>";
    this.publicBaseUrl =
      config.get<string>("auth.publicBaseUrl") ?? "http://localhost:3000";

    const host = config.get<string>("mail.host") ?? "";
    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: config.get<number>("mail.port") ?? 587,
        secure: config.get<boolean>("mail.secure") ?? false,
        auth:
          config.get<string>("mail.user") || config.get<string>("mail.pass")
            ? {
                user: config.get<string>("mail.user") ?? "",
                pass: config.get<string>("mail.pass") ?? "",
              }
            : undefined,
      });
      this.logger.log(
        `Mail transport configured via ${host}:${config.get<number>("mail.port") ?? 587}`,
      );
    } else {
      this.transporter = null;
      this.logger.log(
        "Mail preview mode: no SMTP_HOST set, emails are written to the logs",
      );
    }
  }

  async send(input: SendEmailInput): Promise<void> {
    if (this.transporter) {
      await this.transporter.sendMail({
        from: this.from,
        to: input.to,
        subject: input.subject,
        text: input.text,
        html: input.html,
      });
      return;
    }

    this.preview(input);
  }

  sendPasswordReset(
    to: string,
    firstName: string,
    token: string,
  ): Promise<void> {
    const resetUrl = `${this.publicBaseUrl}/reset-password?token=${encodeURIComponent(token)}`;
    return this.send({
      to,
      subject: "Reset your EduOS password",
      text: [
        `Hi ${firstName},`,
        "",
        "We received a request to reset the password for your EduOS account.",
        "Use the link below to choose a new password. The link expires in 1 hour.",
        "",
        resetUrl,
        "",
        "If you did not request this, you can safely ignore this email.",
      ].join("\n"),
      html: this.layout({
        title: "Reset your password",
        body: `<p>Hi <strong>${this.escapeHtml(firstName)}</strong>,</p>
          <p>We received a request to reset the password for your EduOS account. The link below expires in <strong>1 hour</strong>.</p>
          <p style="margin:24px 0"><a href="${this.escapeHtml(resetUrl)}" style="background:#2563eb;color:#ffffff;padding:10px 18px;border-radius:6px;text-decoration:none;display:inline-block">Reset password</a></p>
          <p>If the button does not work, copy this link into your browser:<br/><span style="font-size:12px;color:#6b7280">${this.escapeHtml(resetUrl)}</span></p>
          <p>If you did not request this, you can safely ignore this email.</p>`,
      }),
    });
  }

  sendEmailVerification(
    to: string,
    firstName: string,
    token: string,
  ): Promise<void> {
    const verifyUrl = `${this.publicBaseUrl}/verify-email?token=${encodeURIComponent(token)}`;
    return this.send({
      to,
      subject: "Verify your EduOS email",
      text: [
        `Hi ${firstName},`,
        "",
        "Confirm your email address to finish setting up your EduOS account.",
        "",
        verifyUrl,
        "",
        "This link expires in 24 hours.",
      ].join("\n"),
      html: this.layout({
        title: "Verify your email",
        body: `<p>Hi <strong>${this.escapeHtml(firstName)}</strong>,</p>
          <p>Confirm your email address to finish setting up your EduOS account.</p>
          <p style="margin:24px 0"><a href="${this.escapeHtml(verifyUrl)}" style="background:#2563eb;color:#ffffff;padding:10px 18px;border-radius:6px;text-decoration:none;display:inline-block">Verify email</a></p>
          <p>If the button does not work, copy this link into your browser:<br/><span style="font-size:12px;color:#6b7280">${this.escapeHtml(verifyUrl)}</span></p>
          <p>This link expires in 24 hours.</p>`,
      }),
    });
  }

  sendWelcome(
    to: string,
    firstName: string,
    options: { temporaryPassword?: string; resetToken?: string },
  ): Promise<void> {
    const sections: string[] = [
      `<p>Hi <strong>${this.escapeHtml(firstName)}</strong>,</p>`,
      `<p>An EduOS account has been created for you. Sign in at ${this.escapeHtml(this.publicBaseUrl)}.</p>`,
    ];
    const textSections: string[] = [
      `Hi ${firstName},`,
      "",
      "An EduOS account has been created for you.",
      `Sign in at ${this.publicBaseUrl}`,
      "",
    ];

    if (options.temporaryPassword) {
      sections.push(
        `<p>Your temporary password is: <code>${this.escapeHtml(options.temporaryPassword)}</code>. You will be asked to change it after signing in.</p>`,
      );
      textSections.push(
        `Your temporary password is: ${options.temporaryPassword}.`,
        "You will be asked to change it after signing in.",
      );
    }
    if (options.resetToken) {
      const resetUrl = `${this.publicBaseUrl}/reset-password?token=${encodeURIComponent(options.resetToken)}`;
      sections.push(
        `<p style="margin:24px 0"><a href="${this.escapeHtml(resetUrl)}" style="background:#2563eb;color:#ffffff;padding:10px 18px;border-radius:6px;text-decoration:none;display:inline-block">Set your password</a></p>`,
      );
      textSections.push("", "Set your password here:", resetUrl);
    }

    return this.send({
      to,
      subject: "Welcome to EduOS",
      text: textSections.join("\n"),
      html: this.layout({
        title: "Welcome to EduOS",
        body: sections.join(""),
      }),
    });
  }

  // ---------------------------------------------------------------

  private preview(input: SendEmailInput): void {
    this.logger.log(
      `[MAIL-PREVIEW] To: ${input.to} | Subject: ${input.subject}\n${input.text}`,
    );
  }

  private layout(options: { title: string; body: string }): string {
    return `<!doctype html><html><body style="font-family:system-ui,sans-serif;background:#f3f4f6;padding:24px">
      <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:8px;padding:24px;border:1px solid #e5e7eb">
        <h2 style="margin-top:0;color:#111827">${options.title}</h2>
        ${options.body}
        <p style="margin-top:32px;font-size:11px;color:#9ca3af">EduOS — Enterprise School Management System</p>
      </div></body></html>`;
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
}
