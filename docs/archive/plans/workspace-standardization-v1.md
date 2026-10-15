# Archived workspace standardization v1

Archived: 2026-09-22. Historical plan and implementation record, superseded by [the v2 plan](WORKSPACE-STRUCTURE-STANDARDIZATION-PLAN.md). The original document follows unchanged apart from line-ending normalization. Its completed checks apply to v1 only; pending Docker and runtime evidence remains pending.

---

# School and Kafil workspace standardization plan

Status: implemented locally; Docker image and connected-runtime evidence remain pending because the required runtime is unavailable.
Prepared and implemented: 2026-09-22.
Repositories: `school` and sibling `kafil`. This file is the coordinating plan in School's root.

## 1. Decision and intended outcome

Keep both existing Bun workspaces. Standardize ownership, root command behavior, local environment conventions, and verification. Retain the existing app names and each repository's server compilation strategy for this project.

The package split is useful because web entrypoints, notification workers, and operational tools reuse backend code. It is not required by Next.js or Najm, and it does not by itself provide security isolation.

Success means a developer can install, develop, check, and build either repository from its root without guessing env locations or manually preparing missing server artifacts. Images must contain the workspace dependencies needed by their web, worker, and migration commands.

Implementation was requested on 2026-09-22. Publishing packages, pushing commits, deploying, modifying production configuration, or running database/data-changing commands remain separate actions and were not performed.

## 2. Verified starting point

These observations were checked against the current files. Recheck them before implementation because both repositories can change independently.

| Concern | School | Kafil |
| --- | --- | --- |
| Web application | `apps/dashboard` | `apps/web` |
| Internal packages | `server`, `contracts`, `seed` | `server`, `seed` |
| Server exports | Mostly compiled `dist` JS and declarations; source theme entry | TypeScript source subpaths |
| Local environment | `apps/dashboard/.env.local` | Root `.env`, explicitly loaded by command wrappers |
| Shared browser data | `contracts` enum tuples/types plus `server/locales` | `server/locales`, `server/phone`, `server/money/constants` |
| Web build command | `build` builds dashboard only; `build:all` builds server, checks seed, then dashboard | `build` builds web and consumes server source |
| Background runtime | Compose notification worker | Compose notification worker |
| Next config | Re-export of `najm-next/config` | Re-export of `najm-next/config` |

Concrete gaps and exceptions to address:

- School's `Dockerfile` explicitly copies server/seed/app manifests for installation but omits `packages/contracts/package.json`. Its runtime copy list also omits `packages/contracts`, even though server depends on that workspace. This is a source-level packaging gap; no clean image failure or live incident was reproduced during planning.
- School's root `dev`, `build`, and `typecheck` do not explicitly prepare the compiled server package. A populated checkout can hide a missing-artifact problem. Verify from a clean snapshot.
- School's `check` includes focused config tests but does not invoke its existing `test:access-reset` script. Coverage must be named honestly and the safe existing suites included in the common test flow.
- School seed scripts use `@server/*` source aliases. The dashboard's `devFill.ts` also reaches into `packages/seed/src/fakers` through `@/fakers/*`. These are existing exceptions to a strict package-export boundary.
- Both client providers import locale catalogs through a server-package subpath. Do not classify these imports as unsafe merely from the package name.
- Kafil's env paths appear in app/seed scripts, acceptance runners and their tests, root wrappers, and documentation. Migration requires a complete reference inventory.
- School currently has unrelated table/feedback edits, deleted shared feedback components, and an untracked `apiError.ts`. Kafil was clean at inspection. Preserve all existing work and recheck status before each phase.

## 3. Ownership contract

```text
repository/
  apps/
    dashboard/ or web/       Next routes, UI, app policy, runtime composition
  packages/
    server/                 Domain services, persistence, backend configuration
    contracts/              Optional pure shared domain values and types
    seed/                   Setup, fixture and maintenance commands
  scripts/                  Repository command orchestration, when needed
  package.json              Root command interface and dependency policy
  bun.lock                  One lockfile per repository
```

Allowed dependencies:

