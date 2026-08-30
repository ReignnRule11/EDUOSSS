import { HttpException, HttpStatus } from "@nestjs/common";

export interface AppExceptionPayload {
  message: string;
  errorCode: string;
  details?: Record<string, unknown> | unknown[];
  statusCode?: HttpStatus;
}

/**
 * Base application exception carrying a stable machine-readable error code.
 * The global exception filter serializes these into the ApiErrorBody envelope.
 */
export class AppException extends HttpException {
  readonly errorCode: string;
  readonly details?: Record<string, unknown> | unknown[];

  constructor(payload: AppExceptionPayload) {
    super(payload.message, payload.statusCode ?? HttpStatus.BAD_REQUEST);
    this.errorCode = payload.errorCode;
    this.details = payload.details;
  }
}
