# ---- Base: shared build tooling ----
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /workspace
ENV NEXT_TELEMETRY_DISABLED=1

# ---- Dependencies (full, for building) ----
FROM base AS deps
COPY package.json package-lock.json turbo.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/config/package.json packages/config/package.json
RUN npm ci

# ---- Build ----
FROM deps AS build
COPY apps/api/prisma ./apps/api/prisma
RUN npm run db:generate -w @eduos/api
COPY . .
RUN npm run build -w @eduos/shared && npm run build -w @eduos/api

# ---- Runtime ----
FROM base AS runner
ENV NODE_ENV=production
COPY --from=build /workspace/package.json ./package.json
COPY --from=build /workspace/node_modules ./node_modules
COPY --from=build /workspace/packages ./packages
COPY --from=build /workspace/apps/api/dist ./apps/api/dist
COPY --from=build /workspace/apps/api/prisma ./apps/api/prisma
COPY --from=build /workspace/apps/api/package.json ./apps/api/package.json

WORKDIR /workspace/apps/api
EXPOSE 3001

# Non-root user. The node_modules already contains the generated Prisma client.
USER node

# Migrations are applied by a dedicated one-shot `migrate` service BEFORE the
# API starts, so multiple API replicas never race on `prisma migrate deploy`.
CMD ["node", "dist/main.js"]
