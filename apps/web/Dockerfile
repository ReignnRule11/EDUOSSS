# ---- Base ----
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /workspace
ENV NEXT_TELEMETRY_DISABLED=1

# ---- Dependencies ----
FROM base AS deps
COPY package.json package-lock.json turbo.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/config/package.json packages/config/package.json
RUN npm ci

# ---- Build ----
FROM deps AS build
COPY . .
RUN npm run build -w @eduos/shared && npm run build -w @eduos/web

# ---- Runtime ----
FROM base AS runner
ENV NODE_ENV=production
COPY --from=build /workspace/package.json ./package.json
COPY --from=build /workspace/node_modules ./node_modules
COPY --from=build /workspace/packages ./packages
COPY --from=build /workspace/apps/web/.next ./apps/web/.next
COPY --from=build /workspace/apps/web/public ./apps/web/public
COPY --from=build /workspace/apps/web/package.json ./apps/web/package.json

WORKDIR /workspace/apps/web
EXPOSE 3000

# Non-root user. Next.js needs a writable .next cache dir.
RUN chown -R node:node /workspace/apps/web
USER node

CMD ["npx", "next", "start", "-p", "3000"]