- Web server-side code, workers and seed tools may consume server exports.
- Browser code may consume contracts and explicitly reviewed browser-compatible exports such as locale catalogs or pure helpers.
- Server may consume contracts; contracts must not import server, app, seed, database clients, filesystem APIs, or environment-dependent modules.
- Server must not import app or seed implementation. Audit current exceptions before enforcing this rule.
- Seed commands must not become dependencies of production UI execution. Distinguish a pure development fixture helper from an operational CLI with side effects.
- Application-specific domain rules remain in each product. Generic framework capabilities shared by products belong in published Najm packages; no Najm release is required for this plan.

Keep the existing single `NajmAppProvider`, auth definition, module-scope server adapter, preference source, and shared Next config. `AppProviders.tsx` is app composition and belongs in the app. Moving it to a local package would not improve this architecture.

Keep School's contracts package. Do not introduce Kafil contracts or a translations package solely to match directory trees. A future extraction needs actual consumers and a demonstrated reduction in coupling.

## 4. Common developer interface

The same root command names should have the following outcomes. Their internal implementation can differ.

| Command | Required outcome |
| --- | --- |
| `bun install --frozen-lockfile` | Install declared workspace dependencies from the committed lockfile |
| `bun run dev` | Prepare necessary artifacts, then start a usable local web application |
| `bun run dev:https` | Same environment and preparation, with the app's HTTPS development option |
| `bun run build` | Produce all artifacts required to start the production web application from a clean checkout |
| `bun run start` | Start the existing production build; do not silently compile on startup |
| `bun run lint` | Run documented lint coverage, retaining existing repository checks |
| `bun run typecheck` | Check app, server, contracts when present, and seed; prepare required declarations first |
| `bun run test` | Run explicitly selected automated tests that do not require a live database, browser, or real delivery service |
| `bun run check` | Compose lint, typecheck, safe tests, build, and repository-specific static checks |
| `bun run notifications:worker` | Start the worker with the intended environment; may mutate data or deliver notifications |
| `bun run db:*` / `seed:*` | Keep existing product-specific operations and their documented effects |

Do not normalize operational commands with different meanings merely by renaming them. In particular, seed/full/reset commands can clear data. They are never part of `check`.

Existing public script names remain compatible. School's `build:all` can remain as a compatibility entrypoint after `build` becomes complete, provided the scripts cannot recurse. Keep `build:server`, `build:seed`, `test:config`, and `test:access-reset` available.

## 5. Environment convention

Target local layout:

```text
School: apps/dashboard/.env.local          + .env.local.example
Kafil:  apps/web/.env.local                + .env.local.example
```

Choose this convention for predictable Next.js application loading, not as a security improvement over a root env file. Scripts and child processes with the same environment can still receive the same secrets.

- One local file per application; no duplicate package-owned env files.
- Root operational commands explicitly load the owning app's local file. Resolve paths against a known repository/app location, not an assumed caller directory.
- Next dev/build/start use app-local loading. Audit Bun's automatic env loading and inherited variables before simplifying wrappers.
- Values supplied by CI or the deployment environment must continue to work without a local file. No new requirement that production contain `.env.local`.
- Pre-existing process variables take precedence over file defaults. Verify this using harmless sentinel values with the installed toolchain.
- Keep production sources at `/opt/school/env/app.env` and `/opt/kafil/env/app.env`. Preserve Compose injection and build-time placeholder values.
- Templates contain placeholders only. Git and Docker exclusions must cover nested real env files, not just root files. Verify effective behavior rather than trusting the glob spelling.
- Browser-public values remain explicitly public. Do not promote credentials to `NEXT_PUBLIC_*` to resolve a loading problem.

## 6. Phase A: baseline and scope inventory

1. Capture branch, HEAD and status for each repository. Record unrelated changes without staging or rewriting them.
2. Inventory every app/package manifest, exported entrypoint, path alias, root script, CI command, Docker COPY list, and local-env reference.
3. Read current repository instructions and applicable skills before implementation. Kafil requires its frontend/backend skills when their respective code is touched, and its browser skill for acceptance-runner changes. Read installed Next documentation before changing Next integration.
4. Record baseline failures separately from new regressions. Use an isolated snapshot for clean-build checks; preserve or explicitly account for relevant uncommitted changes so the tested snapshot matches the intended patch.
5. Confirm installed Bun, Next and Najm versions. Keep exact published Najm pins and overrides; do not combine dependency upgrades with this work.

