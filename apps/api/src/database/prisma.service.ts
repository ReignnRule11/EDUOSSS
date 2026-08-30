import {
  Injectable,
  type OnModuleDestroy,
  type OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaClient } from "@prisma/client";

import { tenantIsolationExtension } from "./tenant-isolation.extension";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  /**
   * Tenant-isolated client: every query on tenant-scoped models is
   * automatically filtered/injected with the request tenantId.
   * Tenant-scoped modules MUST use `this.prisma.scoped`.
   */
  readonly scoped: PrismaClient;

  constructor(config: ConfigService) {
    super({
      datasources: {
        db: { url: config.getOrThrow<string>("databaseUrl") },
      },
      log:
        config.get<string>("nodeEnv") === "development"
          ? ["warn", "error"]
          : ["error"],
    });
    this.scoped = this.$extends(
      tenantIsolationExtension,
    ) as unknown as PrismaClient;
  }

  async onModuleInit(): Promise<void> {
    await Promise.all([this.$connect(), this.scoped.$connect()]);
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all([this.$disconnect(), this.scoped.$disconnect()]);
  }

  /** Runs cleanups / health probes against the database. */
  async isHealthy(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}
