# EduOS

EduOS is a multi-tenant school management platform. It combines a NestJS REST API, a Next.js web application (public school site plus authenticated dashboard), PostgreSQL, Redis, and local or S3-compatible object storage.

This README describes the **current** repository. It does not invent files, commands, modules, or environment variables. Operational detail lives in `DEPLOYMENT.md`. Architecture and extension guidance live in `ARCHITECTURE.md`.

## Table of Contents

- [Overview](#overview)
- [Core Capabilities](#core-capabilities)
- [Architecture](#architecture)
- [Repository Structure](#repository-structure)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database](#database)
- [API](#api)
- [Web Application](#web-application)
- [Docker](#docker)
- [Testing](#testing)
- [CI/CD](#cicd)
- [Security Notes](#security-notes)
- [Related Documentation](#related-documentation)

## Overview

EduOS is an enterprise school information system for K-12 and similar institutions. A single deployment can host multiple school tenants. Each tenant has its own users, schools, students, staff, academics, finance, and files. Tenant isolation is enforced in the API (middleware, guards, and a Prisma client extension that injects `tenantId` on tenant-scoped models).

**Who uses it**

| Role | Typical access |
| ---- | -------------- |
| Super admin | Platform tenant catalog |
| Tenant / school admin, principal, vice principal, admin staff | School administration, records, results, reports |
| Teacher | Classes, attendance, grades, LMS, CBT, leave |
| Bursar | Fees, invoices, payments |
| Librarian | Role exists in RBAC; there is no library module in this repository |
| Student | LMS, exams, own academic data (permission-scoped) |
| Parent | Parent portal: children, attendance, results, payments, messages |

**Multi-tenancy**

- Tenants are identified by slug, custom domain (`TenantDomain`), or subdomain.
- Resolution modes default to `header,domain,subdomain` (`TENANT_RESOLUTION_MODES`).
- The web client sends `X-Tenant-Id` (tenant slug) on API requests.
- Users can belong to multiple tenants (`UserTenant`) and switch tenant context via `POST /api/v1/auth/switch-tenant`.
- Public onboarding creates a tenant, admin user, school, and membership atomically (`POST /api/v1/tenants/onboarding`).

**Production-readiness status**

The repository includes production Dockerfiles (non-root runtime), Compose services with healthchecks, Prisma migrations applied via a one-shot `migrate` service, fail-fast production config checks, rate limiting, Helmet, CORS allowlists, JWT access/refresh tokens, optional MFA, audit logging, liveness/readiness probes, unit tests, security e2e tests, and a GitHub Actions CI workflow.

This README does not claim a live production deployment, SLA, or high-availability topology beyond what is in `docker-compose.yml` and `DEPLOYMENT.md`.

**First-tenant / demo context**

- The public marketing site in `apps/web/src/site` is branded as **Bright Future Academy**.
- `apps/api/prisma/seed.ts` seeds tenant `bright-future-academy` (school code `BFA`) as the primary demo tenant, plus `sunrise-international` to demonstrate isolation.
- Seed admin email/password come from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` (see `.env.example`). Production seed refuses default credentials.

## Core Capabilities

Only modules that exist under `apps/api/src/modules` and corresponding dashboard/public routes are listed.

### Authentication and identity

- Login, self-registration (student/parent), JWT access + refresh rotation
- Forgot/reset password, email verification, change password
- Optional TOTP MFA with backup codes
- Session listing and revocation
- Account lockout after failed logins
- Tenant switching

### Multi-tenancy and platform admin

- Tenant CRUD (super admin)
- Public tenant onboarding
- Current-tenant settings (`/api/v1/tenant`)
- Custom domains, plans, enabled modules, storage quota fields on `Tenant`

### School administration

- Schools, academic sessions, terms, departments
- Classes (`ClassGroup`), subjects, class-subject assignments
- Enrollments, timetable slots, announcements
- Users with RBAC roles and fine-grained permissions (`packages/shared`)

### Student information

- Student records, guardians, medical records, discipline records
- Student documents, transfers, promotions
- Student timeline events

### Staff / teacher management

- Teacher records
- Qualifications, employment history, attendance, performance reviews
- Leave requests (including approval), salaries, documents

### Attendance

- Daily student attendance
- Teacher attendance
- QR attendance
- Insights, reports/export, parent notification logs / alerts

### Grades and result processing

- Subject grades
- Custom grading scales
- Term results, subject scores, approval/publish flow
- Broadsheet, report cards, transcripts
- Result insights

### Computer-based testing (CBT)

- Question categories and question bank
- Exams, exam questions, random pick
- Attempts, marking, analytics

### Learning management (LMS)

- Courses, lessons, enrollments, lesson progress
- Assignments and homework (with submissions/grading)
- Course forum
- Live classes and recorded sessions
- Certificates

### Finance

- Fee structures, invoices (including class generation)
- Payments, receipts
- Outstanding fees
- Discounts and scholarships
- Finance analytics and gateway config endpoints

### Parent portal

- Linked children dashboards
- Attendance, results, assignments, payments
- Teacher messages and announcements
- Per-child notifications

### Files and storage

- Authenticated upload/download (`/api/v1/files`)
- Drivers: local disk or S3-compatible (`STORAGE_DRIVER`)
- Production serves private objects through the download endpoint only; `/storage` static serving is development-only

### Notifications and communications

- SMTP mail (verification, password reset)
- Web push subscriptions (`/api/v1/push`)
- Announcements by audience

### AI services (tenant-configured)

- Lesson planner, question generator, report comments, tutor, recommendations
- Prompt templates and usage logs
- Provider keys are expected in tenant settings, not in this repo

### Insights, audit, health

- Enterprise dashboards (overview, admissions, enrollment, revenue, attendance, academic performance)
- Aggregate reports
- Audit log query API and dashboard
- Health: `/api/v1/health`, `/live`, `/ready` (PostgreSQL + Redis)

### Public website (first tenant presentation)

Unauthenticated pages: home, about, admissions, academics, gallery, news, events, FAQ, contact, apply, plus login / forgot / reset / verify-email. Content is static in `apps/web/src/site`. PWA assets: `public/manifest.json`, `public/sw.js`.

**Not implemented as a module:** library circulation. `LIBRARY_READ` / `LIBRARY_WRITE` exist as permission keys and `library` may appear in `enabledModules`, but there is no library API module.

## Architecture

```text
User
  |
  v
Web application (Next.js, port 3000)
  |  /api/* rewrite
  v
API (NestJS, port 3001, prefix api/v1)
  |
  +--> PostgreSQL (Prisma ORM + migrations)
  +--> Redis (response cache, resolver cache)
  +--> Object storage (local disk or S3/MinIO)
```

| Component | Purpose |
| --------- | ------- |
| **Web** (`apps/web`) | Public school site and authenticated dashboard. In development and Docker, Next.js rewrites `/api/:path*` to the API (`API_URL`, default `http://localhost:3001`). |
| **API** (`apps/api`) | System of record. JWT auth, tenant isolation, RBAC, validation, audit, caching, file I/O. |
| **PostgreSQL** | Source of truth. Schema in `apps/api/prisma/schema.prisma`. |
| **Redis** | Cache (`@Cacheable`) and tenant-resolver cache. API still serves if Redis is down; caching is skipped. Readiness fails if Redis is unreachable. |
| **Object storage** | Uploaded files. Local driver for development; S3-compatible (Compose includes MinIO) for production-style runs. |

Request path (from `ARCHITECTURE.md`, matching `app.module.ts`):

```text
Request
  -> RequestLoggingMiddleware
  -> TenantContextMiddleware
  -> Guards: Throttler -> JwtAuth -> Tenant -> Roles -> Permissions
  -> Interceptors: Transform -> Cache -> Audit
  -> Controller / Service / Prisma
  -> AllExceptionsFilter
```

Shared contracts (roles, permissions, API envelope types) live in `packages/shared`. Lint/tsconfig presets live in `packages/config`. Turborepo (`turbo.json`) orchestrates `build`, `lint`, `typecheck`, `dev`, and `test`.

## Repository Structure

```text
EDUOSSS/
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   ├── common/          # guards, filters, interceptors, middleware
│   │   │   ├── config/          # configuration.ts, env.validation.ts
│   │   │   ├── database/        # Prisma, Redis, tenant isolation extension
│   │   │   ├── modules/         # feature modules (see list below)
│   │   │   ├── storage/         # local + S3 drivers
│   │   │   ├── app.module.ts
│   │   │   └── main.ts
│   │   ├── prisma/
│   │   │   ├── migrations/      # 20 dated Prisma migrations
│   │   │   ├── schema.prisma
│   │   │   └── seed.ts
│   │   ├── test/                # security / production-security e2e
│   │   ├── Dockerfile
│   │   ├── jest.config.js
│   │   ├── nest-cli.json
│   │   ├── package.json
│   │   └── .env.example
│   │
│   └── web/
│       ├── src/
│       │   ├── app/             # App Router: public pages + /dashboard
│       │   ├── components/      # ui, site, charts
│       │   ├── lib/             # api client, auth, theme
│       │   └── site/            # Bright Future Academy content
│       ├── public/              # PWA, icons, site SVGs
│       ├── Dockerfile
│       ├── next.config.mjs
│       ├── package.json
│       └── .env.example
│
├── packages/
│   ├── config/                  # ESLint, Prettier, tsconfig presets
│   └── shared/                  # roles, permissions, enums, API types
│
├── .github/
│   └── workflows/
│       └── ci.yml
│
├── .dockerignore
├── .env.example
├── .gitignore
├── ARCHITECTURE.md
├── DEPLOYMENT.md
├── docker-compose.yml
├── package.json
├── package-lock.json
├── turbo.json
└── README.md
```

API feature modules under `apps/api/src/modules/`:

```text
academic-sessions, ai, announcements, attendance, audit, auth,
cbt-attempts, cbt-exams, cbt-questions, classes, course-assignments,
course-certificates, course-enrollments, course-forum, course-homework,
course-lessons, course-live-classes, course-recorded-sessions, courses,
departments, discipline-records, enrollments, enterprise-dashboards,
files, finance, grades, guardians, health, mail, medical-records,
parent-portal, push, reports, result-processing, schools,
student-documents, student-promotions, student-transfers, students,
subjects, teacher-attendance, teacher-documents,
teacher-employment-history, teacher-leave-requests,
teacher-performance-reviews, teacher-qualifications, teacher-salaries,
teachers, tenants, terms, timeline, timetable, users
```

There is **no** `scripts/` directory in this repository. Backup/restore commands described in `DEPLOYMENT.md` are operational guidance; those shell files are not shipped here.

## Tech Stack

| Layer | Stack |
| ----- | ----- |
| Monorepo | npm workspaces, Turborepo 2, Node `>=20`, npm `>=10` |
| API | NestJS 10, Prisma 5, PostgreSQL 16, Passport JWT, Joi, class-validator, Helmet, Throttler, Terminus, Swagger |
| Web | Next.js 14 App Router, React 18, Tailwind CSS, lucide-react |
| Cache | Redis 7, ioredis |
| Storage | Local filesystem or AWS SDK S3 (MinIO in Compose) |
| Mail / push | nodemailer, web-push |
| Tests | Jest, ts-jest, Supertest (API) |

## Prerequisites

- Node.js 20 or later
- npm 10 or later
- PostgreSQL 16 (local or Docker)
- Redis 7 (local or Docker)
- Optional: Docker + Docker Compose for the full stack (Postgres, Redis, MinIO, migrate, API, web)

## Getting Started

### 1. Install dependencies

```bash
npm ci
```

### 2. Environment files

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

Set `DATABASE_URL`, `JWT_ACCESS_SECRET`, and `JWT_REFRESH_SECRET` before starting the API. Use your own secrets; do not commit `.env` files.

### 3. Database

With PostgreSQL running and `DATABASE_URL` set:

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

`db:migrate` runs `prisma migrate dev` in `@eduos/api`. For a disposable schema without migration history, `apps/api` also defines `db:push` (`prisma db push`) — do not use that against production.

### 4. Run locally

```bash
npm run dev
```

This runs workspace `dev` tasks in parallel via Turbo.

- Web: `http://localhost:3000` (`next dev`)
- API: `http://localhost:3001/api/v1` (`nest start --watch` via the API workspace)
- Swagger (when `SWAGGER_ENABLED` is true, default in non-production): `http://localhost:3001/docs`

Log in with the seeded admin (`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`) and tenant slug `bright-future-academy`.

### Useful root scripts

| Script | Action |
| ------ | ------ |
| `npm run build` | `turbo run build` |
| `npm run dev` | `turbo run dev --parallel` |
| `npm run lint` | `turbo run lint` |
| `npm run typecheck` | `turbo run typecheck` |
| `npm run format` | Prettier write on `ts/tsx/js/json/md` |
| `npm run db:generate` | Prisma client generate |
| `npm run db:migrate` | Prisma migrate dev |
| `npm run db:seed` | Seed demo tenants |
| `npm run db:studio` | Prisma Studio |
| `npm run docker:up` | `docker compose up -d --build` |
| `npm run docker:down` | `docker compose down` |

## Environment Variables

Never commit real secrets. Values below are placeholders.

### Root `.env.example` (Compose / shared)

| Variable | Purpose |
| -------- | ------- |
| `NODE_ENV` | `development` / `production` / `test` |
| `API_PORT` | Documented API port (Compose/API process use `PORT`, default 3001) |
| `API_GLOBAL_PREFIX` | HTTP prefix, default `api/v1` |
| `CORS_ORIGINS` | Comma-separated origins |
| `WEB_PORT` | Documented web port (Next defaults to 3000) |
| `POSTGRES_DB` / `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_PORT` | Compose Postgres |
| `DATABASE_URL` | PostgreSQL DSN |
| `REDIS_PORT` / `REDIS_URL` | Redis |
| `CACHE_TTL_SECONDS` | Default cache TTL |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | JWT signing keys |
| `JWT_ACCESS_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` | Token lifetimes |
| `THROTTLE_*` | Rate limits |
| `STORAGE_DRIVER` | `local` or `s3` |
| `S3_ENDPOINT` / `S3_REGION` / `S3_BUCKET` / `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` / `S3_FORCE_PATH_STYLE` | Object storage |
| `STORAGE_LOCAL_ROOT` | Local upload directory |
| `SWAGGER_ENABLED` / `SWAGGER_PATH` | OpenAPI UI |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | Seed admin |

### API (`apps/api/.env.example` and `configuration.ts`)

Additional API variables:

| Variable | Purpose |
| -------- | ------- |
| `PORT` | Listen port (code default 3001). This is what `main.ts` reads. |
| `TRUST_PROXY` | Set `true` only behind a trusted reverse proxy |
| `REDIS_PASSWORD` | Optional; Compose enables `--requirepass` when set |
| `AUTH_REQUIRE_EMAIL_VERIFICATION` | Required `true` in production |
| `AUTH_MAX_LOGIN_ATTEMPTS` / `AUTH_LOCKOUT_MS` | Lockout policy |
| `PASSWORD_RESET_TTL_SECONDS` / `EMAIL_VERIFY_TTL_SECONDS` | Token TTL |
| `MFA_ENABLED` / `MFA_ISSUER` / `MFA_WINDOW_SECONDS` / `MFA_BACKUP_CODE_COUNT` | MFA |
| `AUTH_PUBLIC_BASE_URL` | Links in email |
| `EMAIL_FROM` / `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_SECURE` | Mail |
| `TENANT_RESOLUTION_MODES` | Default `header,domain,subdomain` (code; not in `.env.example`) |
| `PLATFORM_APEX_DOMAINS` | Default `monkeycode-ai.live` (code; not in `.env.example`) |

Production bootstrap (`validateProductionConfig`) refuses to start if:

- JWT secrets are missing, shorter than 32 characters, equal, or known dev defaults
- `CORS_ORIGINS` is empty or `*`
- `STORAGE_DRIVER=s3` with `minioadmin` credentials
- `AUTH_REQUIRE_EMAIL_VERIFICATION=false`

`DATABASE_URL`, `JWT_ACCESS_SECRET`, and `JWT_REFRESH_SECRET` are required by Joi at startup.

### Web (`apps/web/.env.example`)

| Variable | Purpose |
| -------- | ------- |
| `NEXT_PUBLIC_API_URL` | Browser API base (default `/api/v1` in code if unset) |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL for metadata |
| `API_URL` | Server-side rewrite target (default `http://localhost:3001`; Compose sets `http://api:3001`) |

## Database

- Provider: PostgreSQL (`datasource` in `schema.prisma`)
- ORM: Prisma
- Migrations: `apps/api/prisma/migrations/` (lock file `migration_lock.toml`, provider `postgresql`)
- Seed: `apps/api/prisma/seed.ts`

Production must use:

```bash
npx prisma migrate deploy --schema apps/api/prisma/schema.prisma
```

or:

```bash
docker compose run --rm migrate
```

Do not run `prisma db push` or `prisma migrate reset` against production. See `DEPLOYMENT.md`.

## API

- Package: `@eduos/api`
- Global prefix: `api/v1`
- Auth: `Authorization: Bearer <access-token>`
- Tenant: `X-Tenant-Id: <tenant-slug>` (and/or domain/subdomain)
- Responses: `{ success, data, meta? }` or the error envelope in `packages/shared` (`ApiErrorBody`)

Selected route prefixes (all under `/api/v1`):

| Prefix | Area |
| ------ | ---- |
| `/auth` | Authentication |
| `/tenants`, `/tenants/onboarding`, `/tenant` | Tenancy |
| `/users`, `/schools`, `/students`, `/teachers` | Directory |
| `/classes`, `/subjects`, `/enrollments` | Academics |
| `/academic-sessions`, `/terms`, `/departments`, `/timetable` | School admin |
| `/attendance`, `/grades` | Attendance and grades |
| `/result-scales`, `/term-results`, `/result-insights`, `/transcripts` | Results |
| `/exams`, `/questions`, `/question-categories`, `/attempts` | CBT |
| `/courses/...` | LMS |
| `/finance`, `/finance/fee-structures`, `/finance/invoices` | Finance |
| `/parent` | Parent portal |
| `/files` | Storage |
| `/ai` | AI services |
| `/push` | Web push |
| `/audit-logs` | Audit |
| `/enterprise-dashboards`, `/reports` | Insights |
| `/health`, `/health/live`, `/health/ready` | Probes |

Workspace scripts: `start:dev`, `start:prod` (`node dist/main.js`), `lint`, `typecheck`, `test`, `test:e2e`, `db:*`.

## Web Application

- Package: `@eduos/web`
- Next.js rewrites `/api/:path*` to `${API_URL}/api/:path*`
- Dashboard is client-side (`"use client"`) and uses `apps/web/src/lib/api.ts`
- Unauthenticated visitors are redirected from `/dashboard` to `/login`

Dashboard areas: overview, users, security, school admin, students/teachers, guardians/transfers/promotions, attendance, LMS, CBT, results, finance, parent portal, analytics, reports, settings, AI.

## Docker

`docker-compose.yml` project name: `eduos`.

| Service | Image / build | Ports |
| ------- | ------------- | ----- |
| `postgres` | `postgres:16-alpine` | 5432 |
| `redis` | `redis:7-alpine` (AOF; password if `REDIS_PASSWORD` set) | 6379 |
| `minio` | `minio/minio` | 9000, 9001 |
| `minio-init` | `minio/mc` | creates bucket |
| `migrate` | `apps/api/Dockerfile`, `npx prisma migrate deploy` | one-shot |
| `api` | `apps/api/Dockerfile`, `node dist/main.js` | 3001 |
| `web` | `apps/web/Dockerfile`, `npx next start -p 3000` | 3000 |

API waits for successful migrate + healthy Redis/MinIO. Web waits for a healthy API. Images run as user `node`.

```bash
npm run docker:up
```

Compose interpolates `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` with no defaults — set them in the environment. Production must not use default MinIO credentials.

## Testing

API unit tests (`*.spec.ts`): pagination, log redaction, CBT marking, result computation, finance computation.

```bash
npm test -w @eduos/api
```

E2E (Jest + Supertest; needs migrated/seeded Postgres + Redis):

```bash
npm run test:e2e -w @eduos/api
```

Files: `apps/api/test/security.e2e-spec.ts`, `high-security.e2e-spec.ts`, `production-security.e2e-spec.ts`.

There is no web test script in `apps/web/package.json`.

## CI/CD

`.github/workflows/ci.yml` on `push` to `main`/`master` and on `pull_request`:

1. **validate** — matrix `api` / `web`: `npm ci`, build `@eduos/shared`, lint, typecheck, build
2. **unit-tests** — Prisma generate + `npm test -w @eduos/api`
3. **e2e-security** — Postgres 16 + Redis 7 services, migrate, seed, `test:e2e`
4. **docker** — `docker build` for `apps/api/Dockerfile` and `apps/web/Dockerfile`

There is no deploy job in this workflow.

## Security Notes

- Do not commit `.env`, credentials, or private keys (see `.gitignore`).
- Production JWT secrets must be distinct and at least 32 characters.
- CORS must be an explicit origin list.
- Rate limiting is in-process; multiple API replicas need edge limiting or shared throttler storage (`DEPLOYMENT.md`).
- File downloads are authorized per object; do not expose the local `/storage` path in production.
- Prisma tenant extension is mandatory for new tenant-scoped models (`TENANT_SCOPED_MODELS`).
- Rotate JWT secrets invalidates sessions.

## Related Documentation

- `ARCHITECTURE.md` — request lifecycle, tenant isolation, permissions, caching, logging, how to add a module
- `DEPLOYMENT.md` — production env, migrate deploy, Compose/Kubernetes notes, Redis/S3, TLS, graceful shutdown, rollback, health verification, backup policy, DR and incident playbooks

`DEPLOYMENT.md` also describes `scripts/backup-db.sh` and `scripts/restore-db.sh`. Those files are **not** in this repository; treat that section as operator procedure, not as shipped scripts.
