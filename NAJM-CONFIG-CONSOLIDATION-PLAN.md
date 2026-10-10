# Najm config consolidation: move repeated server config out of the apps

Status: **IMPLEMENTED (2026-10-10).** Every Najm release is published; Kafil has completed W0 and W1–W8 on its own commits; School has migrated and verified W1–W7 (W8 is Kafil-only), including auth/session transport and production sender checks; its changes are uncommitted apart from the W6 baseline. Both apps resolve the same version of every Najm package they share (section 9). School's Najm versions are the pins in the root `package.json`; Kafil's are its own root `overrides` and lockfile. The Najm source is the sibling repository `../najm`; the second consumer is `../kafil`. Their pre-consolidation version baselines differed (section 0.4).

Prepared: **2026-10-04**

Reviewed and revised: **2026-10-10**

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
| W0 | Kafil compatibility upgrade and email patch retirement | Existing published packages | prerequisite; includes major upgrades | Establishes a verified baseline before consolidation |
| W1 | `auth()` stops building its dependencies eagerly; config is passed once | `najm-core`, `najm-auth` | minor + minor | Removes duplicated config, and a silent ignored-config trap (section 1.1) |
| W2 | Env readers and Next build-phase helper | `najm-core` (`najm-core/env`), `najm-next` (`najm-next/env`) | minor + minor | Base for W3–W5; preserves School's build-time cache safeguard |
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
| D2 | `najm-rate` when the client address cannot be resolved (W5) | one shared bucket (today) · skip outside production · reject | Decide after the W5 check confirms School's dev behavior. **Confirmed 2026-10-10:** School's dev server logs najm-rate's `'unresolved'` warning, so every dev request shares one bucket. **Decided 2026-10-10: skip outside production.** School and Kafil set `onUnresolvedClient: isProduction() ? 'shared' : 'skip'`; School's dev server then logs `affected requests are not rate limited (onUnresolvedClient: 'skip')`. |
| D3 | `najm-i18n` server default order and cookie cache (W7) | change the default (major) · add an opt-in preset (minor) | **Opt-in preset now**, default in the next major |
| D4 | Kafil adopts stricter env validation (W2–W4) | accept · keep Kafil's lenient parsing | **Accept**, after checking Kafil's deployed env values parse. **Accepted 2026-10-10.** The committed `deploy/env/*.example` values parse under the new readers; the live VPS values were not available to check. |

### 0.4 Version baseline and prerequisite

Checked against both root manifests and Kafil's lockfile on **2026-10-09**:

| Package | School | Kafil |
| --- | --- | --- |
| `najm-core` | `3.0.4` | `2.0.6` |
| `najm-auth` | `6.1.0` | `4.1.0` |
| `najm-email` | `3.0.0` | `2.0.4` + local patch |
| `najm-rate` | `3.0.0` | `2.1.1` |
| `najm-database` | `2.2.1` | `2.0.4` |
| `najm-storage` | `4.0.0` | `2.2.0` |
| `najm-mcp` | `2.2.5` | `2.1.2` |
| `najm-next` | `0.9.0` | `0.8.0` |
| `najm-i18n` | `2.1.3` | `2.1.2` |
| `najm-theme` | `0.3.0` | `0.2.1` |
| `diject` | `0.1.11` | `0.1.9` |

**W0 was the prerequisite for Kafil's adoption of phase 1.** School proceeded ahead of W0 at the owner's direction. The minor releases below are relative to School's pre-consolidation baseline. Kafil first needs a separately reviewed compatibility upgrade using existing published versions, including the Core, Auth, Email, Rate and Storage major changes. Re-read each app's pins when implementation starts; this table is a dated baseline, not a substitute for the manifests.

The sibling Najm source matches School's pins. It does **not** establish how Kafil's older packages behave. Kafil's app configuration can be inspected directly; claims about its dependency registration, defaults and middleware must be verified against matching historical source or through focused runtime tests during W0.

## 1. Verified facts this plan rests on

The original source review was on 2026-10-04; the pre-consolidation version baseline and app wiring were rechecked on 2026-10-09. This section records that earlier implementation at the versions in section 0.4, including historical source positions. Current behavior and verification are recorded in section 9.

### 1.1 Plugins register in `.use()` order and a registered name wins

`Server.use()` calls `PluginRegistry.register()` immediately (`najm-core/src/server/index.ts:128`). A dependency passed to `.depends()` is auto-registered **only if no plugin of that name exists yet** (`PluginRegistry.ts:61`).

`auth()` declares `.depends(cache(config?.cache), cookies(), i18n(), guards(), validation(…), rateLimit(config?.rateLimit), email(config?.email))` (`najm-auth/src/AuthPlugin.ts:244-256`). najm-auth reads `config.cache`, `config.rateLimit` and `config.email` nowhere else.

Consequences:

