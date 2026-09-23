# syntax=docker/dockerfile:1.7
FROM oven/bun:1.3.14 AS dependencies
WORKDIR /app

# bunfig.toml selects the hoisted linker, so the image resolves the same
# layout as local and CI installs. Every workspace manifest is needed for a
# frozen install of the workspace graph.
COPY package.json bun.lock bunfig.toml ./
COPY apps/dashboard/package.json apps/dashboard/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/server/package.json packages/server/package.json
COPY packages/seed/package.json packages/seed/package.json
RUN bun install --frozen-lockfile
# A hoisted install creates a workspace's own node_modules only for a version
# conflict. Create each one so the stages below copy a fixed set of paths
# whether or not Bun needed it.
RUN mkdir -p apps/dashboard/node_modules packages/contracts/node_modules \
    packages/server/node_modules packages/seed/node_modules

FROM oven/bun:1.3.14 AS build
WORKDIR /app

ARG OCI_CREATED
ARG OCI_REVISION
ARG NEXT_PUBLIC_APP_URL=https://demo.example.invalid
ARG FRONTEND_URL=https://demo.example.invalid

# The installed tree (root and per-workspace node_modules plus Bun's
# workspace links), then the source. Private workspaces are consumed as
# TypeScript source: no server prebuild or generated dist is required.
COPY --from=dependencies /app ./
COPY . .
# Publish the immutable image revision through Next's static-file server. The
# deployment workflow uses it to distinguish the replacement container from a
# still-serving previous revision before declaring production ready.
RUN printf '%s\n' "${OCI_REVISION}" > apps/dashboard/public/deployment-revision.txt
# najm-auth@3.3.0 and the database client read these at build time (Next's
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
    bun run build

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

# What each image command reads:
# - web (`next start`): the .next build, public assets, root node_modules, and
#   the server's source theme files that najm-theme resolves at runtime;
# - notifications worker (`bun run notifications:worker`): the root scripts,
#   server and contracts source, and the root tsconfig's decorator settings;
# - migrate (`bun x drizzle-kit migrate`): drizzle.config.ts, the server schema
#   source and its migrations, and the contracts it imports;
# - seed:admin: the seed source and the production environment injected at runtime.
COPY --from=build --chown=bun:bun /app/package.json /app/bun.lock /app/tsconfig.json /app/drizzle.config.ts ./
COPY --from=build --chown=bun:bun /app/node_modules ./node_modules
COPY --from=build --chown=bun:bun /app/apps/dashboard/package.json /app/apps/dashboard/next.config.ts ./apps/dashboard/
COPY --from=build --chown=bun:bun /app/apps/dashboard/.next ./apps/dashboard/.next
COPY --from=build --chown=bun:bun /app/apps/dashboard/public ./apps/dashboard/public
COPY --from=build --chown=bun:bun /app/apps/dashboard/node_modules ./apps/dashboard/node_modules
COPY --from=build --chown=bun:bun /app/packages/contracts ./packages/contracts
COPY --from=build --chown=bun:bun /app/packages/server ./packages/server
COPY --from=build --chown=bun:bun /app/packages/seed ./packages/seed

USER bun
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=4 \
  CMD ["bun", "-e", "const r=await fetch('http://127.0.0.1:3000/api/health/status');process.exit(r.ok?0:1)"]
# The dashboard's local start script is pinned to its developer port. Override
# it explicitly so the runtime agrees with EXPOSE, the healthcheck and Dokploy.
CMD ["bun", "run", "--cwd", "apps/dashboard", "start", "--", "-p", "3000"]
