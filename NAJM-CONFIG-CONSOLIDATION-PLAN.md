# Najm config consolidation: move repeated server config out of the apps

Status: **PLANNED — NOTHING IMPLEMENTED.** Najm versions are the pins in the root `package.json`. The Najm source is the sibling repository `../najm`; the second consumer is `../kafil`.

Prepared: **2026-10-04**

School (`packages/server/src/config`) and Kafil (`../kafil/packages/server/src/config`) re-implement the same server configuration almost line for line: env parsing, the email provider switch, the Redis client, trusted proxy hops, theme diagnostics and the wiring around `najm-auth`. The Next.js side is already consolidated (`najm.auth.ts` is `defineAuth(app.auth)` in both apps), so this plan covers the server only.

Each work item below gives the problem, the evidence, the Najm change, the migration in each app, the release, and when it is done. Section 0 is the summary; section 6 sets the order.

## 0. Start here

### 0.1 The rule for what moves

Code moves into Najm when **both** of these hold:

1. At least two consumers (School, Kafil, Najm's `apps/playground`) contain it.
2. None of it refers to the domain: no school, sponsor, year, role name or table of one app.

Code that only School has stays in School until a second consumer needs it, even if it looks generic (the RAG embedding env parsing is the example). An app's **policy** (which roles, which limits, which origins) stays in the app; Najm takes the **mechanism** (parsing, validation, client construction, defaults).

### 0.2 Summary of work items

| # | Item | Najm package(s) | Kind of release | Value |
| --- | --- | --- | --- | --- |
| W1 | `auth()` stops building its dependencies eagerly; config is passed once | `najm-core`, `najm-auth` | minor + minor | Removes duplicated config, and a silent ignored-config trap (section 1.1) |
| W2 | Env readers | `najm-core` (new `najm-core/env` subpath) | minor | Base for W3–W5; same validation in every app |
| W3 | Email config from env, validated and lazy; failures logged by default | `najm-email` | minor | ~60 identical lines per app; School gains failure logging |
| W4 | Redis cache config helper | `najm-cache` | minor | Identical client and URL validation per app |
| W5 | Trusted proxy hops; behavior when no client address exists | `najm-rate` | minor (+ owner decision) | Same parsing per app; possible dev rate-limit bug in School |
| W6 | Ownership row conditions (`when()`), `ownedIds`, named tokens | `najm-auth` | minor | Removes School's subclass of a najm-auth internal |
| W7 | Defaults: theme diagnostics, MCP, server-side i18n | `najm-theme`, `najm-mcp`, `najm-i18n` | patch/minor, i18n possibly major | Removes restated defaults; probable i18n bug in Kafil |
| W8 | Kafil-only cleanup (not a Najm change) | — | — | Kafil hand-writes what `defineRoles` already does |

### 0.3 Decisions the owner must make

| # | Decision | Options | Recommendation |
| --- | --- | --- | --- |
| D1 | When an app registers `cache`/`email`/`rateLimit` itself **and** passes config for it to `auth()` (W1) | ignore silently (today) · warn · throw | **Warn** in this release, throw in the next major |
| D2 | `najm-rate` when the client address cannot be resolved (W5) | one shared bucket (today) · skip outside production · reject | Decide after the W5 check confirms School's dev behavior |
| D3 | `najm-i18n` server default order and cookie cache (W7) | change the default (major) · add an opt-in preset (minor) | **Opt-in preset now**, default in the next major |
| D4 | Kafil adopts stricter env validation (W2–W4) | accept · keep Kafil's lenient parsing | **Accept**, after checking Kafil's deployed env values parse |

## 1. Verified facts this plan rests on

Each fact was checked in source on 2026-10-04, not inferred.

### 1.1 Plugins register in `.use()` order and a registered name wins

`Server.use()` calls `PluginRegistry.register()` immediately (`najm-core/src/server/index.ts:128`). A dependency passed to `.depends()` is auto-registered **only if no plugin of that name exists yet** (`PluginRegistry.ts:61`).

`auth()` declares `.depends(cache(config?.cache), cookies(), i18n(), guards(), validation(…), rateLimit(config?.rateLimit), email(config?.email))` (`najm-auth/src/AuthPlugin.ts:244-256`). najm-auth reads `config.cache`, `config.rateLimit` and `config.email` nowhere else.

Consequences:

- **School** `.use()`s `cacheConfig()`, `rateLimitConfig()`, `emailConfig()` and `guardConfig()` before `authConfig()` (`packages/server/src/index.ts:55-62`). So the `cache`, `rateLimit` and `email` that [authConfig.ts:27-32](packages/server/src/config/authConfig.ts#L27-L32) passes to `auth()` are **never used**. They are the same values today only because the same resolver functions produce both.
- **Kafil** registers `emailConfig()` before `authConfig()` but registers no cache or rate-limit plugin (`../kafil/packages/server/src/server.ts:45-58`). In Kafil the forwarded `cache` and `rateLimit` config **is** used and the forwarded `email` is not.
- The types comment on `AuthPluginConfig.cache` ("a consumer cannot configure the store by registering its own plugin first") is wrong for current najm-core: registering first is exactly what decides it.

### 1.2 Why the apps forward email config anyway

`email()` validates in `mergeConfig` at call time and throws when no provider is set (`najm-email/src/EmailPlugin.ts:86-88`). `auth()` calls `email(config?.email)` while building its `.depends()` list, **before** the registry decides to skip it. Without forwarding, an app whose provider comes from its own config (not the `EMAIL_PROVIDER` variable) crashes at startup even though auth's email plugin would be discarded. School's comment at [authConfig.ts:29-31](packages/server/src/config/authConfig.ts#L29-L31) describes this effect.

### 1.3 najm-email's built-in env loader is unusable as written

`loadProviderFromEnv` exists but runs at module load (`DEFAULT_CONFIG`, `EmailPlugin.ts:58-71`), which is the Next build problem School's [emailConfig.ts:66-70](packages/server/src/config/emailConfig.ts#L66-L70) describes. It also validates nothing: a missing API key becomes `''`, SMTP credentials become `{ user: '', pass: '' }`, a bad `SMTP_PORT` becomes `NaN`, and an unknown provider becomes `undefined`.

### 1.4 A failed email send leaves no trace in School

`EmailService.send` reports a provider failure only through the `email:failed` event. Kafil listens (`EmailDeliveryLogger`, `../kafil/packages/server/src/config/emailConfig.ts:90-112`). **School has no `email:failed` listener anywhere** (grep over `packages` and `apps`).

### 1.5 Rate limiting with zero trusted proxies needs the socket peer

With `trustedProxyHops: 0`, `resolveClientAddress` uses only the socket peer; if the runtime exposes none, every request gets the key `'unresolved'` (`najm-rate/src/clientAddress.ts:161-169`). Kafil's comment says a Next route handler exposes no socket peer, and Kafil skips rate limiting in that case in development. School defaults to 0 hops outside production and does not skip. **Not yet confirmed on School's running server** — W5 step 1.

### 1.6 Defaults the apps restate

| Package | Option | Najm default | School | Kafil |
| --- | --- | --- | --- | --- |
| `najm-mcp` | `path` | `'/mcp'` (`McpTransportService.ts:488`) | `'/mcp'` | `'/mcp'` |
| `najm-mcp` | `exposeErrorDetails` | `false` (only `=== true` exposes) | `false` | `false` |
| `najm-theme` | `diagnostics` | a built-in reporter (`server/config.ts:343`) printing `[najm-theme] code: detail` | own copy, adds `scopeId` and `error` | identical copy |
| `najm-i18n` | `order` / `caches` | `['cookie','querystring','header']` / `['cookie']` (`I18nService.ts:450-455`) | `['header','cookie','querystring']` / `[]`, header `X-Language` | defaults |

School overrides i18n because the cookie cache pinned a page to the first language guessed, so a French page received English refusals ([coreConfig.ts:36-47](packages/server/src/config/coreConfig.ts#L36-L47)). Kafil sends no language header and keeps the defaults, so **Kafil probably has the same bug** (W7 step 3 confirms).

## 2. Inventory

| Concern | School | Kafil | Najm today |
| --- | --- | --- | --- |
| Env readers | [env.ts](packages/server/src/config/env.ts): `envString`, `requireEnv`, `envFlag`, `envInt`, `envChoice`, `isProduction`, `isNextBuildPhase` | Inline `required`, `enabled`, `redisUrl`, `trustedProxyHops`; `Number(...)` with silent fallbacks | Nothing |
| Email provider from env | [emailConfig.ts](packages/server/src/config/emailConfig.ts), defaults to `console` | `emailConfig.ts`, requires `EMAIL_PROVIDER` | Unvalidated, import-time loader (1.3) |
| Email failure logging | None (1.4) | `EmailDeliveryLogger` plugin | Event only |
| Redis client | [cacheConfig.ts:39-48](packages/server/src/config/cacheConfig.ts#L39-L48) | `authConfig.ts:56-68`: identical options | Builds its own client from `url` with a dynamic `require('ioredis')` |
| Redis URL validation | [cacheConfig.ts:17-37](packages/server/src/config/cacheConfig.ts#L17-L37) | `envConfig.ts:5-22`: identical rule | None |
| Trusted proxy hops | [rateLimitConfig.ts](packages/server/src/config/rateLimitConfig.ts), `SCHOOL_TRUSTED_PROXY_HOPS` | `envConfig.ts:24-40`, `KAFIL_TRUSTED_PROXY_HOPS` | Validates the number only |
| Config passed twice to `auth()` | cache, rate limit, email (all ignored, 1.1) | cache, rate limit (used), email (ignored) | `.depends()` builds eagerly |
| Ownership extensions | `SchoolOwnershipToken` + `when()` + `ownedIds` ([auth.ts](packages/server/src/auth.ts)) | `definePolicy` names the token | `OwnershipToken`, no row conditions |
| Role guards | `defineRoles` + `createGroupGuard` | 12 hand-written guard classes | `defineRoles` exists |
| Theme diagnostics | Copy | Identical copy | Built-in default |
| MCP options | Restates defaults | Restates defaults | Defaults exist |
| Theme audit sink | Writes `auditLogs` | Writes `auditEvents` | Takes a sink — **stays in apps** |

The Najm playground (`../najm/apps/playground/src/server/config/plugins.ts`) also reads env directly and hard-codes `trustedProxyHops: 0`. It is a third, lower-weight consumer of W2.

## 3. Work items

### W1. `auth()` uses registered plugins and stops building its dependencies eagerly

**Problem.** Facts 1.1 and 1.2: config is passed twice; in School the second copy is dead; the eager `email()` call forces apps to forward email config just to avoid a startup crash; nothing reports when forwarded config is ignored.

**Najm change.**

1. `najm-core`: `.depends()` also accepts a **lazy dependency**, `{ name, create: () => NajmPlugin }` (or a `lazy('cache', () => cache(cfg))` helper). `PluginRegistry.registerDependencies` calls `create()` only when `name` is not registered. Plain plugins keep working (additive, minor).
2. `najm-auth`: declare `cache`, `rateLimit` and `email` as lazy dependencies. `email()` is then never called when the app registers email itself, so the startup crash goes away.
3. `najm-auth`: when a dependency is already registered **and** `auth()` received config for it, warn once at startup naming the ignored option (decision D1). Fix the `AuthPluginConfig.cache` doc comment.

**School migration.** [authConfig.ts](packages/server/src/config/authConfig.ts) drops `cache`, `rateLimit` and `email` and their imports. It keeps `dialect`, `encryptionKey` and `registrationMode`. The `resolveCacheConfig`, `resolveEmailConfig` and `resolveTrustedProxyHops` exports from [config/index.ts](packages/server/src/config/index.ts) are no longer needed outside their files.

**Kafil migration.** Choose one owner per plugin: either `.use(cache(...))` and `.use(rateLimit(...))` explicitly before `authConfig()` (recommended; matches School and makes the order visible), or keep forwarding to `auth()`. `authInfrastructureConfig()` then serves one caller. Drop the forwarded email config.

**Tests.** najm-core: a lazy dependency is not created when its name is registered, and is created once when it is not. najm-auth: with the app's `email()` registered and no `EMAIL_PROVIDER`, `auth()` starts; the warning fires when both are given. School: `bun run test:security:transport` (rate limits and sessions run through these plugins).

**Done when.** Neither app passes config for a plugin it also registers, and School starts with `EMAIL_PROVIDER` unset in a shell that does not load `.env.local`.

### W2. `najm-core/env`

**Problem.** School has a careful 67-line reader module; Kafil re-implements parts of it inline with weaker rules. In Kafil, `EMAIL_RETRY_ATTEMPTS=abc` quietly becomes 1 and `SMTP_PORT=abc` throws; in School both stop startup with a message naming the variable.

**Najm change.** New subpath `najm-core/env` with no dependencies, exporting School's readers unchanged in behavior: `envString`, `requireEnv`, `envFlag`, `envInt`, `envChoice`, `isProduction`. Keep School's design rule from the top of [env.ts](packages/server/src/config/env.ts): **the caller passes the name and the literal `process.env.NAME` value; a reader never looks a name up**, so every variable stays a greppable read the bundler can see. `isNextBuildPhase` goes to `najm-next` (it is Next-specific), not to `najm-core`.

**School migration.** [env.ts](packages/server/src/config/env.ts) is deleted, and its importers (`cacheConfig`, `coreConfig`, `emailConfig`, `ragConfig`, `rateLimitConfig`) import from `najm-core/env`. Port School's existing behavior as Najm's tests, so nothing changes for School.

**Kafil migration.** Replace the inline readers in `envConfig.ts` and `emailConfig.ts`. Before switching, run the new readers over Kafil's deployed env values (decision D4); a value that used to fall back silently will now stop startup.

**Tests.** In najm-core: blank equals unset; malformed values throw with the name; `envInt` bounds and its error text; `envChoice` lower-cases and lists the choices.

**Done when.** No server config file in either app defines its own env parsing.

### W3. Email from env, validated and lazy; failures logged

**Najm change in `najm-email`.**

1. Export `emailConfigFromEnv(env, { defaultProvider?: ProviderName })`, built on W2. It contains School's switch ([emailConfig.ts:28-82](packages/server/src/config/emailConfig.ts#L28-L82)): `requireEnv` for API keys and `SMTP_HOST`, SMTP user/pass both or neither, port 1–65535, `EMAIL_RETRY_*` validated. With no `defaultProvider`, an unset `EMAIL_PROVIDER` throws (Kafil's behavior); School passes `'console'`.
2. Move the module-level `DEFAULT_CONFIG` env reads into `mergeConfig`, so importing `najm-email` reads nothing. The fallback to env when no config is passed stays, so this is a minor release.
3. Log `email:failed` through `LoggerService` by default, with provider and subject only (never recipients), the way Kafil's `EmailDeliveryLogger` does. Option `logFailures: false` turns it off.

**School migration.** `emailConfig.ts` becomes about five lines: `email(emailConfigFromEnv(process.env, { defaultProvider: 'console' }))`, plus `defaultFrom` set to `noreply@sms.local`. Keep the env-variable list in the file's header comment; it is School's documentation. School gains failure logging with no code.

> Passing `process.env` whole departs from W2's literal-read rule. It is acceptable here because `najm-email` documents the variable names and the call runs at runtime, not at import. If the owner prefers literal reads, the helper can instead take an object `{ EMAIL_PROVIDER: process.env.EMAIL_PROVIDER, … }`.

**Kafil migration.** `emailConfig.ts` keeps one line. Delete `EmailDeliveryLogger` and `emailDiagnosticsConfig` and their `.use()` call.

**Tests.** In najm-email: each provider's required variables; the SMTP pairing rule; importing the package with no env set does not throw; a failed send logs once without the recipient.

**Done when.** Neither app contains a provider switch or a failure listener.

### W4. Redis cache config helper

**Najm change in `najm-cache`.** Export `redisCacheConfig({ url, keyPrefix, required, Redis, buildPhase? }): CachePluginConfig` containing:

- the URL rule: `redis:`/`rediss:`, a hostname, and a password when `required`;
- the client School and Kafil both build (`lazyConnect`, `maxRetriesPerRequest: 3`, retry up to 3 times with a 2 s cap, the error handler);
- memory when `url` is unset and not `required`;
- memory with `required: false` when `buildPhase` is true (School's `isNextBuildPhase()` case).

The **app passes the ioredis constructor** (`Redis`). Both apps build the client themselves instead of passing `url` to `najm-cache`, whose driver uses a dynamic `require('ioredis')`. **Confirm the reason first** (git history of School's `cacheConfig.ts`; most likely the Next bundle not tracing the dynamic require). If it is the bundle, the constructor parameter keeps the static import in the app. If it isn't, `najm-cache` can construct the client from `url` and the parameter goes away.

**School migration.** [cacheConfig.ts](packages/server/src/config/cacheConfig.ts) becomes the `REDIS_URL` documentation, `KEY_PREFIX = 'school:'`, and one call.

**Kafil migration.** Delete `redisClient` and `redisUrl`; `envConfig.auth.cache` reduces to the call.

**Tests.** In najm-cache: each URL rejection; production without a URL throws; build phase yields memory. School: `test:security:transport` with `REDIS_URL` set.

**Done when.** Neither app constructs a Redis client or parses a Redis URL.

### W5. Trusted proxy hops and the unresolved client address

1. **Check School first.** Run School's dev server, send two requests to a rate-limited route, and look for najm-rate's `'unresolved'` warning or a shared bucket. That confirms or refutes fact 1.5 for School.
2. **Hops parsing.** After W2 this is `envInt(name, value, { fallback: isProduction() ? 1 : 0, max: 8 })` in each app. Optionally export `MAX_TRUSTED_PROXY_HOPS` from `najm-rate` so the 8 is not repeated. **Do not rename the env variables** (`SCHOOL_TRUSTED_PROXY_HOPS`, `KAFIL_TRUSTED_PROXY_HOPS`): deployments set them.
3. **If step 1 confirms the problem**, add to `najm-rate` an `onUnresolvedClient: 'shared' | 'skip' | 'reject'` option, defaulting to `'shared'` (today's behavior, minor release). Each app chooses per decision D2. Kafil's hand-written `skip` is then replaced by the option.

**Done when.** Each app sets hops with one `envInt` call and the dev behavior is a stated choice rather than an accident.

### W6. Ownership row conditions upstream

**Problem.** School's `SchoolOwnershipToken` overrides `OwnershipToken.for()` and writes into the table `getRules()` returns. It throws at startup if najm-auth ever returns a copy (`throw new Error('najm-auth no longer returns its live rule table; …')` in [auth.ts](packages/server/src/auth.ts)). Any najm-auth refactor of that internal breaks School's ownership. Kafil separately wraps `own()` to give tokens a name.

**Najm change in `najm-auth`.**

1. `OwnershipToken.for(role, ...steps)` accepts a row-condition step, `when(...rules)` with `rules: SQL | ((userId, role) => SQL)`. It works after a join chain (narrows it) and alone (the whole rule). This is School's semantics, ported as-is.
2. Export `ownedIds(token, role, userId)` (School's subquery helper).
3. `own(table, { name })` sets the token's name (Kafil's `definePolicy`).

**School migration.** Delete `RowCondition`, `when`, `SchoolOwnershipToken` and `ownedIds` from [auth.ts](packages/server/src/auth.ts) and re-export najm-auth's. Keep School's own `own()` wrapper: it injects `SCHOOL_WIDE_ROLES`, which is School policy. CLAUDE.md's rule that owned repositories import `own`/`Owned` from `packages/server/src/auth.ts` still holds.

**Kafil migration.** Replace `definePolicy` with `own(table, { name, ...options })`.

**Tests.** School: `bun run test:ownership`. **The generated SQL of every owned read must be byte-identical before and after**, and the `AlertGuards.ts` and `AnnouncementGuards.ts` audience rules must keep passing. Port School's `when()` cases into najm-auth's suite.

**Done when.** No app subclasses `OwnershipToken`.

### W7. Defaults

1. **Theme diagnostics.** Add `scopeId` and the error to `najm-theme`'s built-in reporter (patch), then delete `reportThemeDiagnostic` and the `diagnostics` option from both apps' `themeConfig.ts`. Both apps also pass `basePath: ''`, `features: { mcp: true }` and `storage: { namespace: 'theme-branding' }`. Check each against `najm-theme`'s current defaults; make one a default only if a third consumer would want it too, otherwise leave it explicit.
2. **MCP.** Delete `path: '/mcp'` and `exposeErrorDetails: false` from both apps; they are the defaults (1.6). Keep `cors: false` and `auth: { type: 'najm-auth' }`, which are not defaults and are security choices each app states.
3. **i18n.** First confirm Kafil's symptom: on a non-English Kafil page, trigger a server refusal and check its language. Then, per D3, add an opt-in server preset to `najm-i18n` (for example `i18n({ ...options, server: { languageHeader: 'X-Language' } })`) that produces School's `order: ['header','cookie','querystring']`, `lookupFromHeaderKey` and `caches: []`. School's [coreConfig.ts:36-47](packages/server/src/config/coreConfig.ts#L36-L47) uses it. Kafil adopts it together with sending its interface language as a header from its web app.

**Tests.** School: `bun run test:server-i18n`. Kafil: a refusal in a non-default language.

### W8. Kafil-only cleanup (no Najm release)

- Replace the 12 hand-written guard classes in Kafil's `authConfig.ts` with `defineRoles(...)` + `createGroupGuard([...])`, as School's [auth.ts](packages/server/src/auth.ts) does.
- Investigate the comment on `KafilRoleGuard`: it resolves the bearer token itself "when Najm's auth middleware has not yet published its request context". If guards can run before auth's context exists, that is a najm-auth ordering bug and gets its own fix and test in Najm, not a workaround in each app.

## 4. Not moving, and why

| Stays | Reason |
| --- | --- |
| [yearScope.ts](packages/server/src/config/yearScope.ts), the year hooks in [mcpConfig.ts](packages/server/src/config/mcpConfig.ts) | School's academic-year domain |
| [chatbotConfig.ts](packages/server/src/config/chatbotConfig.ts), the system prompt, `TOOL_DEPENDENCIES`, the Darija rewrite | School's tools and language |
| [ragConfig.ts](packages/server/src/config/ragConfig.ts) embedding env parsing | Generic, but only School has it (rule 0.1) |
| `SCHOOL_WIDE_ROLES`, `isAdministrator`, `isFinancial`, `isStaff`, `registrationMode` | Policy |
| [storageConfig.ts](packages/server/src/config/storageConfig.ts) limits and guards, CORS origins | Policy |
| Theme audit sink | Each app writes its own audit table |

## 5. What each School config file becomes

Estimates. They are checked against the real result when each item lands.

| File | Now | After | By |
| --- | --- | --- | --- |
| `env.ts` | 67 | deleted | W2 |
| `emailConfig.ts` | 84 | ~25 (mostly the env comment) | W3 |
| `cacheConfig.ts` | 65 | ~20 | W4 |
| `authConfig.ts` | 38 | ~25 | W1 |
| `themeConfig.ts` | 57 | ~45 | W7 |
| `rateLimitConfig.ts` | 21 | ~15 | W5 |
| `auth.ts` ownership section | ~75 | ~15 | W6 |

Kafil loses more: the email switch and logger (~110 lines), the Redis and env helpers (~70), the forwarded auth infrastructure, and through W8 about 230 lines of guards.

## 6. Order and releases

Each phase is one Najm release set, then a pin bump in **both** apps: the exact version in each workspace, plus the matching root `overrides` entry. `scripts/tests/najm-pins.test.mjs` (in `bun run test:boundaries`) checks both. Publish with Najm's normal publish flow. Migrate one app per commit, so a regression points at one app.

| Phase | Items | Why this order |
| --- | --- | --- |
| 1 | W2, W1 | W2 is the base for W3–W5. W1 removes the dead config and the eager-email crash before W3 changes email. |
| 2 | W3, W4, W5 step 1 | Each removes a whole duplicated block; W5's check informs D2. |
| 3 | W6 | Highest risk to data (row visibility); runs alone with the SQL comparison. |
| 4 | W5 steps 2–3, W7, W8 | Small, independent. |

## 7. Verification per release

School, after each pin bump:

- `bun run check` (lint, typecheck, i18n, safe tests, build, `db:check`);
- `bun --env-file=apps/dashboard/.env.local run test:security:transport` for W1, W4 and W5;
- `bun run test:ownership` for W6, comparing generated SQL;
- `bun run test:server-i18n` for W7;
- a dev-server start with `EMAIL_PROVIDER` unset for W1 and W3.

Kafil: its own full check and test suite after each bump, plus the W7 language check.

Najm: each package's own tests; the new tests listed per item port the behavior School and Kafil rely on.

## 8. Risks

| Risk | Mitigation |
| --- | --- |
| W1 changes which plugin config wins in Kafil (it relies on auth registering cache and rate limit) | Kafil registers them explicitly in the same release; the D1 warning shows any leftover |
| W2–W4 make Kafil's startup stricter | D4: dry-run Kafil's deployed env values through the new readers before switching |
| W6 changes which rows a role sees | Byte-identical generated SQL from `test:ownership` is the gate; no merge without it |
| W7 i18n default change would alter every consumer's language resolution | Opt-in preset first (D3); default only in a major |
| Version drift between School and Kafil during a phase | Bump both in the same phase; the pin test fails if a workspace drifts |

## 9. Progress ledger

| Item | Najm released | School migrated | Kafil migrated | Evidence |
| --- | --- | --- | --- | --- |
| W1 | — | — | — | — |
| W2 | — | — | — | — |
| W3 | — | — | — | — |
| W4 | — | — | — | — |
| W5 | — | — | — | — |
| W6 | — | — | — | — |
| W7 | — | — | — | — |
| W8 | n/a | n/a | — | — |