- **School** `.use()`s `cacheConfig()`, `rateLimitConfig()`, `emailConfig()` and `guardConfig()` before `authConfig()` (`packages/server/src/index.ts:55-62`). So the `cache`, `rateLimit` and `email` that [authConfig.ts:27-32](packages/server/src/config/authConfig.ts#L27-L32) passes to `auth()` are **never used**. They are the same values today only because the same resolver functions produce both.
- **Kafil** registers `emailConfig()` before `authConfig()` but registers no cache or rate-limit plugin (`../kafil/packages/server/src/server.ts:45-58`). Its current `authConfig()` forwards cache and rate-limit config and **does not forward email config**. Confirm which config wins after the W0 upgrade before changing this wiring.
- The types comment on `AuthPluginConfig.cache` ("a consumer cannot configure the store by registering its own plugin first") is wrong for current najm-core: registering first is exactly what decides it.

### 1.2 Why School forwards email config anyway

`email()` validates in `mergeConfig` at call time and throws when no provider is set (`najm-email/src/EmailPlugin.ts:86-88`). `auth()` calls `email(config?.email)` while building its `.depends()` list, **before** the registry decides to skip it. Without forwarding, an app whose provider comes from its own config (not the `EMAIL_PROVIDER` variable) crashes at startup even though auth's email plugin would be discarded. School's comment at [authConfig.ts:29-31](packages/server/src/config/authConfig.ts#L29-L31) describes this effect.

### 1.3 najm-email's built-in env loader is unusable as written

`loadProviderFromEnv` exists but runs at module load (`DEFAULT_CONFIG`, `EmailPlugin.ts:58-71`), which is the Next build problem School's [emailConfig.ts:66-70](packages/server/src/config/emailConfig.ts#L66-L70) describes. It also validates nothing: a missing API key becomes `''`, SMTP credentials become `{ user: '', pass: '' }`, a bad `SMTP_PORT` becomes `NaN`, and an unknown provider becomes `undefined`.

### 1.4 A failed email send leaves no trace in School

`EmailService.send` reports a provider failure only through the `email:failed` event. Kafil listens (`EmailDeliveryLogger`, `../kafil/packages/server/src/config/emailConfig.ts:90-112`). **School has no `email:failed` listener anywhere** (grep over `packages` and `apps`).

`EmailService.sendBulk` delegates directly to `provider.sendBulk` when available (`EmailService.ts:193-194`), including the implementation inherited from `BaseProvider`. That path emits no `email:failed` event. Kafil's listener also passes the raw error to `LoggerService`, which serializes its message and stack; excluding recipient fields from the metadata does not exclude addresses embedded in the error. A mocked source check on 2026-10-10 confirmed one failed bulk result emitted zero failure events, and a single-send error containing a recipient address appeared in Kafil-style logs. W3 must cover bulk failures explicitly and use safe log fields.

### 1.5 Rate limiting with zero trusted proxies needs the socket peer

With `trustedProxyHops: 0`, `resolveClientAddress` uses only the socket peer; if the runtime exposes none, every request gets the key `'unresolved'` (`najm-rate/src/clientAddress.ts:161-169`). Kafil's comment says a Next route handler exposes no socket peer, and Kafil skips rate limiting in that case in development. School defaults to 0 hops outside production and does not skip. **Not yet confirmed on School's running server** — W5 step 1.

### 1.6 Defaults the apps restate

| Package | Option | Najm default | School | Kafil |
| --- | --- | --- | --- | --- |
| `najm-mcp` | `path` | `'/mcp'` (`McpTransportService.ts:488`) | `'/mcp'` | `'/mcp'` |
| `najm-mcp` | `exposeErrorDetails` | `false` (only `=== true` exposes) | `false` | `false` |
| `najm-theme` | `diagnostics` | a built-in reporter (`server/config.ts:343`) printing `[najm-theme] code: detail` | own copy, adds `scopeId` and `error` | identical copy |
| `najm-i18n` | `order` / `caches` | `['cookie','querystring','header']` / `['cookie']` (`I18nService.ts:450-455`) | `['header','cookie','querystring']` / `[]`, header `X-Language` | no app override; verify older defaults in W0 |

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
| Config passed twice to `auth()` | cache, rate limit, email (all ignored, 1.1) | cache and rate limit forwarded only to auth; email registered separately | `.depends()` builds eagerly in School's version |
| Ownership extensions | `SchoolOwnershipToken` + `when()` + `ownedIds` ([auth.ts](packages/server/src/auth.ts)) | `definePolicy` names the token | `OwnershipToken`, no row conditions |
| Role guards | `defineRoles` + `createGroupGuard` | 12 hand-written guard classes | `defineRoles` exists |
| Theme diagnostics | Copy | Identical copy | Built-in default |
| MCP options | Restates defaults | Restates defaults | Defaults exist |
| Theme audit sink | Writes `auditLogs` | Writes `auditEvents` | Takes a sink — **stays in apps** |

The Najm playground (`../najm/apps/playground/src/server/config/plugins.ts`) also reads env directly and hard-codes `trustedProxyHops: 0`. It is a third, lower-weight consumer of W2.

## 3. Work items

### W0. Kafil compatibility upgrade before consolidation

**Problem.** Section 0.4 shows that Kafil is several major versions behind the source this plan reviews. Treating its migration as a minor pin bump would combine unrelated framework changes with the consolidation and leave its email patch unaccounted for.

**Kafil migration.**

1. Record its current manifests, lockfile and focused/full verification results. Review the published upgrade notes and matching source for each changed package, then select a coherent published baseline compatible with School's versions in section 0.4. Keep this upgrade separate from W1–W8.
2. Migrate the required framework contracts and verify route registration and guards, REST/MCP authorization, ownership, sessions and concurrent refresh, registration/OAuth policy, storage management, Redis startup/readiness, and production Next build/start. Resolve any baseline failures before claiming compatibility.
3. Account for `../kafil/patches/najm-email@2.0.4.patch`: it adds invitation logo options and Resend attachment `content_disposition` / `content_id`. Prove the selected published Email/Auth versions preserve the invitation logo and inline attachment behavior, then remove the obsolete patch file and `patchedDependencies` entry in the upgrade commit. If parity is missing, obtain a published fix before retiring the patch.
4. Reverify the Kafil behavior cited in sections 1–2 on the upgraded baseline. Add a Kafil pin check for its own workspaces and overrides, and compare both apps' selected versions explicitly at each release phase; School's test cannot inspect the sibling repo.

**Done when.** Kafil passes its compatibility checks on the agreed published baseline, its email patch has been retired with parity evidence, and the resulting versions and verification commands are recorded in the ledger. No consolidation item is marked migrated by this prerequisite alone.

### W1. `auth()` uses registered plugins and stops building its dependencies eagerly

**Problem.** Facts 1.1 and 1.2: config is passed twice; in School the second copy is dead; the eager `email()` call forces apps to forward email config just to avoid a startup crash; nothing reports when forwarded config is ignored.

**Najm change.**

1. `najm-core`: `.depends()` also accepts a **lazy dependency**, `{ name, create: () => NajmPlugin }` (or a `lazy('cache', () => cache(cfg))` helper). `PluginRegistry.registerDependencies` calls `create()` only when `name` is not registered. Plain plugins keep working (additive, minor).
2. `najm-auth`: declare `cache`, `rateLimit` and `email` as lazy dependencies. `email()` is then never called when the app registers email itself, so the startup crash goes away.
3. `najm-auth`: when a dependency is already registered **and** `auth()` received config for it, warn once at startup naming the ignored option (decision D1). Fix the `AuthPluginConfig.cache` doc comment.

**School migration.** [authConfig.ts](packages/server/src/config/authConfig.ts) drops `cache`, `rateLimit` and `email` and their imports. It keeps `dialect`, `encryptionKey` and `registrationMode`. The `resolveCacheConfig`, `resolveEmailConfig` and `resolveTrustedProxyHops` exports from [config/index.ts](packages/server/src/config/index.ts) are no longer needed outside their files.

**Kafil migration.** After W0, choose one owner per plugin: either `.use(cache(...))` and `.use(rateLimit(...))` explicitly before `authConfig()` (recommended; matches School and makes the order visible), or keep forwarding to `auth()`. `authInfrastructureConfig()` then serves one caller. Keep email registered explicitly. Kafil currently forwards no email config; if W0 introduces forwarding to accommodate the eager dependency, remove it when W1 makes that dependency lazy.

**Tests.** najm-core: a lazy dependency is not created when its name is registered, and is created once when it is not. najm-auth: with the app's `email()` registered and no `EMAIL_PROVIDER`, `auth()` starts; the warning fires when both are given. School: `bun run test:security:transport` (rate limits and sessions run through these plugins).

**Done when.** Neither app passes config for a plugin it also registers, and School starts with `EMAIL_PROVIDER` absent from the effective environment while the other required app values remain supplied. Ensure Next's env loader cannot reintroduce the provider from `.env.local` during this check.

### W2. `najm-core/env`

**Problem.** School has a careful 67-line reader module; Kafil re-implements parts of it inline with weaker rules. In Kafil, `EMAIL_RETRY_ATTEMPTS=abc` quietly becomes 1 and `SMTP_PORT=abc` throws; in School both stop startup with a message naming the variable.

**Najm change.** New subpath `najm-core/env` with no runtime imports, exporting School's readers unchanged in behavior: `envString`, `requireEnv`, `envFlag`, `envInt`, `envChoice`, `isProduction`. Keep School's design rule from the top of [env.ts](packages/server/src/config/env.ts): **the caller passes the name and the literal `process.env.NAME` value; a reader never looks a name up**, so every variable stays a greppable read the bundler can see.

Export `isNextBuildPhase` from a separate `najm-next/env` subpath, preserving `process.env.NEXT_PHASE === 'phase-production-build'`. This entrypoint must have no Next/React imports or configuration side effects, so the server and seed can import it. Add explicit built `dist` exports and build entries for both new subpaths; source-tree imports alone do not prove the published packages contain them. Include a `najm-next` minor release in phase 1.

**School migration.** Inventory all source and test imports of [env.ts](packages/server/src/config/env.ts) before deleting it. Its current importers (`cacheConfig`, `coreConfig`, `emailConfig`, `ragConfig`, `rateLimitConfig`, and [schoolChatControls.ts](packages/server/src/modules/chat/transport/schoolChatControls.ts)) take the general readers from `najm-core/env`; `cacheConfig.ts` separately imports `isNextBuildPhase` from `najm-next/env`. Migrate every importer, including those outside `config`, then delete the local module and verify no import still targets it. Add `najm-next` as an exact dependency in `packages/server/package.json`, matching the root pin and override, and bump every existing workspace declaration in the same phase. Port School's existing behavior as Najm's tests, so nothing changes for School.

**Kafil migration.** Replace the inline readers in `envConfig.ts` and `emailConfig.ts`. Before switching, run the new readers over Kafil's deployed env values (decision D4); a value that used to fall back silently will now stop startup.

**Tests.** In najm-core: blank equals unset; malformed integers/choices throw with the name; `envInt` bounds and its error text; `envChoice` lower-cases and lists the choices; `envFlag` retains its documented permissive behavior. In najm-next: only the production-build phase returns true, and importing `najm-next/env` needs no Next request context. Smoke-import both public subpaths from the built/packed packages. School: verify production build uses memory with `required: false`, while production runtime still requires Redis.

**Done when.** No server config file in either app defines its own env parsing, and no School source or test imports the deleted local env module.

### W3. Email from env, validated and lazy; failures logged

**Najm change in `najm-email`.**

1. Export `emailConfigFromEnv(env, { defaultProvider?: ProviderName, defaultFrom?: string })`, built on W2. It contains School's switch ([emailConfig.ts:28-82](packages/server/src/config/emailConfig.ts#L28-L82)): `requireEnv` for API keys and `SMTP_HOST`, SMTP user/pass both or neither, port 1–65535, `EMAIL_RETRY_*` validated. With no `defaultProvider`, an unset `EMAIL_PROVIDER` throws (Kafil's behavior); School passes `'console'`. Resolve the sender as `envString(env.EMAIL_DEFAULT_FROM) ?? options.defaultFrom`: the option is a fallback, and an explicitly configured sender always wins.
2. Move the module-level `DEFAULT_CONFIG` env reads into `mergeConfig`, so importing `najm-email` reads nothing. The fallback to env when no config is passed stays, so this is a minor release.
3. Log single-send failures through `LoggerService` by default, once after retries complete. Use a fixed failure message, the known provider name and operation (`send` or `sendBulk`); bulk logs also include the failed count. Do not copy Kafil's raw-error logger: provider error messages, stacks, arbitrary error properties, provider responses and subjects can contain recipient addresses. Exclude those fields, recipient details and message content from the default log. Any additional failure classification must map to a fixed set of safe codes. Keep the existing public error results and event payloads; these restrictions apply to the built-in failure log. Option `logFailures: false` disables that log for both single and bulk sends.
4. Cover `sendBulk()` at the service boundary, including native batch providers and the inherited `BaseProvider.sendBulk` implementation that currently bypass `email:failed`. A partially failed result, wholly failed result or thrown batch error produces one aggregate failure log per bulk invocation; successful and empty batches produce none. The sequential fallback follows the same rule and suppresses duplicate built-in logs from its internal single sends. Preserve provider batching, retry behavior and the public result shape; an event listener alone does not implement this requirement.

**School migration.** `emailConfig.ts` keeps the documented variable list and passes an explicit record of literal env reads to the helper, following W2:

```ts
email(emailConfigFromEnv({
  EMAIL_PROVIDER: process.env.EMAIL_PROVIDER,
  EMAIL_LOG_LEVEL: process.env.EMAIL_LOG_LEVEL,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
  SENDGRID_SANDBOX_MODE: process.env.SENDGRID_SANDBOX_MODE,
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  SMTP_SECURE: process.env.SMTP_SECURE,
  EMAIL_DEFAULT_FROM: process.env.EMAIL_DEFAULT_FROM,
  EMAIL_DEFAULT_REPLY_TO: process.env.EMAIL_DEFAULT_REPLY_TO,
  EMAIL_DEBUG: process.env.EMAIL_DEBUG,
  EMAIL_RETRY_ATTEMPTS: process.env.EMAIL_RETRY_ATTEMPTS,
  EMAIL_RETRY_DELAY: process.env.EMAIL_RETRY_DELAY,
}, { defaultProvider: 'console', defaultFrom: 'noreply@sms.local' }));
```

This preserves the existing sender precedence. School gains failure logging with no listener. Resolving inside the helper is call-time work: School invokes `emailConfig()` while its server module is evaluated, including during a Next build. Moving env reads out of the package's module-level defaults does not defer application configuration until server boot.

**Kafil migration.** After W0, use the same explicit env record with no School fallbacks. Delete `EmailDeliveryLogger` and `emailDiagnosticsConfig` and their `.use()` call.

**Tests.** In najm-email: each provider's required variables; the SMTP pairing rule; a configured `EMAIL_DEFAULT_FROM` wins over the fallback, while blank/unset uses School's fallback and remains undefined for Kafil; importing the package with no env set does not throw; direct config retains precedence over env defaults. Add isolated failure-log tests using mocked providers:

- A single send returning a failed result or throwing after its configured retries logs exactly once. A successful send logs no failure.
- Native batch providers and inherited `BaseProvider.sendBulk` cover partial failure, complete failure and a thrown error. Each failed bulk invocation logs one aggregate entry with the correct failed count; a thrown batch error counts the submitted messages as failed for logging. Assert the public results or rejection are preserved.
- The sequential fallback follows the same aggregate rule without duplicate built-in single-send logs. Successful and empty batches produce no failure log. `logFailures: false` suppresses built-in failure logs in every single and bulk path.
- Put sentinel recipient addresses in `to`, `cc`, `bcc`, the subject, message content, provider responses, and error messages, stacks and arbitrary properties. Capture the complete logger output in both JSON and pretty formats and assert the sentinels are absent, while the safe provider, operation and bulk failed count remain observable.

In each app, build and then start with a different injected sender value and inspect the memory provider's prepared message to confirm runtime env resolution without sending external mail.

**Done when.** Neither app contains a provider switch or a failure listener, and the single-send, bulk-send and log privacy checks above pass.

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

**Tests.** Extend School's `bun run test:ownership` with a committed baseline comparison **before changing the W6 pins or ownership implementation**. Today's suite checks SQL fragments and selected parameters; passing it alone does not establish equivalence.

1. Inventory every owned repository read and token alternative, extending `OWNED_READS` for any missing methods. Capture every emitted statement as `{ sql, params }`, including helper queries rather than only the last statement. Freeze time and use fixed user IDs, selected-year values and mock results so both runs exercise the same branches.
2. Capture the unchanged implementation for teacher, parent, student, every `SCHOOL_WIDE_ROLES` role, an unknown role, an anonymous active request, and an out-of-request read. Include `when()` alone, join-chain narrowing, `ownedIds`, multiple alternative tokens, and the Alert/Announcement audience cases.
3. Commit those expected results before migrating. After W6, require byte-identical SQL and exact ordered parameter arrays for every case. The migration must not regenerate its own expected baseline; a difference is a failed gate to investigate.
4. Keep the existing audience and write-denial assertions, and port School's `when()` cases into najm-auth's suite. Test named tokens preserve Kafil's resource/permission names and `adminRoles` options.

**Done when.** No app subclasses `OwnershipToken`, the committed SQL/parameter baseline matches, and the audience and denial checks pass.

### W7. Defaults

1. **Theme diagnostics.** Add `scopeId` and the error to `najm-theme`'s built-in reporter (patch), then delete `reportThemeDiagnostic` and the `diagnostics` option from both apps' `themeConfig.ts`. Both apps also pass `basePath: ''`, `features: { mcp: true }` and `storage: { namespace: 'theme-branding' }`. Check each against `najm-theme`'s current defaults; make one a default only if a third consumer would want it too, otherwise leave it explicit.
2. **MCP.** Delete `path: '/mcp'` and `exposeErrorDetails: false` from both apps; they are the defaults (1.6). Keep `cors: false` and `auth: { type: 'najm-auth' }`, which are not defaults and are security choices each app states.
3. **i18n.** First confirm Kafil's symptom: on a non-English Kafil page, trigger a server refusal and check its language. Then, per D3, add an opt-in server preset to `najm-i18n` (for example `i18n({ ...options, server: { languageHeader: 'X-Language' } })`) that produces School's `order: ['header','cookie','querystring']`, `lookupFromHeaderKey` and `caches: []`. School's [coreConfig.ts:36-47](packages/server/src/config/coreConfig.ts#L36-L47) uses it. Kafil adopts it together with sending its interface language as a header from its web app.

**Tests.** Extend School's `bun run test:server-i18n` with an isolated request-level suite under `packages/server/tests/i18n`, using the actual `i18nConfig()` and a translated refusal route. The current `ServerMessages.test.ts` only checks catalog keys and placeholders; retain it, but do not use it as evidence of language resolution.

- A French `X-Language` header wins over an English `language` cookie and conflicting query value; repeat for Arabic.
- Without the header, the cookie wins over the query; without either, the query applies; with none, the configured default language applies. An unsupported header falls back according to the detector's documented behavior rather than producing an untranslated key.
- Reuse a cookie jar across requests that change the language header and verify the refusal changes language each time. Assert no response writes the detector's `language` cache cookie (`caches: []`).
- In Najm, test the opt-in preset's effective configuration and request behavior while preserving the existing defaults for consumers that omit it. In Kafil, add equivalent request tests and verify a non-default-language page actually sends its interface language header and receives the matching refusal.

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
| `env.ts` | 67 | deleted (done) | W2 |
| `emailConfig.ts` | 84 | 41 (done) | W3 |
| `cacheConfig.ts` | 65 | 23 (done) | W4 |
| `authConfig.ts` | 38 | 31 (done) | W1 |
| `themeConfig.ts` | 57 | 42 (done) | W7 |
| `rateLimitConfig.ts` | 21 | 24 (done, including D2 and its comment) | W5 |
| `auth.ts` ownership section | ~75 | 8 (done; file 176 → 118) | W6 |

Kafil removes its email switch and logger but keeps the explicit env record, along with removing the Redis/env helpers and simplifying auth infrastructure. W8 removes about 230 lines of hand-written guards. Recount the final files after W0 and each migration rather than treating the original line estimates as gates.

## 6. Order and releases

Phase 0 upgrades Kafil to a verified published baseline; it is a separate compatibility migration with no consolidation release. After that, each phase is one Najm release set, then a pin bump in **both** apps: the exact version in each workspace, plus the matching root `overrides` entry and updated `bun.lock`. Phase 1 includes `najm-core`, `najm-auth` **and `najm-next`**.

School's `scripts/tests/najm-pins.test.mjs` (in `bun run test:boundaries`) checks only School's root and workspaces. W0 adds an equivalent Kafil check; each phase also records an explicit comparison of both repos' selected versions. Neither per-repo check detects drift in the sibling by itself. Publish with Najm's normal publish flow. Migrate one app per commit, so a regression points at one app.

| Phase | Items | Why this order |
| --- | --- | --- |
| 0 | W0 | Resolve Kafil's major-version gap, email patch and runtime assumptions independently before consolidation. |
| 1 | W2, W1 | Release Core env/lazy dependencies, Auth lazy dependencies and Next's build-phase helper together. W2 is the base for W3–W5; W1 removes the dead config and eager-email crash. |
| 2 | W3, W4, W5 step 1 | Each removes a whole duplicated block; W5's check informs D2. |
| 3 | W6 | Highest risk to data (row visibility); runs alone with the SQL comparison. |
| 4 | W5 steps 2–3, W7, W8 | Small, independent. |

## 7. Verification per release

School, after each pin bump:

- `bun run check` (lint, typecheck, i18n, safe tests, build, `db:check`);
- `bun run test:security:transport` for W1, W4 and W5. The script loads `apps/dashboard/.env.local`; set `SCHOOL_HISTORY_TEST_DB_URL` and `SCHOOL_HISTORY_ADMIN_PASSWORD` for the existing local `school_history_test` fixture (see [fixture verification](docs/tests/finance-review-2026-10-03.md)). The tracked template documents blank placeholders; verified local values are stored only in the ignored env file;
- `bun run test:ownership` for W6, **after adding and committing** the complete SQL/ordered-parameter baseline described in W6;
- `bun run test:server-i18n` for W7, **after adding** the request-level language tests described in W7;
- a startup with `EMAIL_PROVIDER` absent from the effective environment for W1 and W3, keeping the other required app values supplied; do not count a shell unset if Next loads the value from `.env.local`;
- `bun run test:config:production` with `SCHOOL_HISTORY_TEST_DB_URL` supplied for the marked local fixture and local `REDIS_URL` set. [The checker](scripts/check-config-production.mjs) builds an isolated Next app importing School's actual server under the Najm preset, then starts that build with a changed, blank and unset sender. It verifies the memory provider's prepared message and production Redis use. Generated fixtures are under `apps/dashboard/.cache`; logs and summary are under `.cache/najm-config-verification`;
- the W2 production-build/runtime cache checks.

Kafil: W0's compatibility gates before phase 1; its own full check and test suite after each bump, including the per-repo pin check, plus the W3 sender and W7 request/page language checks. Record the cross-repo version comparison after both migrations.

Najm: each package's own tests; the new tests listed per item port the behavior School and Kafil rely on. For W2, smoke-import the built/packed public subpaths and verify their declaration exports before publishing.

## 8. Risks

| Risk | Mitigation |
| --- | --- |
| Kafil's major upgrades or email patch are hidden inside a consolidation release | W0 completes and records compatibility and invitation/attachment parity before phase 1 |
| W1 changes which plugin config wins in Kafil (it relies on auth registering cache and rate limit) | Kafil registers them explicitly in the same release; the D1 warning shows any leftover |
| W2–W4 make Kafil's startup stricter | D4: dry-run Kafil's deployed env values through the new readers before switching |
| W2 loses School's build-phase Redis exemption or publishes an unusable helper | Release `najm-next/env` in phase 1, declare the server dependency, smoke-import packed exports and verify build/runtime cache behavior |
| W2 deletes the local env module while a chat or test importer still uses it | Inventory imports across source and tests, migrate every caller and verify no references remain before deletion |
| W3 replaces the deployed sender with School's default | Explicit env sender wins; blank/unset alone uses the fallback, covered by helper and app tests |
| W3 exposes recipients through raw provider errors or subjects | Log only the fixed safe fields; test sentinel addresses against complete JSON and pretty logger output |
| W3 logs single failures but misses bulk failures or logs them twice | Cover native, inherited and sequential bulk paths with one aggregate failure log per invocation and test the opt-out |
| W6 changes which rows a role sees | Commit the complete SQL/ordered-parameter baseline before migration; exact comparison and audience/denial tests are the gate |
| W7 i18n default change would alter every consumer's language resolution | Opt-in preset first (D3); default only in a major |
| W7 passes catalog checks while request-language behavior regresses | Add request tests for header/cookie/query precedence and absence of cache-cookie writes |
| Version drift between School and Kafil during a phase | Run each repo's own pin check and explicitly compare both manifests/lockfiles after the phase |

## 9. Progress ledger

| Item | Najm released | School migrated | Kafil migrated | Evidence |
| --- | --- | --- | --- | --- |
| W0 | najm-email 3.1.1 (Resend `content_id`/`content_disposition`, needed to retire the patch) | n/a | 2026-10-10 `c69a167`: Najm core 3.1.0, auth 6.3.0, cache 2.3.0, database 2.2.1, email 3.1.1, guard 2.2.1, i18n 2.2.0, kit 3.2.0, mcp 2.2.5, next 0.10.0, rate 3.1.0, storage 4.0.0, theme 0.3.1, validation 2.0.3, with Next 16.3.6, hono 4.13.12, nodemailer 10.0.14, sharp 0.35.5; patch, `patchedDependencies` and the Dockerfile `COPY patches` removed; `scripts/tests/najm-pins.test.mjs` added and every Najm package pinned in `overrides` | — Kafil baseline before the upgrade and after it: lint, typecheck, `test` (1117 pass) and `build` (with the Dockerfile build env) all green; `db:generate` reports no schema changes. On a local migrated, set-up database (`kafil_w0_check`): server `test:db` 61/62 and seed `test:db` 13/13; the one failure is pre-existing (below). Production start with Redis required: readiness reports cache and database ready; `/api/settings` and `/api/mcp` refuse without a token and serve the admin; three concurrent refreshes of one cookie all succeed and the session survives. Patch parity: a real Kafil invitation through Resend (fetch stubbed) references `cid:najm-account-invite-logo` and attaches the logo inline with that content id. |
| W1 | najm-core 3.1.0 (`lazyPlugin`, `LazyDependency`, startup warning), najm-auth 6.2.0 | 2026-10-10, uncommitted: `authConfig.ts` passes only `dialect`, `encryptionKey`, `registrationMode`; duplicate forwarded config and resolver exports removed | 2026-10-10 `96d69be`: `cacheConfig()` and `rateLimitConfig()` registered before `authConfig()`; nothing forwarded to `auth()` (`server-boot.test.ts` asserts it, and fails when a cache option is forwarded) | najm `e6327fa`, `d806e74`; `test/lazy-dependencies.test.ts` (core), `test/cache-passthrough.test.ts` (auth: starts with no `EMAIL_PROVIDER` when the app registers `email()`, warns per ignored option). D1 = warn. `validation` was made lazy alongside cache/rate-limit/email, since forwarding it has the same silent-ignore trap. School: real `server.init()` with `.env.local` loaded and `EMAIL_PROVIDER` deleted from the process boots on the console provider with no ignored-config warning. lint, typecheck, `test` (incl. pins/boundaries) and `build` pass. Final `test:security:transport`: 12 passed, 0 failed on the existing marked history fixture with Redis and memory mail; both suites assert that Redis is active. The fixture and its existing admin credential were verified before execution, without resetting or reseeding it. Cleanup found zero leftover security accounts or roles. Evidence: `.cache/najm-config-verification/security-transport.log`. |
| W2 | najm-core 3.1.0 (`najm-core/env`), najm-next 0.10.0 (`najm-next/env`) | 2026-10-10, uncommitted: `config/env.ts` deleted; six importers (five configs and `schoolChatControls.ts`) use `najm-core/env`, `cacheConfig.ts` uses `najm-next/env`; `najm-next` 0.10.0 added to `packages/server` | 2026-10-10 `96d69be` (hops via `envInt`; `najm-next` added to `packages/server`) and `f046e7c` (email); `envConfig.ts` keeps no parser | najm `e6327fa`, `b3c5004`; `test/env.test.ts` in both packages. Packed tarballs smoke-imported with plain Node (no dependencies installed) and typechecked under `nodenext` and `bundler` resolution. School: with `NODE_ENV=production` and no `REDIS_URL`, the build phase resolves memory with `required: false` and runtime throws `REDIS_URL is required.` after W4; no source or test imports the deleted module. |
| W3 | najm-email 3.1.0; both apps select 3.1.1 with the Resend attachment parity patch | 2026-10-10, uncommitted: `emailConfig.ts` is the variable list and one `emailConfigFromEnv` call with `defaultProvider: 'console'`, `defaultFrom: 'noreply@sms.local'`; `najm-email` 3.1.1 declared in `packages/server` | 2026-10-10 `f046e7c`: `emailConfigFromEnv` with the explicit env record and no fallbacks; `EmailDeliveryLogger` and `emailDiagnosticsConfig` deleted; `test/email-config.test.ts` | najm `be08ee7`; attachment fix `5d197f7`, release `ce38cf6`. `test/email-config-from-env.test.ts` (providers, SMTP pair, port and retry bounds, sender precedence, no import-time read, direct config wins) and `test/failure-logging.test.ts` (single and every bulk path, one aggregate log, no duplicates, `logFailures: false`, sentinel privacy in JSON and pretty output; a mutation that leaks one sentinel fails 7 tests). School: real server boot on the memory provider prepared `from` = injected `EMAIL_DEFAULT_FROM`, and `noreply@sms.local` when blank or unset; console when `EMAIL_PROVIDER` is absent; a half SMTP login stops startup. Final `test:config:production` builds School's server in an isolated Next app with `build-config-check@example.invalid`, then starts the same build three times: the changed runtime sender is used, and blank/unset values both use `noreply@sms.local`. Every probe sends only to the memory provider and confirms production Redis use. All three scenarios pass; evidence: `.cache/najm-config-verification/production-summary.json` and build/start logs. |
| W4 | najm-cache 2.3.0 (`redisCacheConfig`) | 2026-10-10, uncommitted: `cacheConfig.ts` is one call passing `ioredis` | 2026-10-10 `96d69be`: `redisCacheConfig` with `buildPhase: isNextBuildPhase()`; `redisClient` and `redisUrl` deleted; the production build with no `REDIS_URL` passes | najm `33b7284`; `test/redis-cache-config.test.ts`. Reason for the constructor parameter confirmed: School `0a33cde` "inject Redis client in server bundle". School: dev boot uses Redis; production build phase → memory, not required; production runtime without `REDIS_URL` → `REDIS_URL is required.`, without a password → `REDIS_URL must include a password.`; `bun run build` passes. Final School transport suites and all three Next production probes assert that Redis is the active driver. |
| W5 | najm-rate 3.1.0 (`onUnresolvedClient: 'shared' \| 'skip' \| 'reject'`, default `'shared'`; `MAX_TRUSTED_PROXY_HOPS`) | 2026-10-10, uncommitted: hops are one `envInt` call bounded by najm-rate's `MAX_TRUSTED_PROXY_HOPS`. Step 1 done: the dev server logs `[najm/rate] trustedProxyHops is 0 … every affected request shares one rate-limit bucket.` D2 applied: `onUnresolvedClient: isProduction() ? 'shared' : 'skip'`; a dev server then logs that affected requests are not rate limited | 2026-10-10 `96d69be`: one `envInt` call; the hand-written development `skip: () => true` replaced by `onUnresolvedClient: isProduction() ? 'shared' : 'skip'` | najm `0b98ef7`; `test/unresolvedClient.test.ts` (each policy over real requests, applies only to keys that use the address, resolved clients unaffected, warning names the policy). School's transport tests now model one trusted proxy and supply fixture client addresses, so the registration test still proves the sixth attempt is limited under the development policy. The prior unresolved-address test failed that assertion; the corrected suites pass all 12 cases with Redis. |
| W6 | najm-auth 6.3.0 (`when()`, `ownedIds()`, `own(table, { name })`) | 2026-10-10, uncommitted: `RowCondition`, `when`, `SchoolOwnershipToken` and `ownedIds` deleted from `auth.ts`; `own()` wraps najm-auth's with `SCHOOL_WIDE_ROLES` and `when`/`ownedIds` are re-exported, so imports from `src/auth.ts` are unchanged | 2026-10-10 `7628ed1`: `definePolicy` replaced by `own(table, { name, adminRoles })` in 12 guard files; `test/policy-tokens.test.ts` pins every token's name, admin roles and scoped roles and was written against `definePolicy` first | Baseline committed first: School `58e2d6d`, `tests/ownership/OwnershipSqlBaseline.test.ts` + `sqlBaseline/` — 2961 cases (every owned repository read and write found by a transitive scan, incl. helper statements; every token; every `ownedIds`) × teacher, parent, student, the 9 school-wide roles, an unknown role, anonymous and outside-request; frozen clock and TZ, fixed ids, year and DB answers; stable across runs and time zones; a one-line SQL-order mutation in the old subclass fails it. Gate: the migrated `auth.ts` on the locally built najm-auth was byte-identical in all 2961 cases (177/177) **before** publishing, and again on the published 6.3.0. najm `40c493d`; `test/ownership-when.test.ts` ports School's `when()` cases (narrowing, alone, chain still needs `where()`, admin bypass, unknown-role denial, OR with other tokens) plus `ownedIds` on pg and sqlite and the name option. lint, typecheck, `test`, `build` pass. |
| W7 | najm-theme 0.3.1 (default reporter prints scope and error), najm-i18n 2.2.0 (`server: { languageHeader }` opt-in preset); najm-mcp unchanged | 2026-10-10, uncommitted: `themeConfig.ts` drops its reporter, `diagnostics` and the default `storage.namespace` (keeps `basePath: ''` — default is `/theme` — and `features.mcp`); `mcpConfig.ts` drops `path` and `exposeErrorDetails`; `i18nConfig()` is `server: { languageHeader: LANGUAGE_HEADER }` | 2026-10-10 `11871b8`: reporter, default namespace, MCP `path`/`exposeErrorDetails` removed; i18n preset plus `lookupCookie: UI_LANGUAGE_COOKIE`, and the web client sends `<html lang>` as `X-Language` | najm `7e6e91c`, `816945a`; `test/server/config.test.ts` (reporter), `test/server-preset.test.ts` (effective config and request precedence, unsupported header, no cache cookie, defaults unchanged without the preset). School: new `tests/i18n/RefusalLanguage.test.ts` drives a real `students.errors.notFound` refusal through the actual `i18nConfig()` in all four languages: header over cookie and query, cookie over query, query, default, unsupported header, one cookie jar with changing headers and no `language` cookie written; removing the preset fails 2 of its 4 tests. Boot: MCP still answers at `/api/mcp` (401 vs 404 elsewhere), effective i18n order header/cookie/query with header `X-Language`, caches `[]`. Kafil symptom confirmed first on a production start: a French page (`kafil-ui-language=fr`) got "Invalid credentials. Please try again"; only `?lang=fr` gave French. After the change the same sign-in answers "Identifiants invalides. Veuillez réessayer", an Arabic header wins over a stale cookie, and no language cookie is written. Kafil `test/response-language.test.ts` (4 of 5 fail without the preset) and web `test/request-language.test.ts`. |
| W8 | n/a | n/a | 2026-10-10 `7f3d398`: twelve guard classes and `KafilRoleGuard` replaced by `defineRoles` + `createGroupGuard`; admin still excluded from `isDeliveryStaff`; `authConfig.ts` 404 → 134 lines | — All 206 controller routes compared before and after: 189 with a role guard, 0 role-set differences, every role guard beside a sign-in guard. The bearer fallback was instrumented on a production build: REST bearer and cookie requests, plugin-registered managed-image routes and an MCP tool call all reached the guard with a resolved principal and role, so no najm-auth ordering fix is needed. Production: admin 200 on the operator dashboard, 403 on the delivery dashboard, 401 anonymous. |

### Cross-repo versions (2026-10-10)

Both lockfiles resolve the same version of every package the apps share: diject 0.1.11, najm-auth 6.3.0, cache 2.3.0, cookies 2.0.3, core 3.1.0, database 2.2.1, email 3.1.1, event 2.0.2, guard 2.2.1, i18n 2.2.0, kit 3.2.0, mcp 2.2.5, next 0.10.0, rate 3.1.0, storage 4.0.0, theme 0.3.1, validation 2.0.3. School alone also uses najm-api, chatbot, cors and rag. Each repo checks its own pins (School `scripts/tests/najm-pins.test.mjs`, Kafil the same file name); neither checks the other.

### Found along the way, not changed

- Kafil `applicant-decision-database.test.ts` "serializes approval versus rejection to one terminal winner" fails intermittently at the same rate before and after W0 (8/20 vs 7/20). Both commands lock the row; when reject commits first, approve legitimately re-approves (`rejected->approved`), so both succeed. Whether a concurrent re-approval should be allowed is a product decision.
- Kafil `family-order-limits-concurrency.test.ts` hangs intermittently on a row lock, also before the upgrade (3/5 on the pre-W0 commit).
- Kafil MCP `tools/list` fails with "Date cannot be represented in JSON Schema": `z.coerce.date()` in the contribution DTOs cannot be converted for the MCP SDK. najm-mcp 2.2.4 and 2.2.5 have identical source, so this predates W0; individual tools still answer `tools/call`.
