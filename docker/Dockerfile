# syntax=docker/dockerfile:1

FROM node:26-alpine AS base
WORKDIR /app
# Patch OS packages (the base image layer can lag behind Alpine's repo - this
# is what actually fixes the openssl/libssl3/libcrypto3 CVE Trivy flags).
RUN apk update && apk upgrade --no-cache && apk add --no-cache libc6-compat

# ---- production-only deps (also generates the Prisma client against this
# stage's own platform, so the better-sqlite3 native addon matches Alpine/musl)
FROM base AS deps-prod
COPY package.json package-lock.json ./
COPY prisma.config.ts ./
COPY prisma/schema.prisma ./prisma/schema.prisma
RUN npm ci --omit=dev
RUN npx prisma generate

# ---- full deps + app build
FROM base AS builder
COPY package.json package-lock.json ./
COPY prisma.config.ts ./
COPY prisma/schema.prisma ./prisma/schema.prisma
RUN npm ci
RUN npx prisma generate
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- runtime image
FROM base AS runner
ENV NODE_ENV=production
# Commit this image was built from (shown by /api/health so a stale host is easy to spot).
ARG BUILD_SHA=dev
ENV BUILD_SHA=$BUILD_SHA
ENV NEXT_TELEMETRY_DISABLED=1

RUN apk add --no-cache su-exec && \
    addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

COPY --from=deps-prod /app/node_modules ./node_modules
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY docker/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# npm/npx/corepack/yarn are only needed to build (earlier stages). Their
# bundled dependencies (tar, brace-expansion, undici, ...) are what Trivy kept
# flagging as vulnerable Node.js packages even though none are ours, and
# upgrading npm only ever chases the next advisory - so the runtime image
# simply doesn't ship a package manager. Prisma migrations and `next start`
# are invoked through node directly (see entrypoint.sh / CMD).
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack       /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack       /opt/yarn-* /usr/local/bin/yarn /usr/local/bin/yarnpkg

# Stays root here: entrypoint.sh chowns the mounted data volumes to the
# nextjs user, then drops privileges via su-exec before running anything.
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["node", "node_modules/next/dist/bin/next", "start"]
