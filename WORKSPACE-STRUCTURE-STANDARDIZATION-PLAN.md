# Unified workspace architecture and migration plan

Version: 2 — 2026-09-22.
Status: implemented locally in both repositories on 2026-09-22; source gates, clean-snapshot gates and focused School browser acceptance pass. Docker image, Redis-backed production runtime and Linux signal gates remain blocked on this workstation. Evidence: `docs/evidence/workspace-standardization-v2/` in each repository. Nothing was committed, pushed or deployed.
Scope: School, sibling Kafil, and the standard to follow for future Bun + Next.js + Najm applications.
Coordinating file: this document in School's root.

## 1. Decision and scope

Adopt one architecture in both repositories:

- Private workspace packages expose TypeScript source through explicit package exports.
- Next.js builds the web application; Bun executes worker and operational entrypoints.
- A contracts package owns browser-safe domain values, API types, shared validation schemas, translation catalogs, and pure helpers.
- A server package owns persistence, domain services, backend configuration, and workers.
- The web app owns routes, UI, product policy, and Najm composition.
- A seed package owns setup, fixtures, and maintenance commands.
- Every repository exposes the same developer command interface and enforces the same dependency direction.

This supersedes v1's decisions to retain School's compiled server exports, defer Kafil contracts, and permanently allow browser imports from server subpaths. Those differences are migration work now.

The current request authorizes rewriting this plan. It does not execute the v2 code migration. A later implementation request covers the repository changes described here. Commits, pushes, package publication, deployments, production configuration changes, and operations on existing databases remain separate actions.

Preserve v1's useful environment, test, CI, and Docker improvements. The [archived v1 plan](docs/plans/workspace-standardization-v1.md) retains the original text, implementation evidence, rollback history, and open verification obligations.

## 2. Canonical structure

Use this layout for new applications:

```text
repository/
  apps/
    web/
      src/
        app/                 Next routes, layouts, API entrypoint
        features/            Product UI and feature-owned client state
        components/          Shared application UI
        providers/
          AppProviders.tsx
        services/            Browser API clients
        najm.config.ts       Product policy and defaults
        najm.auth.ts         Auth integration
        najm.server.ts       Server composition and session adapter
      .env.local             Ignored local values
      .env.local.example     Tracked placeholders
      next.config.ts
      package.json
  packages/
    contracts/
      src/
        index.ts             Small public barrel
        enums.ts             Domain values and associated types
        types.ts             Transport contracts when shared
        schemas/             Browser-safe shared validation, when needed
        locales/             One translation catalog for browser and server
        ...                  Named pure helpers
      package.json
    server/
      src/
        modules/
        database/
        workers/
        ...                  Backend composition/configuration
      package.json
    seed/
      src/
      package.json
  scripts/                   Repository automation
  docs/
    architecture/workspace.md
    tests/
    evidence/
  package.json
  bun.lock
  tsconfig.base.json
```

Create files for actual responsibilities; the diagram does not require empty scaffolding.

School may keep `apps/dashboard` during this migration. It implements exactly the same web-app contract as `apps/web`. Preserve current application ports and package identities (`@sms/*`, `@kafil/*`). Directory renaming is not required for architectural convergence.

One Next process serves web and API requests. Workers and maintenance commands are separate processes reusing server code. A package boundary does not itself provide runtime or security isolation.

## 3. Ownership and dependency rules

| Consumer | Allowed internal dependencies |
| --- | --- |
| Browser application code | Contracts only |
| Next server entrypoints and server components | Contracts and server exports |
| Server, including workers | Contracts; never app or seed implementation |
| Seed and maintenance tools | Server and contracts exports |
| Contracts | No app, server, or seed dependency |

Use declared `workspace:*` dependencies and explicit exports for every cross-package import. Do not reach through relative paths, aliases, or wildcard implementation exports into another package.

Contracts rules:

- No database schema imports, drivers, environment reads, filesystem access, auth initialization, or operational side effects.
- Pure portable dependencies may be explicitly allowlisted, for example Zod for shared schemas and the reviewed Najm i18n definition entrypoint. Dependency-free is not a requirement once catalogs/schemas move here.
- Prefer narrow exports such as `./locales`, `./phone`, and `./money/constants`. Do not eagerly re-export every catalog or helper from the root barrel.
- Preserve School's separate `./lookup` export: its registry references all enum tuples and must not inflate every browser import.
- Browser-facing types describe transport data. Keep Drizzle tables and persistence-specific types in server; avoid duplicating or weakening domain validation during extraction.
- Shared schemas are appropriate only when they have real browser/server consumers. Keep database-dependent assertions and backend DTO logic in server.

