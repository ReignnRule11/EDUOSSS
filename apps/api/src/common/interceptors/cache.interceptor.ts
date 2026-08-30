import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  Logger,
  type NestInterceptor,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Request } from "express";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";

import { RedisService } from "../../database/redis.service";
import { CACHE_KEY, CACHE_TTL_KEY } from "../constants/decorator-keys.constant";
import { TenantContext } from "../context/tenant.context";

/**
 * Redis response cache for GET routes annotated with @Cacheable.
 * Keys are scoped by tenantId + userId + route + query, so cached data can
 * never leak across tenants or users.
 */
@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheInterceptor.name);
  private readonly defaultTtl: number;

  constructor(
    private readonly redis: RedisService,
    config: ConfigService,
  ) {
    this.defaultTtl = Number(config.get<number>("cacheTtlSeconds") ?? 60);
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: { sub?: string } }>();

    if (request.method !== "GET") {
      return next.handle();
    }

    const explicitKey = Reflect.getMetadata(CACHE_KEY, context.getHandler()) as
      string | undefined;
    if (explicitKey === undefined) {
      return next.handle();
    }
    const ttl =
      (Reflect.getMetadata(CACHE_TTL_KEY, context.getHandler()) as
        number | undefined) ?? this.defaultTtl;

    const key = this.buildKey(request, explicitKey);

    return new Observable<unknown>((subscriber) => {
      void this.redis
        .get(key)
        .then(async (cached) => {
          if (cached !== null) {
            subscriber.next(cached);
            subscriber.complete();
            return;
          }

          const source = next.handle().pipe(
            tap(async (value) => {
              if (value !== undefined && value !== null) {
                await this.redis.set(key, value, ttl);
              }
            }),
          );

          source.subscribe({
            next: (value) => {
              subscriber.next(value);
            },
            error: (error) => {
              subscriber.error(error);
            },
            complete: () => {
              subscriber.complete();
            },
          });
        })
        .catch((error) => {
          this.logger.warn(
            `CacheInterceptor error: ${(error as Error).message}`,
          );
          subscriber.error(error);
        });
    });
  }

  private buildKey(
    request: Request & { user?: { sub?: string } },
    explicitKey: string,
  ): string {
    const tenantId = TenantContext.getTenantId() ?? "no-tenant";
    const userId = request.user?.sub ?? "anon";
    const path = request.path;
    const query = this.serializeQuery(request.query);
    return `cache:${tenantId}:${userId}:${explicitKey}:${path}:${query}`;
  }

  private serializeQuery(query: Record<string, unknown>): string {
    const sortedKeys = Object.keys(query).sort();
    return sortedKeys.map((k) => `${k}=${String(query[k] ?? "")}`).join("&");
  }
}
