# EduOS Deployment & Operations Guide

This guide covers production deployment, database migration, backup/restore,
and rollback for the EduOS platform (NestJS API + Next.js web + PostgreSQL +
Redis + S3-compatible object storage).

> Security: run all steps with secrets injected from your secrets manager /
> CI secrets, never committed or hard-coded.

## 1. Production environment (required variables)

See `apps/api/.env.example` and `apps/web/.env.example`. In production the API
**refuses to start** if:

- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` are missing, weak (<32 chars), or equal
- `CORS_ORIGINS` is wildcard `*` or empty
- `STORAGE_DRIVER=s3` with default `minioadmin` credentials
- `AUTH_REQUIRE_EMAIL_VERIFICATION` is `false`

Required variables (production):

| Variable | Purpose |
| -------- | ------- |
| `NODE_ENV=production` | disables dev conveniences |
| `DATABASE_URL` | PostgreSQL DSN |
| `REDIS_URL` | Redis DSN (include password if configured) |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | ≥32-char, distinct |
| `CORS_ORIGINS` | explicit comma-separated allowed origins |
| `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | object storage (MinIO/S3/R2) |
| `STORAGE_DRIVER=s3` | production object storage |
| `AUTH_REQUIRE_EMAIL_VERIFICATION=true` | required for self-registration |
| `TRUST_PROXY=true` | only when behind a trusted reverse proxy (correct client IP, tenant host) |
| `EMAIL_FROM`, `SMTP_*` | transactional email |

Optional but recommended: `SWAGGER_ENABLED=false` (default in production).

## 2. Database migrations

**Production must use `prisma migrate deploy`.** Never use `prisma db push` or
`prisma migrate reset` against production.

Migrations are committed under `apps/api/prisma/migrations` and are
deterministic. The `docker-compose.yml` ships a dedicated one-shot `migrate`
service that runs `prisma migrate deploy` before the API container starts, so
multiple API replicas never race on schema changes.

Run migrations as an explicit deployment step (recommended over app-startup
migration):

```bash
# from the monorepo root, with production DATABASE_URL set:
DATABASE_URL="$PROD_DATABASE_URL" npx prisma migrate deploy --schema apps/api/prisma/schema.prisma
```

Or with docker compose:

```bash
docker compose run --rm migrate
```

## 3. Deploy the API and Web

Build production images and run them:

```bash
docker compose up -d --build
```

Or deploy individually (e.g. Kubernetes / ECS). Each image:

- Runs as a non-root user
- Serves only its own port (API `3001`, Web `3000`)
- Has liveness/readiness healthchecks (`/api/v1/health/live`, `/api/v1/health/ready`)
- Handles SIGTERM (graceful shutdown enabled in `main.ts`)

## 4. PostgreSQL backup / restore

### Backup (recommended: nightly)

```bash
DATABASE_URL="$PROD_DATABASE_URL" BACKUP_DIR=/var/backups/eduos \
  BACKUP_ALLOW_PRODUCTION=1 ./scripts/backup-db.sh --s3
```

- Produces a compressed custom-format dump: `eduos-<db>-<timestamp>.dump.gz`
- Retention: `BACKUP_RETENTION_DAYS` (default 14)
- With `--s3` uploads to the configured bucket; enable server-side encryption
  on the bucket for encryption at rest.

Recommended policy:
- Frequency: **nightly full backup**, plus **continuous WAL archiving /
  point-in-time recovery** if your provider supports it (RDS PITR, Cloud SQL).
- Retention: 14–30 days for full dumps; 7 days for WAL.
- RPO: up to the backup interval (≤24h) without PITR; minutes with PITR.
- RTO: restore of a full dump typically < 1 hour.
- Restore verification: restore to a scratch database on a schedule and run
  `pg_restore --list` plus a row-count sanity check.

### Restore (target is always explicit)

```bash
./scripts/restore-db.sh \
  --target "postgresql://user:pass@host:port/targetdb" \
  ./backups/eduos-<db>-<stamp>.dump.gz
```

