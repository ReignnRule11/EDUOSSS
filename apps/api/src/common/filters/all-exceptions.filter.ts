import { ErrorCode, type ApiErrorBody } from "@eduos/shared";
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Inject,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma } from "@prisma/client";
import type { Request, Response } from "express";

import { AppException } from "../exceptions/app.exception";
import { redactSensitiveQuery, redactUrl } from "../utils/log-redaction.util";

interface PrismaErrorMapping {
  statusCode: HttpStatus;
  errorCode: string;
  message: string;
}

const PRISMA_ERROR_MAP: Record<string, PrismaErrorMapping> = {
  P2002: {
    statusCode: HttpStatus.CONFLICT,
    errorCode: ErrorCode.CONFLICT,
    message: "A record with the same unique value already exists",
  },
  P2003: {
    statusCode: HttpStatus.BAD_REQUEST,
    errorCode: ErrorCode.BAD_REQUEST,
    message: "Referenced record does not exist",
  },
  P2025: {
    statusCode: HttpStatus.NOT_FOUND,
    errorCode: ErrorCode.RESOURCE_NOT_FOUND,
    message: "Record not found",
  },
  P2014: {
    statusCode: HttpStatus.BAD_REQUEST,
    errorCode: ErrorCode.BAD_REQUEST,
    message: "Invalid relation",
  },
  P2011: {
    statusCode: HttpStatus.BAD_REQUEST,
    errorCode: ErrorCode.BAD_REQUEST,
    message: "Null constraint violation",
  },
  P2000: {
    statusCode: HttpStatus.BAD_REQUEST,
    errorCode: ErrorCode.BAD_REQUEST,
    message: "Value too long for column",
  },
};

/**
 * Global exception filter.
 * Converts every exception into a stable ApiErrorBody envelope with a
 * status code, error code, requestId and optional validation details.
 * In production, internal server errors omit the detailed meta information
 * to prevent leaking sensitive implementation details.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  private readonly isProduction: boolean;

  constructor(@Inject(ConfigService) config: ConfigService) {
    this.isProduction = config.get<string>("nodeEnv") === "production";
  }

  catch(exception: unknown, ctx: ArgumentsHost): void {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { requestId?: string }>();
    const response = ctx.switchToHttp().getResponse<Response>();

    const body = this.buildBody(exception, request);
    this.logError(exception, request, body.statusCode);
    response.status(body.statusCode).json(body);
  }

  private buildBody(
    exception: unknown,
    request: Request & { requestId?: string },
  ): ApiErrorBody {
    const base: ApiErrorBody = {
      success: false,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: "An unexpected error occurred",
      errorCode: ErrorCode.INTERNAL_SERVER_ERROR,
      path: request.path,
      method: request.method,
      timestamp: new Date().toISOString(),
      requestId: request.requestId ?? "unknown",
    };

    if (exception instanceof AppException) {
      return {
        ...base,
        statusCode: exception.getStatus(),
        message: exception.message,
        errorCode: exception.errorCode,
        details: exception.details,
      };
    }

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      let message = exception.message;
      let details: unknown;

      if (typeof exceptionResponse === "object" && exceptionResponse !== null) {
        const res = exceptionResponse as {
          message?: string | string[];
          error?: string;
        };
        if (Array.isArray(res.message)) {
          message = "Validation failed";
          details = res.message;
        } else {
          message = res.message ?? exception.message;
        }
      }

      return {
        ...base,
        statusCode,
        message,
        errorCode:
          statusCode === HttpStatus.UNAUTHORIZED
            ? ErrorCode.UNAUTHORIZED
            : statusCode === HttpStatus.FORBIDDEN
              ? ErrorCode.FORBIDDEN
              : statusCode === HttpStatus.NOT_FOUND
                ? ErrorCode.RESOURCE_NOT_FOUND
                : statusCode === HttpStatus.TOO_MANY_REQUESTS
                  ? ErrorCode.RATE_LIMITED
                  : ErrorCode.BAD_REQUEST,
        details: details as Record<string, unknown> | unknown[] | undefined,
      };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const mapping = PRISMA_ERROR_MAP[exception.code];
      if (mapping) {
        return {
          ...base,
          statusCode: mapping.statusCode,
          message: mapping.message,
          errorCode: mapping.errorCode,
          details: {
            meta: this.isProduction ? undefined : exception.meta,
          },
        };
      }
      this.logger.error(`Unmapped Prisma error code: ${exception.code}`);
    }

    return base;
  }

  private logError(
    exception: unknown,
    request: Request & { requestId?: string; originalUrl?: string },
    statusCode: number,
  ): void {
    // Redact sensitive query values (tokens, endpoints, keys) from the logged
    // path AND the exception message so they never leak into logs.
    const rawMessage = (exception as Error).message ?? String(exception);
    if (statusCode >= 500) {
      this.logger.error(
        `${request.method} ${redactUrl(request.originalUrl ?? request.path ?? request.url ?? "")} [${request.requestId ?? "-"}] -> ${statusCode}: ${redactSensitiveQuery(rawMessage)}`,
        (exception as Error).stack,
      );
    } else {
      this.logger.warn(
        `${request.method} ${redactUrl(request.originalUrl ?? request.path ?? request.url ?? "")} [${request.requestId ?? "-"}] -> ${statusCode}: ${redactSensitiveQuery(rawMessage)}`,
      );
    }
  }
}
