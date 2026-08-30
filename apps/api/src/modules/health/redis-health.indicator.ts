import { Injectable } from "@nestjs/common";
import {
  HealthCheckError,
  HealthIndicator,
  type HealthIndicatorResult,
} from "@nestjs/terminus";

import { RedisService } from "../../database/redis.service";

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(private readonly redis: RedisService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const isUp = await this.redis.ping();
    if (!isUp) {
      throw new HealthCheckError(
        "Redis health check failed",
        this.getStatus(key, false),
      );
    }
    return this.getStatus(key, true);
  }
}
