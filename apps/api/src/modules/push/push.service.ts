import type { AuthPrincipal } from "@eduos/shared";
import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";

import type { SendPushDto, SubscribeDto } from "./dto/push.dto";
import {
  BadRequestOperationException,
  ResourceNotFoundException,
} from "../../common/exceptions/business.exceptions";
import { BaseRepository } from "../../common/repositories/base.repository";
import { PrismaService } from "../../database/prisma.service";

interface PushConfig {
  publicKey: string | null;
  privateKey: string | null;
  subject: string;
}

@Injectable()
export class PushService extends BaseRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async subscribe(actor: AuthPrincipal, dto: SubscribeDto) {
    const existing = await this.prisma.scoped.pushSubscription.findFirst({
      where: this.tenantWhere({ userId: actor.userId, endpoint: dto.endpoint }),
    });
    if (existing) {
      return this.prisma.scoped.pushSubscription.update({
        where: { id: existing.id },
        data: {
          keys: dto.keys as Prisma.InputJsonValue,
          userAgent: dto.userAgent,
        },
      });
    }
    return this.prisma.scoped.pushSubscription.create({
      data: this.withTenant({
        userId: actor.userId,
        endpoint: dto.endpoint,
        keys: dto.keys as Prisma.InputJsonValue,
        userAgent: dto.userAgent,
      } as Prisma.PushSubscriptionUncheckedCreateInput),
    });
  }

  async unsubscribe(actor: AuthPrincipal, endpoint: string) {
    const sub = await this.prisma.scoped.pushSubscription.findFirst({
      where: this.tenantWhere({ userId: actor.userId, endpoint }),
    });
    if (!sub) {
      throw new ResourceNotFoundException("PushSubscription", endpoint);
    }
    await this.prisma.scoped.pushSubscription.delete({ where: { id: sub.id } });
    return { success: true };
  }

  async listMySubscriptions(actor: AuthPrincipal) {
    const items = await this.prisma.scoped.pushSubscription.findMany({
      where: this.tenantWhere({ userId: actor.userId }),
      orderBy: { createdAt: "desc" },
      select: { id: true, endpoint: true, userAgent: true, createdAt: true },
    });
    return { items, meta: { total: items.length } };
  }

  /** Delivers a push to the target user's device(s). Returns per-device results. */
  async send(dto: SendPushDto, actor: AuthPrincipal) {
    const config = await this.getFullConfig();
    if (!config.publicKey || !config.privateKey) {
      throw new BadRequestOperationException(
        "Push is not configured. Set the VAPID keys in the tenant settings first.",
      );
    }

    const where: Prisma.PushSubscriptionWhereInput = {
      ...(dto.userIds && dto.userIds.length > 0
        ? { userId: { in: dto.userIds } }
        : {}),
    };
    const subs = await this.prisma.scoped.pushSubscription.findMany({
      where: this.tenantWhere(where),
    });
    if (subs.length === 0) {
      throw new BadRequestOperationException("No push subscriptions found");
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const webpush = require("web-push") as typeof import("web-push");
    webpush.setVapidDetails(
      config.subject,
      config.publicKey,
      config.privateKey,
    );

    const payload = JSON.stringify({
      title: dto.title,
      body: dto.body,
      url: dto.url ?? "/dashboard",
    });

    const results: Array<{ endpoint: string; ok: boolean; error?: string }> =
      [];
    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: sub.keys as { p256dh: string; auth: string },
          },
          payload,
        );
        results.push({ endpoint: sub.endpoint, ok: true });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        // Stale subscription — clean up.
        if (err instanceof webpush.WebPushError && err.statusCode === 410) {
          await this.prisma.scoped.pushSubscription
            .delete({ where: { id: sub.id } })
            .catch(() => {});
        }
        results.push({ endpoint: sub.endpoint, ok: false, error: message });
      }
    }
    void actor;
    return {
      sent: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
      results,
    };
  }

  async getConfig() {
    const settings = await this.getSettings();
    const push = (settings.push ?? {}) as Partial<PushConfig>;
    return {
      publicKey: push.publicKey ?? null,
      hasConfig: Boolean(push.publicKey && push.privateKey),
    };
  }

  private async getFullConfig(): Promise<PushConfig> {
    const settings = await this.getSettings();
    const push = (settings.push ?? {}) as Partial<PushConfig>;
    return {
      publicKey: push.publicKey ?? null,
      privateKey: push.privateKey ?? null,
      subject: push.subject ?? "mailto:admin@school.local",
    };
  }

  async saveConfig(config: {
    publicKey: string;
    privateKey: string;
    subject: string;
  }) {
    const settings = await this.getSettings();
    settings.push = {
      publicKey: config.publicKey,
      privateKey: config.privateKey,
      subject: config.subject,
    };
    await this.updateSettings(settings);
    return this.getConfig();
  }

  private async getSettings(): Promise<Record<string, unknown>> {
    const tenant = await this.prisma.scoped.tenant.findFirst({
      where: { id: this.tenantId() },
      select: { settings: true },
    });
    if (!tenant) throw new ResourceNotFoundException("Tenant", this.tenantId());
    return (tenant.settings ?? {}) as Record<string, unknown>;
  }

  private async updateSettings(settings: Record<string, unknown>) {
    await this.prisma.scoped.tenant.update({
      where: { id: this.tenantId() },
      data: { settings: settings as Prisma.InputJsonValue },
    });
  }
}