Deliverable: a short inventory and baseline record, including expected command coverage and actual import exceptions.

## 7. Phase B: repair School packaging and build orchestration

Primary files: root `package.json`, `Dockerfile`, `.dockerignore`, `.github/workflows/deploy-production.yml`, `packages/server/package.json`, `packages/server/build-types.mjs`, app build script, and relevant TypeScript configs.

1. Add contracts to School's dependency-stage workspace manifest copies and include its required runtime files. Account for Bun workspace links and actual node_modules layout; do not assume each package has a node_modules directory to copy.
2. Verify source worker execution resolves contracts, locale files, theme assets, source aliases and required TypeScript configuration in the final image. Include necessary files deliberately.
3. Make root `build` build server artifacts before the dashboard. Preserve seed validation through `typecheck`/`check`, and preserve compatible `build:all` behavior without duplicate builds or recursion.
4. Make root `dev` prepare the server before starting Next. Because School exports compiled server code, define an explicit server-edit loop: use a bounded orchestration script to rebuild required exports and restart or refresh the Next consumer. Handle initial ordering, rebuild failures, child termination and Ctrl+C on Windows. Never silently serve a failed rebuild as though it succeeded.
5. Ensure declarations exist before clean-checkout consumers are typechecked. Keep type preparation separate from database initialization.
6. Add root `dev:https` using the same preparation behavior; reuse the dashboard's existing HTTPS option and preserve its port.
7. Add seed typechecking and an explicit root `test` command covering current safe config/access-reset suites. Do not use an unrestricted test glob that inadvertently starts the Postgres integration suite.
8. Update CI to use the complete commands without weakening its existing gates. If root orchestration lives in `scripts/`, update School's `.dockerignore`, which currently excludes that directory, and runtime copies for commands that need it.

Retain School's compiled server exports and Kafil's source exports. A source-export conversion for School is deferred: decorators, metadata, asset resolution and worker behavior make it a separate technical change.

Acceptance: a clean snapshot installs, typechecks and builds through documented root commands; a disposable server/locale edit becomes visible through the dev workflow; the final image can resolve its web/worker/migration dependencies. No manually prebuilt `dist` or host env file is required for the image build.

## 8. Phase C: align Kafil environment loading

Primary files: root `package.json`, `apps/web/package.json`, `packages/seed/package.json`, root `.env.example`, `.gitignore`, `.dockerignore`, affected runners/helpers and their tests, README, AGENTS/CLAUDE, and deployment documentation where local paths are mentioned.

1. Inventory root `.env` assumptions in JS/TS, shell and PowerShell tooling, including guarded remote-acceptance preflights. Search file-path construction as well as literal `--env-file` strings.
2. Move the tracked placeholder template to `apps/web/.env.local.example`; update setup instructions and all active local loaders consistently.
3. Migrate the local secret file without printing its contents or putting them in patches/logs. Refuse to overwrite an existing destination. If both files exist, report the conflict and preserve both until the user resolves which configuration is authoritative.
4. Verify equality privately before retiring the old local file. Keep a recoverable copy outside the build context during verification. Finish with one active local configuration; avoid a permanent dual-file fallback with unclear precedence.
5. Simplify dev/build/start wrappers only after validating app-local loading, inherited env precedence, forwarded arguments, exit codes and signal behavior. Preserve HTTPS and preview helpers.
6. Point database, seed, worker and test runners to the new app-local file with correct paths from their own working directories. Preserve runner target guards and real-env requirements where those are intentional.
7. Update nested Git/Docker exclusions and placeholder exceptions. Prove the real app-local file is excluded from the Docker context and final image using synthetic marker content in an isolated fixture, never a real secret.
8. Keep production env paths, timer behavior, Compose services and real secret values unchanged. Test injected-env-only startup without the local file.

Acceptance: root development and app-local Next development resolve the expected config; every audited operational loader uses the same local file; remote preflight path tests pass without sending remote requests; image builds have no local secrets.

