import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
  StreamableFile,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Response } from "express";
import { Observable, map } from "rxjs";

/**
 * Wraps every successful response in the ApiSuccess envelope.
 * - StreamableFile payloads (downloads) pass through untouched.
 * - 204 No Content responses send no body.
 * - Paginated results ({ items, meta }) are flattened so the pagination meta
 *   lands on the envelope level.
 */
@Injectable()
export class TransformInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const response = http.getResponse<Response>();

    return next.handle().pipe(
      map((payload: unknown) => {
        if (payload instanceof StreamableFile) {
          return payload;
        }
        if (response.statusCode === 204) {
          return undefined;
        }
        if (payload === undefined || payload === null) {
          return { success: true, data: null };
        }
        if (this.isPaginatedResult(payload)) {
          const { items, meta } = payload as {
            items: unknown[];
            meta: Record<string, unknown>;
          };
          return { success: true, data: items, meta };
        }
        return { success: true, data: payload };
      }),
    );
  }

  private isPaginatedResult(payload: unknown): boolean {
    if (typeof payload !== "object" || payload === null) return false;
    const candidate = payload as Record<string, unknown>;
    return (
      Array.isArray(candidate.items) &&
      typeof candidate.meta === "object" &&
      candidate.meta !== null
    );
  }
}
