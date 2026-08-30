/** Structured API response envelope for all successful responses. */
export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

/** Structured API error envelope returned by the global exception filter. */
export interface ApiErrorBody {
  success: false;
  statusCode: number;
  message: string;
  errorCode: string;
  details?: Record<string, unknown> | unknown[];
  path?: string;
  method?: string;
  timestamp: string;
  requestId: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiErrorBody;

export const ErrorCode = {
  VALIDATION_FAILED: "VALIDATION_FAILED",
  UNAUTHORIZED: "UNAUTHORIZED",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
  FORBIDDEN: "FORBIDDEN",
  RESOURCE_NOT_FOUND: "RESOURCE_NOT_FOUND",
  CONFLICT: "CONFLICT",
  RATE_LIMITED: "RATE_LIMITED",
  INTERNAL_SERVER_ERROR: "INTERNAL_SERVER_ERROR",
  BAD_REQUEST: "BAD_REQUEST",
  TENANT_NOT_FOUND: "TENANT_NOT_FOUND",
  TENANT_INACTIVE: "TENANT_INACTIVE",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  ACCOUNT_LOCKED: "ACCOUNT_LOCKED",
  EMAIL_NOT_VERIFIED: "EMAIL_NOT_VERIFIED",
  INVALID_TOKEN: "INVALID_TOKEN",
  MFA_INVALID: "MFA_INVALID",
  EMAIL_ALREADY_EXISTS: "EMAIL_ALREADY_EXISTS",
  FILE_TOO_LARGE: "FILE_TOO_LARGE",
  UNSUPPORTED_FILE_TYPE: "UNSUPPORTED_FILE_TYPE",
} as const;

export type ErrorCodeKey = (typeof ErrorCode)[keyof typeof ErrorCode];