## 9. Phase D: document and enforce import boundaries

Primary files: package exports, TypeScript aliases, ESLint configuration, architecture documentation, and focused import checks where existing tooling is insufficient.

1. Classify each public subpath as browser-compatible, server-only, or tooling-only. Inspect its transitive imports and initialization behavior.
2. Keep existing locale subpaths and Kafil's pure helpers where they are safe. Allow type-only imports appropriately. Permit server exports in Next server entrypoints while rejecting backend runtime imports into client dependency graphs.
3. Review School's `@server/*` and faker aliases. Replace cross-package implementation imports with narrow package exports where practical. Preserve tests that deliberately read raw locale catalogs.
4. For the dashboard form-fill helper, inspect the transitive graph first. Keep a documented development-only exception or relocate the pure helper if it has a single owner. Do not add a general shared package or copy seed CLI dependencies into the browser to solve this one case.
5. Enforce contracts independence and the absence of server-to-app/seed reverse imports. Use existing lint capabilities before adding custom tooling. Scope restrictions so legitimate Next server composition and test fixtures keep working.
6. Verify client graphs contain no database driver, filesystem-dependent server initialization, or operational seed entrypoint. Browser-compatible translations and constants remain allowed.

Acceptance: supported imports typecheck and build, representative forbidden imports fail the boundary checks, and no application behavior changes. Record explicitly any audited exceptions.

## 10. Phase E: documentation and command consistency

1. Document the same root interface in each README and agent guide, with each project's concrete app name, port, env location, package exports and check coverage.
2. Keep one authoritative architecture document per repository and link to it rather than duplicating large instructions. Suggested location: `docs/architecture/workspace.md`.
3. Correct obsolete School Najm skill instructions that say to copy a root `.env` into the dashboard. Check `.agents`, `.claude`, and `.codex` copies/references; update active guidance losslessly.
4. Explain that one web/API runtime can coexist with separate worker processes and CLI jobs. Package count does not describe process count or deployment isolation.
5. Preserve current app directory names, provider composition, locale ownership, business modules and API routes. No framework package extraction is part of this phase.

## 11. Verification and evidence

For implementation, start with targeted checks, then run the applicable repository gates. The plan-writing task itself needs only document validation.

| Check | Required evidence |
| --- | --- |
| Clean install/build | Fresh snapshot with no generated server/app artifacts; frozen-lockfile install and complete root build succeed |
| Type and test coverage | Root typecheck includes all relevant workspaces; safe tests include pre-existing focused suites |
| School checks | Lint, typecheck, i18n check, safe test aggregate, complete build, and existing `db:check` metadata check |
| Kafil checks | Lint, typecheck, safe tests, build, and required `db:generate`; no new migration expected |
| Env loading | Synthetic sentinel resolves from root, app, worker/seed command contexts; injected value wins; no-local-file CI mode works |
| Image packaging | Clean image builds for both; contracts and other workspace links resolve inside School's final image |
| Dev rebuild | Controlled server/locale edit is reflected by School dev; compilation failure is surfaced and child processes exit cleanly |
| Import boundaries | Actual allowed graphs pass; representative client-to-backend and reverse imports are rejected |
| Runtime smoke | Web startup/readiness and worker boot verified only against disposable dependencies with delivery disabled |
| Diff hygiene | Changes limited to this plan's implementation; no secrets, new schema migration, unrelated rewrites, or accidental dependency upgrades |

Environment-loader tests must not execute real seed, migration, dispatch, or worker business operations merely to prove a path. Use child processes that report harmless sentinel values. Any connected acceptance uses isolated data, Redis, and console/memory mail, with external delivery disabled.

Readiness endpoints: School `/api/health/status`; Kafil `/api/system/readiness`. Exercise migrations or destructive seed commands only in explicitly disposable test databases, never the user's existing database for this task.

If Docker, a required runtime, or disposable services are unavailable, record the unverified gate explicitly. Source inspection and unit tests do not prove a working image or connected runtime. Full browser acceptance is separate; run focused login/dashboard/provider smoke when authorized and required by the changed runtime behavior.

