import { Injectable } from "@nestjs/common";
import {
  HealthCheckError,
  HealthIndicator,
  type HealthIndicatorResult,
} from "@nestjs/terminus";

import { PrismaService } from "../../database/prisma.service";

@Injectable()
export class DatabaseHealthIndicator extends HealthIndicator {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const isUp = await this.prisma.isHealthy();
    if (!isUp) {
      throw new HealthCheckError(
        "Database health check failed",
        this.getStatus(key, false),
      );
    }
    return this.getStatus(key, true);
  }
}