The restore script **never reads `DATABASE_URL`** as the target, refuses
production-looking database names unless `RESTORE_ALLOW_PRODUCTION=1` is set,
and requires an interactive confirmation typing the database name.

## 5. Redis production configuration

- Set `REDIS_PASSWORD` in production; `docker-compose` will start Redis with
  `--requirepass` and the API connects using the password.
- Keep Redis on a **private network**; do not expose `6379` publicly.
- AOF persistence (`--appendonly yes`) is enabled by default in compose.
- The app treats Redis as a cache; if Redis is down, the API still serves
  (cache errors are logged and requests proceed), but response caching is
  disabled until it recovers.

## 6. Object storage (MinIO / S3)

- Production must use real credentials via environment/secrets — never
  `minioadmin` (the API's `validateProductionConfig` blocks it).
- Private objects are served only through the authenticated
  `/files/:id/download` endpoint; the `/storage` static route is dev-only.
- Prefer a managed S3/R2/GCS bucket with server-side encryption and an
  explicit lifecycle policy for `backups/`.

## 7. HTTPS / reverse proxy

Terminate TLS at a reverse proxy (nginx, Caddy, ALB, Cloudflare):

- Forward `X-Forwarded-For` / `X-Forwarded-Host` / `X-Forwarded-Proto`.
- Set `TRUST_PROXY=true` on the API so client IPs (rate limiting) and the
  tenant host header are correct.
- Serve the web app on 443 and proxy `/api/*` to the API service.
- Rate limiting is per-process (in-memory). For multiple API replicas behind a
  load balancer, add edge rate limiting at the proxy or swap the throttler
  storage to the shared Redis.

## 8. Graceful shutdown

The API enables `enableShutdownHooks()`: on `SIGTERM`/`SIGINT` it stops
accepting new requests, drains in-flight requests, and closes DB/Redis
connections. Deployment platforms send `SIGTERM` before stopping a container;
set an appropriate stop grace period (e.g. 30s).

## 9. Rollback

Migrations are forward-only. To roll back a bad release:

1. **Reuse the previous image tag** (API + Web) and redeploy — the app is
   backward compatible with the previous schema version.
2. If the rollback requires a *schema* downgrade, this must be done manually
   with a reversible migration + verified data backfill; otherwise restore the
   most recent backup **before** the bad release and re-apply the release
   migrations from scratch.
3. Verify with health checks and a smoke test on the new environment before
   cutting traffic.

## 10. Verification after deploy

```bash
# Liveness
curl -fsS https://api.example.com/api/v1/health/live
# Readiness (DB + Redis)
curl -fsS https://api.example.com/api/v1/health/ready
# Web
curl -fsS -o /dev/null -w '%{http_code}\n' https://app.example.com/
```

---

## Appendix A: Backup Policy (recommended baseline)

| Item | Recommendation |
| ---- | -------------- |
| **Frequency** | Nightly full logical backups; continuous WAL archiving if supported by your DB provider (e.g., RDS PITR, Cloud SQL PITR). |
| **Retention** | 14–30 days for full dumps; 7 days for WAL archives (or per your compliance requirements). |
| **Encryption at rest** | Enable server-side encryption on the backup bucket/volume. Never store unencrypted backups in public buckets. |
| **Off-site storage** | Copy backups to a separate region or object-storage bucket with versioning enabled. |
| **Restore verification** | Monthly scheduled restore to a scratch database and verify with: `pg_restore --list` + a row-count or application-level smoke test. |
| **RPO** | ≤ 24 hours (nightly) without PITR; minutes with continuous WAL archiving. |
| **RTO** | < 1 hour for full-dump restore on typical EduOS datasets. |
| **Ownership** | Platform/DevOps team owns backup jobs and retention; on-call owns restore execution. |

### Object storage (files)
- Files are stored in a configured S3/MinIO bucket. Backups depend on your bucket policy.
- Recommended: versioning enabled, lifecycle rules for archival, server-side encryption.

---

## Appendix B: Disaster Recovery Playbook

### 1. PostgreSQL failure (primary DB down)
**Detect:** `GET /api/v1/health/ready` returns 500 (database status `down`).
**Recover:**
1. Fail over to replica if your managed DB provider offers HA.
2. If manual failover is required, promote the replica (provider-specific steps).
3. Update environment `DATABASE_URL` to point to the promoted instance.
4. Restart API containers so they connect to the new primary.
**Verify:** `/api/v1/health/ready` returns 200; basic API call (`/api/v1/tenants` or `/api/v1/health/live`).

### 2. Redis failure
**Detect:** `GET /api/v1/health/ready` returns 500 (redis status `down`).
**Recover:**
1. If using managed Redis, trigger failover or restart the service.
2. If self-hosted, restart Redis container(s).
**Impact:** API remains up but response caching is disabled until Redis recovers.
**Verify:** `/api/v1/health/ready` returns 200.

### 3. Object storage failure (S3/MinIO)
**Detect:** File upload/download failures (5xx responses from `/files/...`).
**Recover:**
1. For MinIO: restart container(s); ensure data volume is intact.
2. For S3: check AWS status; ensure IAM credentials are valid.
**Verify:** Upload a test file and download it.

### 4. API failure
**Detect:** Health endpoint 5xx, container restarts, or load balancer marks unhealthy.
**Recover:**
1. Check logs for panic or migration errors.
2. Roll back to the last known good image tag if a deployment introduced the failure.
3. Ensure `DATABASE_URL`, `REDIS_URL`, and secrets are correct.
**Verify:** `/api/v1/health/live` and `/api/v1/health/ready` return 200.

### 5. Web failure
**Detect:** 5xx on web routes, container restarts.
**Recover:** Roll back to last known good image tag; verify environment (`API_URL`).
**Verify:** `GET /` returns 200.

### 6. Failed deployment
**Detect:** New image starts but health checks fail or logs show migration failure.
**Recover:**
1. Roll back to the previous image tag in your orchestrator (K8s rollback, ECS task-set rollback, etc.).
2. Do **not** attempt automatic DB rollbacks—Prisma migrations are forward-only by default.
**Note:** If a new migration broke compatibility, restore the database from a pre-migration backup **before** rolling back the application.

### 7. Failed migration
**Detect:** API container exits with migration error (`prisma migrate deploy` failed).
**Recover:**
1. **Do not** force the deployment.
2. Restore the database from the most recent backup taken before the migration attempt.
3. Re-run the deployment.
**Prevention:** Always take a backup immediately before applying migrations in production.

### 8. Accidental data deletion / corruption
**Recover:**
1. Stop the API to prevent further writes (scale to 0 or pause deployment).
2. Restore the database from the latest valid backup into a scratch database and verify.
3. If acceptable, restore into production and restart the API.
**Note:** Point-in-time recovery (if enabled) can minimize data loss.

### 9. Compromised secrets (JWT, DB password, S3 credentials)
**Recover:**
1. **Rotate immediately** in your secrets manager.
2. Update environment variables and redeploy API/Web.
3. For JWT secret rotation, expect all sessions to be invalidated (users must re-login).
**Verify:** Health endpoints 200; users can log in with new credentials.

### 10. Full environment recovery
**Recover:**
1. Provision new instances (DB, Redis, object storage).
2. Restore DB from latest backup (and WAL if available).
3. Point API/Web to the new resources via environment variables.
4. Verify health endpoints and run application smoke tests.

---

## Appendix C: Rollback Limitations

- **Application rollback** (image tag) is safe **only if** no new database migrations were applied.
- **Database rollback** is **not** automatically safe. Prisma migrations should be treated as forward-only unless you explicitly created a reversible migration pair and tested the rollback.
- **Recommended practice:** take a backup immediately before applying migrations. If a deployment fails due to a migration error, restore the DB from that backup **before** rolling back the application.

---

## Appendix D: Observability Signals (minimal set)

Monitor these signals in production:

| Signal | Source | Threshold |
| ------ | ------ | --------- |
| HTTP 5xx rate | API logs / LB metrics | Spike above baseline |
| P95 latency | API logs / LB metrics | > 500ms sustained |
| Authentication failures | API logs (`/auth/login`) | Spike or sustained high rate |
| Rate limiting events | API logs (Throttler) | Spike |
| DB failures | API logs (`[database] status: down`) | Any occurrence |
| Redis failures | API logs (`[redis] status: down`) | Any occurrence |
| Storage failures | API logs (`/files/*` 5xx) | Spike |
| Migration failures | Container logs (`prisma migrate deploy`) | Any failure |
| Readiness failures | `/api/v1/health/ready` 5xx | Any occurrence |
| Container restarts | Orchestrator metrics | Any unexpected restart |

Prefer structured logs with `requestId` for correlation. Do not log sensitive data (tokens, passwords, PII).

---

## Appendix E: Backup/Restore Verification (manual procedure)

The backup and restore scripts (`scripts/backup-db.sh`, `scripts/restore-db.sh`) implement safety checks:

- **Backup** refuses to run on databases named `eduos`, `prod`, or `production` unless `BACKUP_ALLOW_PRODUCTION=1` is explicitly set.
- **Restore** requires an explicit `--target` URL and interactive confirmation; it never reads `DATABASE_URL` as the restore target to prevent accidental overwrites.

**Recommended verification procedure** (run monthly in a staging or disposable environment):

```bash
# 1. Create a disposable database (Docker example)
docker run -d --name pg-disposable -e POSTGRES_USER=test -e POSTGRES_PASSWORD=test \
  -e POSTGRES_DB=testdb postgres:16-alpine

# 2. Insert test data
psql postgres://test:test@localhost:5432/testdb -c "CREATE TABLE t (id SERIAL PRIMARY KEY, v TEXT);"
psql postgres://test:test@localhost:5432/testdb -c "INSERT INTO t (v) VALUES ('hello');"

# 3. Backup
DATABASE_URL="postgres://test:test@localhost:5432/testdb" BACKUP_DIR=./tmp-backups \
  ./scripts/backup-db.sh

# 4. Drop the data
psql postgres://test:test@localhost:5432/testdb -c "TRUNCATE t;"

# 5. Restore
./scripts/restore-db.sh --target "postgres://test:test@localhost:5432/testdb" ./tmp-backups/eduos-testdb-*.dump.gz

# 6. Verify
psql postgres://test:test@localhost:5432/testdb -c "SELECT * FROM t;"
# Expected: the 'hello' row is restored.

# 7. Cleanup
docker rm -f pg-disposable
```

**Expected behavior:**
- Backup produces a `.dump.gz` file.
- Restore requires confirmation of the target database name.
- After restore, the test data is present.
- Scripts refuse to operate on production-named databases without explicit permission.


---

## Appendix F: Incident Response Playbook (Operational)

### 1. API 5xx spike
**Detect:** Monitoring dashboard shows HTTP 5xx rate spike (>1% sustained).
**First checks:**
- Check `/api/v1/health/ready` – is it failing? (indicates DB/Redis outage)
- Check `/api/v1/health/live` – is process alive?
- Check container restart count (orchestrator metrics).
**Logs:** Search for `statusCode >= 500` patterns; extract `requestId` from recent 5xx entries.
**Safe action:**
- If healthcheck failing: restart affected containers; verify DB/Redis connectivity.
- If healthchecks passing: correlate recent 5xx by `requestId`; examine exception details.
**Verification:** 5xx rate returns to baseline; healthchecks 200.
**Escalate:** If 5xx persists > 5 min after restart, or if root cause unknown.

### 2. DB outage
**Detect:** `/api/v1/health/ready` returns 500; logs show database health check failures.
**First checks:**
- Database provider status page / monitoring.
- Connection pool exhaustion? (check DB metrics).
**Logs:** Extract `requestId` from failed API calls; check database error patterns.
**Safe action:**
- Trigger DB failover (managed DB) or restart DB container (self-hosted).
- Update `DATABASE_URL` if failover changes connection string.
- Restart API containers.
**Verification:** `/api/v1/health/ready` returns 200.
**Escalate:** If failover fails or data loss suspected.

### 3. Redis outage
**Detect:** `/api/v1/health/ready` returns 500 (redis status down); cache miss rate spikes.
**First checks:**
- Redis provider status; memory/CPU metrics.
**Logs:** Check for Redis connection errors in logs.
**Safe action:**
- Restart Redis container(s) or trigger failover.
- Restart API (cache rebuilds on reconnect).
**Verification:** `/api/v1/health/ready` returns 200.
**Escalate:** If Redis unrecoverable (rare).

### 4. Storage outage (S3/MinIO)
**Detect:** `/files/*` endpoints return 5xx; upload/download failures.
**First checks:**
- S3/MinIO provider status; bucket accessibility.
**Logs:** Check for storage-related errors with `requestId`.
**Safe action:**
- For MinIO: restart container; verify data volume intact.
- For S3: check AWS status/IAM credentials; rotate if expired.
**Verification:** Test file upload + download succeeds.
**Escalate:** If storage service unavailable > 10 min.

### 5. Auth failure spike
**Detect:** Spike in 401 responses on `/auth/*`; user complaints.
**First checks:**
- JWT secret rotation? (invalidates all sessions)
- Token version mismatch?
**Logs:** Search for authentication failure patterns; extract `requestId`.
**Safe action:**
- If JWT rotated: users must re-login (expected).
- If token version issue: check token version in logs vs current config.
**Verification:** Auth success rate returns to normal.
**Escalate:** If auth failures persist without obvious cause.

### 6. Readiness failure
**Detect:** `/api/v1/health/ready` returns 500 repeatedly.
**First checks:**
- Determine which component failed (database vs redis).
- Check container logs for startup failures.
**Logs:** Search for healthcheck failure messages.
**Safe action:** Restart failing dependency; then API.
**Verification:** `/api/v1/health/ready` returns 200.
**Escalate:** If dependency unrecoverable.

### 7. Container restart loop
**Detect:** Orchestrator shows repeated container restarts.
**First checks:**
- Container logs for crash reason (exit code, panic).
- Resource limits (OOM, CPU).
**Logs:** Extract last successful `requestId`; check for unhandled exceptions.
**Safe action:**
- If OOM: increase memory limit.
- If crash on startup: rollback to last known good image.
**Verification:** Container stays running > 5 min.
**Escalate:** If root cause unknown after restart/rollback.

### 8. High latency (P95 > 500ms)
**Detect:** Monitoring shows sustained high latency.
**First checks:**
- DB query latency; slow query log.
- Redis latency.
- Request volume spike.
**Logs:** Extract `requestId` from slow requests; identify slow paths.
**Safe action:**
- If DB slow: check for locks, long-running queries.
- If request spike: consider rate limiting or scaling.
**Verification:** P95 latency returns to baseline.
**Escalate:** If latency persists > 10 min without clear cause.

### 9. Application error investigation
**Detect:** Unexpected exception logs with `requestId`.
**First checks:**
- Search logs for `requestId` pattern.
- Correlate request path, status, exception message.
**Logs:** Use `requestId` to trace full request lifecycle.
**Safe action:**
- Identify code path; rollback if deployment-related.
- Patch and redeploy if bug confirmed.
**Verification:** Error rate returns to baseline.
**Escalate:** If impact > 1% of requests or data integrity risk.

### 10. Containment / escalation
**Containment actions (ordered by severity):**
1. Restart affected service (API/DB/Redis).
2. Rollback to last known good image.
3. Scale down to zero (stop bleeding) if data corruption suspected.
4. Redirect traffic to DR environment (if available).
**Escalation triggers:**
- Data loss or corruption detected.
- Service unavailable > 15 min.
- Security incident suspected.
- Root cause unknown after standard remediation.

