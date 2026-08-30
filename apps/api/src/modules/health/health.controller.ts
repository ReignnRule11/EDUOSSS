import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { HealthCheck, HealthCheckService } from "@nestjs/terminus";

import { DatabaseHealthIndicator } from "./database-health.indicator";
import { RedisHealthIndicator } from "./redis-health.indicator";
import { Public } from "../../common/decorators/public.decorator";

@ApiTags("Health")
@Controller("health")
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly database: DatabaseHealthIndicator,
    private readonly redis: RedisHealthIndicator,
  ) {}

  @Public()
  @Get()
  @HealthCheck()
  @ApiOperation({ summary: "Liveness + readiness probe (DB + Redis)" })
  check() {
    return this.health.check([
      () => this.database.isHealthy("database"),
      () => this.redis.isHealthy("redis"),
    ]);
  }

  @Public()
  @Get("live")
  @ApiOperation({ summary: "Liveness probe (process is up)" })
  live() {
    return {
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get("ready")
  @HealthCheck()
  @ApiOperation({ summary: "Readiness probe (dependencies reachable)" })
  ready() {
    return this.health.check([
      () => this.database.isHealthy("database"),
      () => this.redis.isHealthy("redis"),
    ]);
  }
}