Server rules:

- Keep the controller -> service -> repository -> validator pattern and one service implementation for REST and MCP.
- Keep request-specific state out of module singletons. Preserve current server initialization, lifecycle, and connection behavior.
- Separate translation data from backend registration: contracts owns the catalog; server owns backend middleware/plugin setup.
- Product business rules remain in each product. Reusable framework capabilities remain in published Najm packages.

App composition, informed by the existing Najm guidance:

- One `NajmAppProvider` in app-owned `AppProviders.tsx`, with auth client, snapshot, and contracts-owned i18n.
- One auth definition, preference source, and module-scope session adapter.
- Keep the published `najm-next/config` integration; inspect installed behavior before adding configuration. If package transpilation needs configuration, use its supported configurable API rather than duplicating the shared defaults.
- Preserve branding, locale behavior, theme, location integration, query policy, keyboard tools, and feature behavior.

The final architecture has no browser-to-server export exceptions and no app-to-seed dependency, including development helpers. Temporary compatibility re-exports may exist during migration but must not remain the browser import path at completion.

## 4. Compilation and runtime contract

Both private server and contracts packages export source. Example shape:

```json
{
  "private": true,
  "type": "module",
  "exports": {
    ".": {
      "types": "./src/index.ts",
      "default": "./src/index.ts"
    }
  }
}
```

Add explicit subpaths for actual consumers. Migrate `main`, `types`, export conditions, and TypeScript aliases together; no private runtime export may still require generated `dist` files.

- Next owns compilation of the web/API application.
- Bun runs worker, migration, and CLI source with the required tsconfig and assets available.
- Typechecking remains an explicit gate; successful transpilation does not prove type safety.
- Test-specific emitted JavaScript may remain where needed for decorator metadata or an existing runner. Such output must not become a production prerequisite.
- Published Najm libraries retain their published build format and exact version policy. This plan changes private application workspaces, not published package formats.
- Do not introduce an independent API server or a second custom compiler/watch loop to make this layout work.

Compatibility gate: source exports are the target, not evidence that every existing module already works under every transformer. Prove decorator execution, DI metadata, module registration, asset resolution, and worker behavior before retiring School's pipeline. A blocker must be recorded with a reproducer; do not silently retain two permanent compilation policies or claim completion from a successful typecheck.

## 5. Root commands and environment

| Root command | Required outcome in both repositories |
| --- | --- |
| `bun install --frozen-lockfile` | Install the declared workspace graph |
| `bun run dev` | Start Next directly; consume workspace source with working updates |
| `bun run dev:https` | Same graph and environment, with HTTPS |
| `bun run build` | Produce the production Next application from a clean checkout |
| `bun run start` | Serve that existing build without compilation |
| `bun run lint` | Lint app, contracts, server, seed, and maintained automation |
| `bun run typecheck` | Check all workspaces without server declaration prebuilds |
| `bun run test:boundaries` | Verify package direction and resolved client import graphs |
| `bun run test` | Safe automated suites, including boundary regression tests |
| `bun run check` | Lint, typecheck, safe tests, build, and existing static repo gates |
| `bun run test:db` / browser commands | Explicit opt-in connected acceptance |
| `bun run notifications:worker` | Run the worker with the owning app's environment |
| `bun run db:*` / `seed:*` | Preserve documented product-specific effects |

School retains i18n validation and `db:check`; Kafil retains its required `db:generate` gate with no migration expected. Keep these product-specific checks documented rather than manufacturing equivalent commands without meaning.

Retain public script names needed by callers. `build:all` can alias `build`. Audit `build:server`, `build:types`, `build:seed`, and `seed:prepare` users before retirement; any temporary alias must document its changed validation-only role and removal path. No circular scripts or hidden server prebuilds.

Local files are already at their intended locations:

- School: `apps/dashboard/.env.local`, beside its template.
- Kafil: `apps/web/.env.local`, beside its template.
- Future apps: `apps/web/.env.local`.

Do not repeat Kafil's completed secret-file move. Next loads app-local values; operational scripts load the same file explicitly with paths resolved from their documented working directory. Existing process values win, and CI/production work with injected values and no local file.

