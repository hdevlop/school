# School workspace architecture

School is one Bun workspace. A single Next.js process serves the dashboard and
the API; the notification worker, migrations and seed commands are separate
Bun processes that reuse server code. Package directories describe code
ownership and reuse. They are not security or deployment isolation.

This is the shared standard for Bun + Next.js + Najm applications. Kafil
implements the same contract with `apps/web` and `@kafil/*`.

## Ownership

| Package | Owns | Exports |
| --- | --- | --- |
| `apps/dashboard` (`@sms/dashboard`) | Routes, UI, feature-owned client state, product policy, Najm composition (`AppProviders.tsx`, `najm.config.ts`, `najm.auth.ts`, `najm.server.ts`) | Nothing; it is the application |
| `packages/contracts` (`@sms/contracts`) | Browser-safe shared code: domain value tuples, the translation catalog, demo/form-fill fixtures | `.`, `./lookup` (server-only), `./locales`, `./fixtures` |
| `packages/server` (`@sms/server`) | Persistence, domain services, backend configuration, workers, theme assets | `.`, `./najm`, `./auth`, `./database`, `./database/schema`, `./theme`, `./modules`, `./modules/seed` |
| `packages/seed` (`@sms/seed`) | Setup, fixtures loading and maintenance commands | Nothing; commands only |

Private workspaces export TypeScript source (`"types"` and `"default"` both
point at `src/*.ts`). There is no generated `dist`, declaration build or
server prebuild:

- Next compiles `@sms/server` and `@sms/contracts` for the web/API
  application, applying the root tsconfig's `experimentalDecorators` and
  `emitDecoratorMetadata`. `najm-next/config` supplies `externalDir` and the
  `reflect-metadata` externalization.
- Bun runs the worker, migrations and seed commands from source with the same
  tsconfig settings.
- Typechecking is its own gate: `bun run typecheck` checks every workspace
  from source.

Inside a package, imports are relative. A tsconfig alias is package-local
(`@/*` in the dashboard); no alias points into another package.

## Dependency direction

| Consumer | May import |
| --- | --- |
| Browser code: every `"use client"` module and everything it imports | `@sms/contracts` (not `./lookup`) and browser-safe packages |
| Server components, route handlers, `najm.server.ts` | Contracts and `@sms/server` exports |
| `@sms/server`, including workers | Contracts; never the app or seed |
| `@sms/seed` | Server and contracts exports |
| `@sms/contracts` | No workspace package; only `najm-i18n/define`, `@faker-js/faker`, `nanoid` |

Every cross-package import names the package and one of its declared
`exports`, and the importing package declares the dependency. Relative paths,
aliases and unexported subpaths into another package are rejected.

`bun run test:boundaries` enforces this with
`scripts/check-workspace-boundaries.mjs` and the policy in
`scripts/workspace-boundaries.config.mjs`:

- It parses every workspace file with the TypeScript compiler API and resolves
  imports as TypeScript does: tsconfig paths, relative files and package
  `exports`. It covers static imports, side-effect imports, re-exports, literal
  dynamic imports and `require`.
- From each of the dashboard's `"use client"` modules it follows runtime edges
  through every workspace file. It fails on any path to server or seed code, a
  module importing `server-only`, a Node or Bun built-in, a server-only package,
  `@sms/contracts/lookup`, or computed module loading. The report prints the
  full import chain.
- Type-only imports are erased at runtime. They still obey package direction,
  and a type-only import from a browser graph into the server is listed
  separately as coupling to move into contracts.
- `scripts/tests/workspace-boundaries.test.mjs` runs the real checker and
  policy against fixture workspaces for every rule, allowed and forbidden.

Audited exceptions live in the policy file with the reason written beside
them. Today there is one: `najm-chatbot/react`, a client entry of a package
whose root is server-only. `najm-kit/server` is not treated as server-only:
despite its name, it contains only constants and cookie/fetch helpers.

`server-only` stays at Next entrypoints such as `najm.server.ts`. Do not add it
to shared backend modules: the worker and seed commands import them under Bun.

