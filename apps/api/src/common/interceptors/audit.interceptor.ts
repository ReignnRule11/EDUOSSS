import type { AuditAction } from "@eduos/shared";
import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  Logger,
  type NestInterceptor,
} from "@nestjs/common";
import type { Request } from "express";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";

import { PrismaService } from "../../database/prisma.service";
import {
  AUDIT_ACTION_KEY,
  AUDIT_RESOURCE_KEY,
  SKIP_AUDIT_KEY,
} from "../constants/decorator-keys.constant";
import { TenantContext } from "../context/tenant.context";

/**
 * Persists an audit entry after a successful mutation annotated with @Audited.
 * Captures actor, tenant, action, resource, IP and user-agent.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const handler = context.getHandler();

    if (Reflect.getMetadata(SKIP_AUDIT_KEY, handler) === true) {
      return next.handle();
    }

    const action = Reflect.getMetadata(AUDIT_ACTION_KEY, handler) as
      AuditAction | undefined;
    if (!action) {
      return next.handle();
    }
    const resource = Reflect.getMetadata(AUDIT_RESOURCE_KEY, handler) as
      string | undefined;

    const request = context
      .switchToHttp()
      .getRequest<
        Request & { user?: { sub?: string; email?: string; role?: string } }
      >();

    const resolveResourceId =
      (Reflect.getMetadata("auditResourceIdResolver", handler) as
        ((req: Request, res: unknown) => string | null) | undefined) ??
      ((req: Request) => (req.params["id"] as string) ?? null);

    return next.handle().pipe(
      tap({
        next: (response) => {
          this.writeLog(action, resource, request, response, resolveResourceId);
        },
      }),
    );
  }

  private writeLog(
    action: AuditAction,
    resource: string | undefined,
    request: Request & {
      user?: { sub?: string; email?: string; role?: string };
    },
    response: unknown,
    resolveResourceId: (req: Request, res: unknown) => string | null,
  ): void {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) return;

    const user = request.user;
    const resourceId = resolveResourceId(request, response);

    void this.prisma.auditLog
      .create({
        data: {
          tenantId,
          actorId: user?.sub ?? null,
          actorEmail: user?.email ?? null,
          role: user?.role ?? null,
          action,
          resource: resource ?? request.path,
          resourceId,
          ipAddress: request.ip ?? null,
          userAgent: request.headers["user-agent"] ?? null,
        },
      })
      .catch((error) => {
        this.logger.warn(`Audit write failed: ${(error as Error).message}`);
      });
  }
}
