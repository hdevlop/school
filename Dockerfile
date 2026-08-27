# syntax=docker/dockerfile:1.7
FROM oven/bun:1.3.14 AS dependencies
WORKDIR /app

COPY package.json bun.lock ./
COPY apps/dashboard/package.json apps/dashboard/package.json
COPY packages/server/package.json packages/server/package.json
COPY packages/seed/package.json packages/seed/package.json
RUN bun install --frozen-lockfile

FROM oven/bun:1.3.14 AS build
WORKDIR /app

ARG OCI_CREATED
ARG OCI_REVISION
ARG NEXT_PUBLIC_APP_URL=https://demo.example.invalid
ARG FRONTEND_URL=https://demo.example.invalid

COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/apps/dashboard/node_modules ./apps/dashboard/node_modules
COPY --from=dependencies /app/packages/server/node_modules ./packages/server/node_modules
COPY --from=dependencies /app/packages/seed/node_modules ./packages/seed/node_modules
COPY . .
# najm-auth@3.1.1 and the database client read these at build time (Next's
# static page-data collection boots the server); none of it needs to resolve
# to anything real, and none of it is used at runtime — see the runtime
# stage's own env_file for the real values.
RUN DB_URL=postgresql://build:build@127.0.0.1:5432/build \
    EMAIL_PROVIDER=console \
    EMAIL_DEFAULT_FROM=no-reply@example.invalid \
    NEXT_PUBLIC_APP_URL="${NEXT_PUBLIC_APP_URL}" \
    FRONTEND_URL="${FRONTEND_URL}" \
    NAJM_AUTH_INTERNAL_URL=http://127.0.0.1:3000/api/auth/session/recover \
    JWT_ACCESS_SECRET=build-only-access-secret-at-least-32-characters \
    JWT_REFRESH_SECRET=build-only-refresh-secret-at-least-32-characters \
    NAJM_ENCRYPTION_KEY=1111111111111111111111111111111111111111111111111111111111111111 \
    ADMIN_EMAIL=admin@example.invalid \
    ADMIN_PASSWORD=build-only-admin-password-not-used-000000 \
    NEXT_PUBLIC_FORM_FILL_ENABLED=false \
    bun run build:all

FROM oven/bun:1.3.14 AS runtime
WORKDIR /app

ARG OCI_CREATED
ARG OCI_REVISION
LABEL org.opencontainers.image.created=${OCI_CREATED} \
      org.opencontainers.image.revision=${OCI_REVISION} \
      org.opencontainers.image.source="https://github.com/hdevlop/school"

ENV HOSTNAME=0.0.0.0 \
    NODE_ENV=production \
    PORT=3000

COPY --from=build --chown=bun:bun /app/package.json /app/bun.lock /app/drizzle.config.ts ./
COPY --from=build --chown=bun:bun /app/node_modules ./node_modules
COPY --from=build --chown=bun:bun /app/apps/dashboard/package.json /app/apps/dashboard/next.config.ts ./apps/dashboard/
COPY --from=build --chown=bun:bun /app/apps/dashboard/.next ./apps/dashboard/.next
COPY --from=build --chown=bun:bun /app/apps/dashboard/public ./apps/dashboard/public
COPY --from=build --chown=bun:bun /app/apps/dashboard/node_modules ./apps/dashboard/node_modules
COPY --from=build --chown=bun:bun /app/packages/server ./packages/server

USER bun
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=4 \
  CMD ["bun", "-e", "const r=await fetch('http://127.0.0.1:3000/login');process.exit(r.status<500?0:1)"]
CMD ["bun", "run", "--cwd", "apps/dashboard", "start"]
