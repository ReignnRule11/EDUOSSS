import { ErrorCode } from "@eduos/shared";
import { HttpStatus } from "@nestjs/common";

import { AppException } from "./app.exception";

export class ResourceNotFoundException extends AppException {
  constructor(resource: string, id?: string) {
    super({
      message: id
        ? `${resource} with id "${id}" was not found`
        : `${resource} was not found`,
      errorCode: ErrorCode.RESOURCE_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class ConflictResourceException extends AppException {
  constructor(message: string, details?: Record<string, unknown>) {
    super({
      message,
      errorCode: ErrorCode.CONFLICT,
      statusCode: HttpStatus.CONFLICT,
      details,
    });
  }
}

export class UnauthorizedOperationException extends AppException {
  constructor(message = "Authentication is required") {
    super({
      message,
      errorCode: ErrorCode.UNAUTHORIZED,
      statusCode: HttpStatus.UNAUTHORIZED,
    });
  }
}

export class ForbiddenOperationException extends AppException {
  constructor(message = "You do not have permission to perform this action") {
    super({
      message,
      errorCode: ErrorCode.FORBIDDEN,
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}

export class ValidationFailedException extends AppException {
  constructor(details: unknown[]) {
    super({
      message: "Validation failed",
      errorCode: ErrorCode.VALIDATION_FAILED,
      statusCode: HttpStatus.BAD_REQUEST,
      details,
    });
  }
}

export class BadRequestOperationException extends AppException {
  constructor(message: string, details?: Record<string, unknown>) {
    super({
      message,
      errorCode: ErrorCode.BAD_REQUEST,
      statusCode: HttpStatus.BAD_REQUEST,
      details,
    });
  }
}

export class InvalidCredentialsException extends AppException {
  constructor() {
    super({
      message: "Invalid email or password",
      errorCode: ErrorCode.INVALID_CREDENTIALS,
      statusCode: HttpStatus.UNAUTHORIZED,
    });
  }
}

export class AccountLockedException extends AppException {
  constructor(retryAfterSeconds: number) {
    super({
      message: "Too many failed sign-in attempts. Try again later.",
      errorCode: ErrorCode.ACCOUNT_LOCKED,
      statusCode: 423 as HttpStatus,
      details: { retryAfterSeconds },
    });
  }
}

export class EmailNotVerifiedException extends AppException {
  constructor() {
    super({
      message: "Please verify your email address before signing in",
      errorCode: ErrorCode.EMAIL_NOT_VERIFIED,
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}

export class InvalidTokenException extends AppException {
  constructor(message = "This link is invalid or has expired") {
    super({
      message,
      errorCode: ErrorCode.INVALID_TOKEN,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class InvalidMfaCodeException extends AppException {
  constructor() {
    super({
      message: "The security code you entered is invalid",
      errorCode: ErrorCode.MFA_INVALID,
      statusCode: HttpStatus.UNAUTHORIZED,
    });
  }
}