## Translations and fixtures

`packages/contracts/src/locales` is the one en/fr/ar/es catalog. The
dashboard's provider, server components, the server's i18n plugin and the
seed runner all import `@sms/contracts/locales`, so a JSON edit reaches every
consumer without a build. `bun run i18n:check` scans the dashboard for keys
missing from the catalog.

`@sms/contracts/fixtures` holds the fake-record generators and static
reference data (classes, sections, subjects, fee types). Two consumers use
them: demo seeding, and the dashboard's development form fill
(`apps/dashboard/src/lib/formFill.ts`, enabled by
`NEXT_PUBLIC_FORM_FILL_ENABLED` and off in production builds by default).
Seed-generated demo datasets stay in the seed package.

## Root command contract

| Command | Outcome |
| --- | --- |
| `bun install --frozen-lockfile` | Installs the committed workspace graph (hoisted linker, from `bunfig.toml`). |
| `bun run dev` / `dev:https` | Starts Next directly. Server, contracts and catalog edits reach the running app; a compile error is shown and clears when fixed. |
| `bun run build` | Builds the production dashboard. `build:all` is an alias. |
| `bun run start` | Serves the existing build without compiling. |
| `bun run lint` | ESLint over the dashboard, contracts, server, seed and `scripts/`. |
| `bun run typecheck` | Checks contracts, server, seed and dashboard (app and tests) from source. The dashboard first runs `next typegen`, because `next-env.d.ts` and route types are generated, not tracked. |
| `bun run test` | Safe suites: config/fixtures, access reset, and boundary fixtures plus the real graph. |
| `bun run check` | Lint, typecheck, `i18n:check`, safe tests, build and `db:check`. |
| `bun run notifications:worker` | Runs the worker from source with the app's env file. |
| `bun run db:*` / `seed:*` | Unchanged product operations. Seed commands no longer prepare anything first. |

Database, seed, worker and connected commands are never part of `check`.

## Environment and packaging

`apps/dashboard/.env.local` is the sole local environment file, and
`.env.local.example` is its placeholder-only template. Next loads it from the
app directory; database, seed and worker commands pass the same path. Values
already present in the process win, and a missing file is not an error, so CI
and production work with injected values only.

The image installs from every workspace manifest plus `bunfig.toml`, copies
the installed tree forward, and builds only the Next application. The runtime
stage carries the `.next` build, public assets, root `node_modules`, the root
tsconfig and drizzle config, and the server and contracts source. That covers
the web command, the notification worker and `drizzle-kit migrate`.
Production still receives `/opt/school/env/app.env` through Compose. No local
secret enters the build context.

## Checklist for a new application

1. Create `apps/web` (Next routes, UI, `providers/AppProviders.tsx`,
   `najm.config.ts`, `najm.auth.ts`, `najm.server.ts`) and
   `packages/{contracts,server,seed}`. Use `tsconfig.base.json` at the root.
   Create files only for responsibilities you actually have.
2. Give each private package explicit source `exports`: `types` and `default`
   point at `src/*.ts`, with one subpath per real consumer. Keep catalogs and
   helpers off the contracts root barrel.
3. Put translation catalogs, shared domain values and pure helpers in
   contracts. Put persistence, services, configuration and workers in
   server. Keep product rules in the product.
4. Mount one `NajmAppProvider`. Define auth once, and keep one module-scope
   session adapter and one preference source. `next.config.ts` re-exports
   `najm-next/config`.
5. Keep one env file, `apps/web/.env.local`, with a tracked
   `.env.local.example`. Operational scripts pass it explicitly, and injected
   values win.
6. Expose the root commands above. Add product-specific gates, such as i18n or
   schema checks, only where they have meaning.
7. Copy `scripts/check-workspace-boundaries.mjs` and its tests, and write the
   app's `workspace-boundaries.config.mjs`. Run it in `test`.
8. In the image, copy every workspace manifest and `bunfig.toml` into the
   install stage. Carry forward the installed tree, and list exactly what each
   runtime command reads.