Preserve production sources `/opt/school/env/app.env` and `/opt/kafil/env/app.env`, Compose injection, and placeholder build values. Prove Git/Docker exclusions for nested real env files; never use real secrets as test markers.

## 6. Current baseline and evidence limits

Observed during the v2 rewrite; refresh before implementation:

| Concern | School | Kafil |
| --- | --- | --- |
| App path | `apps/dashboard` | `apps/web` |
| Server exports | Compiled JS/declarations, with source theme exception | Source TypeScript |
| Contracts | Existing enums/types/lookup | Not yet present |
| Browser shared data | Contracts plus server locales | Server locales/phone/money constants |
| Development | Server build/watch/restart orchestration | Direct Next development |
| Lint | Dashboard scope | Web, server, seed |
| Environment | App-local file | App-local file, already migrated |
| Boundary enforcement | Regex/path-based script | Directory-scoped ESLint restrictions |

Existing boundary checks do not establish complete transitive client safety. Strengthening them is a required v2 deliverable.

V1 reported successful root checks and clean snapshot builds, School rebuild/failure/recovery behavior, and Kafil env-loader tests. Its archived evidence records 181 School config tests plus 60 access-reset tests, and 516 Kafil web, 456 server, and 120 seed tests. These are historical counts, not v2 acceptance.

Docker was unavailable; image builds, context/final-image marker proof, in-image dependency resolution, disposable readiness/worker acceptance, and browser acceptance remained unrun. All relevant obligations carry forward.

Both working trees contain v1 changes. School also contains unrelated table/feedback edits. Capture current status and distinguish both categories before editing; preserve them. Do not restore either repository to HEAD as a baseline.

## 7. Phase A — inventory and source-export compatibility

1. Record branch, HEAD, dirty paths, installed Bun/Next/TypeScript/Najm versions, and current root gates.
2. Read current repository guides and applicable Najm/frontend/backend/testing skills. Read installed Next documentation for affected integration behavior.
3. Inventory exports and consumers, aliases, locale readers, scripts, build output, CI commands, Docker/Compose copies, worker assets, and all `dist` assumptions.
4. Build a browser-safe extraction map covering School locales, Kafil locales/phone/money constants, and any actually shared schemas or types.
5. In an isolated School snapshot containing the intended current changes, switch candidate server exports to source and test a representative decorated controller/service/repository through Next and Bun.
6. Include an actual request exercising DI, auth/validation, and module registration against disposable dependencies. Cover a worker entrypoint and runtime assets. A synthetic decorator-only example is insufficient.
7. Verify server, contract, and locale edits reach the running Next consumer, and invalid edits produce visible failure/recovery without the custom rebuild script.

Acceptance: demonstrate feasibility with a documented compatibility result before deleting the existing School pipeline. If a published Najm capability is missing, report the exact dependency; shared framework publication is a separate authorized workflow. Do not link a sibling Najm checkout.

## 8. Phase B — establish contracts ownership in both apps

1. Extend School's existing contracts package; create `@kafil/contracts` with source exports, workspace dependencies, tests, and TypeScript configuration.
2. Move catalogs losslessly from server to `packages/contracts/src/locales`. Update frontend providers, backend imports, tests, and locale scanning scripts together. Preserve all keys, language fallback, ordering, and translated values.
3. Extract Kafil's reviewed pure phone and money-constant helpers. Audit transitive imports before moving them. Keep monetary units, rounding, validation, and application behavior unchanged.
4. Keep domain-specific backend money services and database logic in server. Extract further code only where actual shared consumers justify it.
5. Preserve narrow exports and School's `lookup` separation. Declare only the required portable dependencies; align published pins with root overrides.
6. Update every consumer to contracts exports. Transitional server re-exports point to the same implementation; remove them once all repository consumers migrate.
7. Resolve School's two app-to-seed faker imports. Place browser-specific development form helpers in the app; extract only genuinely shared pure fixture primitives to a narrow contracts subpath if both app and seed need them. Keep CLI/database imports unreachable and verify production exclusion/disabled behavior.
8. Update `bun.lock` through Bun for the new workspace graph, without dependency upgrades or unrelated lock churn.

Acceptance: catalog parity tests and helper behavior pass, no browser-facing consumer imports server/seed, backend catalogs resolve to the same source, and frozen installation succeeds.

