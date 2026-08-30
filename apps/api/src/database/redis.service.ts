import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

const NAMESPACE_SEPARATOR = ":";

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;
  private readonly namespace: string;

  constructor(config: ConfigService) {
    this.namespace = config.get<string>("nodeEnv") ?? "development";
    this.client = new Redis(config.getOrThrow<string>("redisUrl"), {
      lazyConnect: false,
      maxRetriesPerRequest: 1,
      enableReadyCheck: true,
      retryStrategy: (times) => Math.min(times * 200, 2000),
    });

    this.client.on("error", (error) => {
      this.logger.warn(`Redis connection error: ${error.message}`);
    });
    this.client.on("connect", () => {
      this.logger.log("Redis connected");
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.client.ping();
    } catch (error) {
      this.logger.warn(
        `Redis unavailable at startup: ${(error as Error).message}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    this.client.disconnect();
  }

  isReady(): boolean {
    return this.client.status === "ready";
  }

  private key(key: string): string {
    return `${this.namespace}${NAMESPACE_SEPARATOR}${key}`;
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    try {
      const raw = await this.client.get(this.key(key));
      if (raw === null || raw === undefined) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    try {
      const raw = JSON.stringify(value);
      if (ttlSeconds && ttlSeconds > 0) {
        await this.client.set(this.key(key), raw, "EX", ttlSeconds);
      } else {
        await this.client.set(this.key(key), raw);
      }
    } catch (error) {
      this.logger.warn(
        `Redis set failed for ${key}: ${(error as Error).message}`,
      );
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.client.del(this.key(key));
    } catch (error) {
      this.logger.warn(
        `Redis delete failed for ${key}: ${(error as Error).message}`,
      );
    }
  }

  async deleteByPattern(pattern: string): Promise<void> {
    try {
      const keys = await this.client.keys(this.key(pattern));
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
    } catch (error) {
      this.logger.warn(
        `Redis pattern delete failed for ${pattern}: ${(error as Error).message}`,
      );
    }
  }

  async ping(): Promise<boolean> {
    try {
      const pong = await this.client.ping();
      return pong === "PONG";
    } catch {
      return false;
    }
  }

  getClient(): Redis {
    return this.client;
  }
}
