import { Injectable, Logger, type NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";

import { redactUrl } from "../utils/log-redaction.util";

/**
 * Structured access logging.
 * Logs one line per request with method, path (query values for sensitive keys
 * redacted), status code, duration, and requestId once the response finishes.
 * Levels: 5xx -> error, 4xx -> warn, everything else -> log (sampled in prod).
 */
@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger("HTTP");
  /** Log every request in non-production; sample in production. */
  private readonly sampleRate: number;

  constructor() {
    this.sampleRate = process.env.NODE_ENV === "production" ? 0.1 : 1;
  }

  use(req: Request, res: Response, next: NextFunction): void {
    const started = Date.now();

    res.on("finish", () => {
      if (Math.random() > this.sampleRate) return;
      const duration = Date.now() - started;
      const requestId = (req as Request & { requestId?: string }).requestId;
      const entry = {
        method: req.method,
        path: redactUrl(req.originalUrl ?? req.url ?? ""),
        status: res.statusCode,
        durationMs: duration,
        requestId: requestId ?? "-",
        ip: req.ip,
      };
      const line = `${entry.method} ${entry.path} [${entry.requestId}] -> ${entry.status} (${entry.durationMs}ms)`;
      if (res.statusCode >= 500) {
        this.logger.error(line, JSON.stringify(entry));
      } else if (res.statusCode >= 400) {
        this.logger.warn(line);
      } else {
        this.logger.log(line);
      }
    });

    next();
  }
}
