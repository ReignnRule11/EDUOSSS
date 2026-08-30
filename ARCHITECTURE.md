# Architecture

This document describes the high-level architecture, cross-cutting concerns and
operational model of EduOS. It is aimed at developers extending the platform.

## 1. Runtime topology

```
Browser (Next.js App Router)  ── /api/v1 proxy ──▶  NestJS API
                                                        │
                                        ┌───────────────┼───────────────┐
                                        ▼               ▼               ▼
                                    PostgreSQL      Redis          Object storage
                                  (Prisma ORM)    (cache)       (local / S3)
```

- The API is the only system of record. The web app renders server-side and
  calls the API through a reverse proxy in development and a reverse proxy /
  CDN in production.
- PostgreSQL is the source of truth; Prisma is the ORM and migration tool.
- Redis backs the `@Cacheable` response cache and any future queue work.
- File uploads go through `STORAGE_DRIVER` (local disk or S3-compatible).

## 2. Request lifecycle

```
Request
  └─ RequestLoggingMiddleware     attach requestId + log status/duration
      └─ TenantContextMiddleware  resolve tenant, set AsyncLocalStorage store
          └─ Guards               JwtAuth → Tenant → Roles → Permissions
              └─ Interceptors     Transform → Cache → Audit
                  └─ Controller → Service → Prisma (tenant-scoped client)
                      └─ AllExceptionsFilter   normalize any error to ApiErrorBody
```

### Tenant isolation (critical)

- Every tenant-scoped model has a `tenantId` column and is registered in
  `TENANT_SCOPED_MODELS` (`src/database/tenant-isolation.extension.ts`).
- The Prisma client extension injects `tenantId` into every read/write on these
  models automatically. Isolation never depends on caller discipline.
- Tenant resolution happens once per request via header, custom domain or
  subdomain (`TenantResolverService`), stored in AsyncLocalStorage.
- **Rule**: when adding a new model, always add its `tenantId` field, its
  back-relation on `Tenant`, and register it in `TENANT_SCOPED_MODELS`.

## 3. Permissions & roles

- All permission keys live in `packages/shared/src/constants/permissions.ts`.
- Roles map to permission arrays in `ROLE_PERMISSIONS`. New permissions must be
  added to the `Permission` object and to the relevant role arrays.
- The `@Permissions(...)` decorator is enforced by `PermissionsGuard`. Existing
  sessions keep their old JWT permissions until they sign in again.
- Role arrays are shared as spread groups (e.g. `CBT_ADMIN_PERMISSIONS`,
  `FINANCE_ADMIN_PERMISSIONS`) so a permission can be granted consistently.

## 4. Error handling & validation

- The global `AllExceptionsFilter` converts anything into the stable
  `ApiErrorBody` envelope: `{ success, statusCode, errorCode, message, path,
  method, timestamp, requestId, details? }`.
- Prisma errors (P2002 unique, P2025 not found, etc.) map to friendly HTTP
  errors; raw driver metadata is hidden in production.
- Services throw `AppException` subclasses (e.g. `ResourceNotFoundException`,
  `BadRequestOperationException`) rather than generic errors.
- DTOs use class-validator with the global `ValidationPipe`
  (`whitelist: true`, `forbidNonWhitelisted: true`) — every accepted field must
  be declared in a DTO.

## 5. Caching strategy

- Read-only GET routes opt in via `@Cacheable({ ttl })`.
- `CacheInterceptor` builds keys as `cache:<tenantId>:<userId>:<key>:<path>:<query>`,
  so cached responses can never cross tenant or user boundaries.
- Choose `ttl` relative to data freshness. Short (15–30s) for frequently
  changing data (payments, results); longer (60s+) for reference data.
- Do not cache per-user attempt/results payloads aggressively; prefer short TTLs
  or bypass caching where correctness matters.

## 6. Logging & observability

- `RequestLoggingMiddleware` emits one structured line per request (method,
  path, status, duration, requestId). In production it samples to 10%.
- Errors >= 500 are logged with stack traces, correlated by `requestId`.
- `@Audited({ action, resource })` persists audit entries for mutations.
- Structured fields are emitted as JSON on error lines for ingestion into
  log aggregators.

## 7. Testing

- Unit tests live next to the code as `*.spec.ts` (jest + ts-jest).
- Pure business logic (marking, grade computation, finance math, pagination) is
  extracted into `*.util.ts` modules so it can be tested without a database.
- Run `npm test` in `apps/api`. E2E tests are planned under `test/`.
- The `apps/api/tsconfig.json` excludes `*.spec.ts` from the build.

## 8. Adding a new feature module

1. Schema: add models + indexes to `prisma/schema.prisma`, add back-relations on
   `Tenant`/related models, then `npx prisma migrate dev`.
2. Register the model in `TENANT_SCOPED_MODELS`.
3. Add permissions to `packages/shared` and rebuild it (`npm run build`).
4. Create `apps/api/src/modules/<name>` with `controller/service/module` + `dto/`.
5. Register the module in `apps/api/src/app.module.ts`.
6. Add a `@Permissions` guard on every route, `@Audited` on mutations, and
   `@Cacheable` on cheap GETs.
7. Build/lint/typecheck: `npm run build && npm run lint && npm run typecheck`.
8. Smoke-test each endpoint with curl and add unit tests for any pure logic.
9. Add web pages under `apps/web/src/app/dashboard/<name>` and a nav entry in
   `apps/web/src/app/dashboard/layout.tsx`.

## 9. Web conventions

- Client pages are `"use client"` and use `api.get/post/...` from `@/lib/api`.
- Reusable UI lives in `apps/web/src/components/ui`.
- Theme (dark/light) is managed by `ThemeProvider` in `@/lib/theme`.
- Heavy visualizations should be lazy-loaded with `next/dynamic`.
- Route-level code splitting is automatic in Next.js App Router.

## 10. Deployment notes

- Migrations: run `npx prisma migrate deploy` before releasing a new schema.
- Build order: `packages/shared` → `apps/api` → `apps/web`.
- Never store secrets in the repo; tenants configure their own integration keys
  (AI provider, payment gateway, VAPID) via the dashboard, stored in
  `tenant.settings`.