## 9. Phase C — converge School on source exports

1. Apply the proven source-export mapping to all School server entrypoints, including auth, database, schema, modules, seed-facing subpaths, and theme. Preserve server-only classifications.
2. Update package type metadata and consumer resolution. Keep aliases package-local; remove any alias bypassing another package's exports.
3. Change root development and production builds to consume source directly. Keep current HTTPS behavior, ports, forwarded arguments, signals, and exit codes.
4. Remove the requirement to emit declarations before seed/app typechecking. Check every workspace explicitly.
5. Remove server preparation from seed commands without changing their operations. Validate loader/import behavior without executing real seed jobs.
6. After compatibility acceptance, retire `apps/dashboard/scripts/dev-with-server.mjs` and unused production server build/type-generation machinery. Preserve any separately required test compiler.
7. Confirm no root script, package export, CI step, worker, or container command reads the retired output.
8. Keep Kafil's existing source strategy; integrate its new contracts package into the same command contract.
9. Expand School's lint coverage and add Kafil contracts coverage. Address migration-related findings; record pre-existing lint debt without sweeping unrelated rewrites.

Acceptance: both roots install, typecheck, develop, build, and start without private server `dist` artifacts. Verify both production and development behavior, including change/failure/recovery and clean process termination.

## 10. Phase D — enforce real dependency boundaries

Replace incomplete path-only enforcement with one documented policy applied in both repositories. Reuse established tooling where it can resolve the graph; otherwise use the TypeScript parser/resolver with focused tests.

Required coverage:

- Resolve workspace exports, aliases, relative imports, and re-exports.
- Detect static imports, side-effect imports, literal dynamic imports, and CommonJS requires used in the repository. Reject or explicitly review computed loading at boundaries rather than silently ignoring it.
- Traverse from every `"use client"` entrypoint, including files under `app`, `lib`, providers, hooks, services, and components; follow shared helpers transitively.
- Reject any runtime path into server/seed, database drivers, Node-only modules, or server initialization. Preserve legitimate Next server consumers.
- Distinguish erased type-only edges from runtime edges. Browser DTOs still belong in contracts; report cross-package type coupling separately.
- Reject contracts -> server/app/seed, server -> app/seed, and app -> seed, including paths hidden behind aliases or re-export barrels.
- Allow only audited portable contracts dependencies. Do not import runtime code to inspect it.
- Use Next's server-only boundary marker where compatible with entrypoints; do not break Bun CLI/worker reuse by indiscriminately inserting a Next-specific marker into shared backend modules.

Tests must include allowed contracts locales and types, direct and indirect forbidden imports, client route files, side-effect imports, dynamic imports, requires, relative escapes, and aliases. Negative fixtures should run through the real checker/configuration, not merely duplicate a helper predicate.

Acceptance: both actual graphs pass; each representative forbidden graph fails with the path that caused the violation.

## 11. Phase E — Docker, CI, and runtime verification

1. Include all workspace manifests in frozen-install stages, including new Kafil contracts. Handle actual Bun workspace links and packages without local node_modules.
2. Build from a clean context with no private generated server output or host env file.
3. Package the production Next build plus source workspaces, dependencies, configs, migration files, locale catalogs, theme/storage assets, and operational entrypoints required by each image command.
4. Audit web, worker, migration, and scheduled jobs individually. Keep the Next output/tracing configuration owned by Najm; verify traced files and non-web runtime files separately.
5. Use harmless synthetic env markers in isolated contexts to prove exclusion from the context and final image. Never copy real secrets for testing.
6. Run both image builds and in-image imports/entrypoints. A local source build is not image proof.
7. Against disposable PostgreSQL/Redis and console/memory/local mail, prove web startup/readiness, an authenticated read, and worker initialization/shutdown with external delivery disabled.
8. Run focused login/dashboard/provider/browser checks for language, theme, auth, and source-migration regressions using the repositories' acceptance guidance.
9. Update CI to invoke the unified commands and retain existing tests, i18n checks, schema metadata gates, and image workflows.

Readiness endpoints: School `/api/health/status`; Kafil `/api/system/readiness`.

No production deployment is needed for migration acceptance. If Docker or disposable services are unavailable, leave those gates unchecked and report source implementation separately from runtime acceptance.

## 12. Phase F — document and reuse the standard

