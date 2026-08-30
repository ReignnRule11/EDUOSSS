import { applyDecorators, SetMetadata } from "@nestjs/common";

import { CACHE_KEY, CACHE_TTL_KEY } from "../constants/decorator-keys.constant";

export interface CacheOptions {
  /** Explicit cache key. Defaults to a key derived from route + query. */
  key?: string;
  /** TTL in seconds. Overrides the global default. */
  ttl?: number;
}

/** Enables Redis response caching for a route via CacheInterceptor. */
export const Cacheable = (
  options?: CacheOptions,
): MethodDecorator & ClassDecorator => {
  return applyDecorators(
    SetMetadata(CACHE_KEY, options?.key),
    SetMetadata(CACHE_TTL_KEY, options?.ttl),
  );
};