Record source checks, image build, local runtime acceptance, Git publication, deployed revision, and browser/connected acceptance as separate results. This plan does not require production deployment to complete its implementation review.

## 12. Rollback and delivery order

Suggested implementation units:

1. School workspace packaging and clean-build orchestration.
2. School safe test/typecheck interface and development rebuild workflow.
3. Kafil local environment migration and loader regression coverage.
4. Narrow import-boundary changes justified by the audit.
5. Documentation and final cross-repository verification.

Keep each repository's commits independent and reviewable. Do not commit or push unless requested.

- Packaging/scripts: revert only the task's changes and retain unrelated work. Restore the previous documented command behavior if a gate fails.
- Env migration: restore loaders and the ignored local file location together from the verified local backup. Never overwrite a later user edit or expose secret content in a diff. Remove obsolete backup copies only after acceptance and with recovery understood.
- Import restrictions: narrow/revert the specific rule or export change that breaks a legitimate consumer; do not disable all boundary checks to make the build pass.
- No schema migration, database repair, or secret rotation is planned, so rollback must not touch database records or keys.

Deferred work: converting School to source exports, adding Kafil contracts, extracting locale packages, moving workers into `apps/worker`, renaming apps, merging repositories, and releasing new Najm packages. Each needs its own demonstrated benefit.

## 13. Completion checklist

- [x] Both repositories keep their current workspace and app names.
- [x] Root developer commands have the documented common outcomes.
- [x] School clean build/dev/typecheck no longer require hidden prebuilt artifacts.
- [x] School's Dockerfile includes contracts, root TypeScript configuration, server sources/assets, and the workspace links required by web, worker, and migration commands. Building and inspecting the final image remains pending because Docker is unavailable on this workstation.
- [x] Kafil uses one app-local env file and all active local loaders are updated.
- [x] Nested real env files are excluded from Git and Docker configuration, and injected-only clean builds work without local files. Synthetic Docker-context and final-image marker proof remains pending with the Docker gate.
- [x] Browser/server/tooling boundaries are documented and tested with narrow exceptions.
- [x] Safe verification excludes destructive seed, database integration, browser, and connected delivery operations.
- [x] Available repository gates pass; Docker, disposable runtime readiness/worker smoke, and browser/connected acceptance are explicitly pending.
- [x] Documentation agrees with executable configuration; unrelated School table/feedback work remains untouched.

## 14. Implementation verification record

School:

- `bun run check` passed: lint, contracts/server/seed/dashboard type checks, i18n validation, 181 config tests, 60 access-reset tests, boundary self-tests, complete server/seed/dashboard production build, and `db:check`.
- A fresh snapshot without `node_modules`, generated `dist`/`.next`, or `.env.local` passed `bun install --frozen-lockfile` and the complete root `bun run build` using injected throwaway build values.
- An isolated development probe confirmed initial server preparation, a successful server edit rebuild/restart, a surfaced compile failure with the dashboard stopped, and recovery/restart after the source was corrected. The Windows process-tree termination race found by this probe was fixed.
- No database mutation, browser test, commit, push, publication, or deployment was performed.

Kafil:

- `bun run check` passed: all workspace lint and type checks, 516 web tests, 456 server tests, 120 seed tests, and the production web build. Opt-in database tests remained skipped by the safe aggregate.
- `bun run db:generate` reported no schema changes and created no migration diff.
- A fresh snapshot without `node_modules`, generated output, root `.env`, or app `.env.local` passed `bun install --frozen-lockfile` and `bun run build` with injected throwaway values.
- Focused environment/runner tests passed, including app-local loading, inherited-value precedence, injected-only mode, and active operational-loader path auditing.
- The ignored local secret file was moved from root `.env` to `apps/web/.env.local` after private hash verification. Its temporary out-of-tree verification copy was removed after the final equality check; secret contents were never printed or patched.

Unavailable evidence:

- Docker is not installed, so clean image builds, synthetic Docker-context/final-image marker inspection, and in-image dependency resolution were not run.
- Disposable PostgreSQL/Redis/mail services were not provisioned, so readiness and worker boot smoke were not run.
- Browser and connected acceptance remain a separate proof boundary and were not run for this non-UI restructuring.