1. Update each `docs/architecture/workspace.md`, README, AGENTS/CLAUDE guidance, and relevant skill references to match the implemented v2 layout.
2. Replace stale statements that catalogs live in server, School exports compiled output, contracts are dependency-free, or web may depend on seed. Update i18n commands and ground-truth file pointers.
3. Preserve the v1 archive as historical evidence. Do not present v1 test results as validation of v2.
4. Add a concise new-app checklist to the architecture document: app/server/contracts/seed ownership, explicit source exports, common commands, one env file, single Najm composition, boundary checks, and complete runtime packaging.
5. Use `apps/web` and `tsconfig.base.json` in future starters. Existing School path/config names can remain where their behavior matches the standard; avoid cosmetic migration risk.
6. Keep reusable framework fixes in published Najm packages. A new generator, cross-repo shared tooling package, or Najm release is not required by this plan.

Acceptance: a developer can follow the documented structure for a future app without choosing between School and Kafil compilation or import policies.

## 13. Verification and completion checklist

Each item is v2 work and started unchecked. State on 2026-09-22 (details in each repository's evidence record):

- [x] Baseline captures both dirty worktrees and relevant installed toolchains.
- [x] School source-export compatibility proves decorators, DI, routes, workers, and assets. Dev and Bun requests passed against a throwaway database; the production bundle registered every controller before stopping at the required Redis check.
- [x] Both repositories have source-exported contracts and server packages.
- [x] Catalogs and shared pure helpers have one contracts owner, with parity tests.
- [x] Browser graphs cannot reach server or seed; reverse dependency checks reject bypasses.
- [x] School's app-to-seed faker imports are removed without losing development behavior.
- [x] Root dev/build/start need no private server prebuild or custom restart watcher.
- [x] Lint and typecheck cover app, contracts, server, seed, and maintained automation.
- [x] Existing safe suites, i18n checks, and static schema gates pass without lost coverage.
- [x] Both fresh snapshots pass frozen install, typecheck, and build with no generated artifacts.
- [ ] Source edits, compilation failure/recovery, HTTPS, and shutdown work in development. Edits and failure/recovery passed; HTTPS was not run (it provisions a local CA), and POSIX shutdown signals cannot be delivered on this Windows host.
- [x] Local/inherited/injected-only environment behavior remains correct. Injected-only snapshots passed, and a missing env file is tolerated with injected values winning.
- [ ] Both images build; workspace resolution and synthetic secret exclusion are verified. Blocked: Docker is not installed.
- [ ] Disposable web readiness, authenticated read, and worker boot/shutdown pass. Dev-mode readiness, authenticated reads and worker boot passed; production mode is blocked without Redis, and shutdown without Linux signals.
- [x] Focused login/dashboard/provider browser acceptance passes (School).
- [x] No schema migration, dependency upgrade, secret change, or unrelated rewrite occurred.
- [x] Documentation and future-app checklist match executable configuration.

Record commands, exit codes, toolchain versions, baseline revision plus tested dirty diff, and pending gates under each repository's `docs/evidence/workspace-standardization-v2/`. Use secret-free evidence. For each gate, distinguish not run, passed, failed, and blocked.

The rewrite itself requires document/link/consistency checks only. Do not run application builds or connected operations merely to edit this plan.

## 14. Rollback and implementation order

Delivery order: baseline/compatibility -> contracts extraction -> School source conversion -> boundary enforcement -> packaging/acceptance -> documentation.

Keep changes reviewable per repository. Preserve current dirty work; use snapshots or task-scoped patches for rollback. No staging, commits, pushes, or deployment without a corresponding request.

- Contracts extraction: move code back together with consumer imports, package dependencies, and checker rules; never leave duplicated catalogs.
- Source conversion: restore the previous export map, scripts, compiler configuration, and container copies as one unit if compatibility fails. Preserve the validated v1 fallback until v2 acceptance is established.
- Environment: retain the already migrated app-local files. V1's temporary secret backup was removed; do not assume it still exists or recreate a second active env file.
- CI/Docker: restore compatible commands and file lists together. Preserve runtime configuration and data.
- Checks: fix or narrow an incorrect rule with a regression fixture; do not remove enforcement to obtain a green result.

Deferred: renaming School's app directory, separate `apps/worker`, merging repositories, a new UI package, new business features, generated app scaffolding, and framework publication. Source exports, Kafil contracts, shared-catalog extraction, and removal of browser server imports are explicitly included in v2.
