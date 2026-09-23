# Chatbot latency and cost plan

Status: **PROPOSED — SOURCE REVIEW COMPLETE; RUNTIME BASELINE NOT STARTED**

Scope: School's dashboard assistant, built on `najm-chatbot` and `najm-rag`,
from sending a question through receiving the completed answer. Preserve answer
quality and authorization in English, French, Arabic, and Spanish.

## 1. Decision and order of work

**Start with the existing chat provider and Ollama. Jev is optional and is not
needed for the initial tests.** No new paid provider is a prerequisite.

1. Check runtime configuration, embedding connectivity, and routing failures.
2. Establish an external baseline using the actual streaming chat route.
3. Add shared instrumentation in Najm and establish a controlled internal baseline.
4. Compare configuration, model, routing, and tool-call improvements separately.
5. Consider Jev only if measured traffic and avoidable LLM spending justify it.

Do not assume that the LLM dominates latency. Embedding timeouts, database/tool
calls, large tool prompts, and provider retries are competing hypotheses.
The former 1.5-second first-text and 1-second completed-answer targets remain
aspirations until a baseline supports realistic acceptance thresholds.

This rewrite changes documentation only. Runtime tests, logging, migrations,
package publication, and deployment have not started. Execute those activities
within their subsequently agreed scope and budget.

## 2. Verified source findings and runtime unknowns

Reviewed on **2026-09-23** against School's configuration, installed
`najm-chatbot@2.0.3`, `najm-rag@2.0.3`, and AI SDK declarations. This is a source
snapshot, not a measured baseline. Recheck root pins before implementation.

### 2.1 School configuration

In `packages/server/src/config/index.ts`:

- Ollama embeddings use `embeddinggemma`, 768 dimensions, and
  `RAG_EMBEDDING_BASE_URL`, defaulting to `http://127.0.0.1:11434`.
- School's default `RAG_EMBEDDING_TIMEOUT_MS` is **60,000 ms**. The installed
  RAG package default is 8,000 ms. Query and indexing embedding calls share this
  timeout; health probes have a separate timeout.
- Tool routing and knowledge support are enabled. Effective RAG Studio settings
  can override routing limits and disable knowledge retrieval.
- Chat allows up to 10 LLM steps and stores conversations in the database.
  Ten is a ceiling, not an observed step count. Interaction logging is disabled.
- The database schema exports AI settings and chat sessions, but not
  `chatbotInteractionLogsTable`.
- `compose.production.yml` has no Ollama service. Its absence does not prove an
  outage: the effective production endpoint and container connectivity are unknown.

### 2.2 Installed behavior that matters to this plan

- School source declares 453 `@McpTool` methods across 49 files. This is not the
  runtime inventory or the number available to a particular signed-in user.
- Successful routing defaults to `maxTools: 12`, `topSemanticHits: 8`, and
  similarity threshold 0.45. Dependencies are expanded before the final slice;
  lowering `maxTools` can remove a required lookup tool.
- **Twelve is not a global cap.** Router errors default to
  `fallbackOnRouterError: 'all'`, returning all routable tools without that slice.
  No-match behavior defaults to `none`. Disabled routing also returns the
  routable inventory.
- Selected tool definitions remain available across LLM steps. Actual input
  charges depend on provider usage and prompt caching; schema estimates are not
  billing evidence.
- Preparation awaits routing and then knowledge context sequentially. A failed
  routing embedding can be followed by another embedding attempt for an uncached
  knowledge search. Two 60-second waits are possible when both calls hang;
  refused connections can fail much faster. The knowledge error is not caught
  in that preparation path, so successful LLM fallback is not guaranteed.
- Query embeddings have an in-process LRU cache, default size 256. Knowledge
  context has another cache, size 32. A repeated question can avoid embedding
  or retrieval even after Ollama has been unloaded.
- Embedding requests omit `keep_alive`. Ollama documents a five-minute default
  residency unless its configuration changes this. Cached questions still avoid
  a cold model call.
- Knowledge retrieval defaults to five chunks. Document index definitions exist
  in migration 0020; applied indexes and actual query cost remain runtime checks.
- Tools marked with confirmation metadata are **blocked** by the chat adapter.
  It does not implement an executable approval/resume flow. Benchmark the blocked
  outcome; do not introduce writes as part of latency optimization.

### 2.3 Evidence currently missing

- Interaction logs, when enabled, capture questions, routed/attempted tools, tool
  calls, and estimated tool-prompt tokens. The agent does not populate internal
  stage timings, aggregate token usage, or `steps_count` there.
- The admin-only `POST /api/rag-studio/chat-debug` returns tool traces and
  `latencyMs`, but uses `generateText` and performs extra trace work. Its latency
  cannot substitute for the actual streaming route.
- Browser usage metadata is not an authoritative bill. The installed cost helper
  reads legacy `promptTokens`/`completionTokens` while the installed SDK exposes
  `inputTokens`/`outputTokens`; validate and normalize that contract.
- Live AI settings, database contents, indexed tools/documents, production
  connectivity, and provider costs have not been verified during this review.
  The previous draft's empty-local-database statement is not current evidence.

## 3. Test prerequisites and required APIs

| Requirement | Purpose and configuration |
|---|---|
| Running School app and test account | Exercise authenticated `/api/chat`; admin access for configuration/debug only where required |
| Existing chat provider key and exact model ID | Configure through School AI settings; record the custom base URL if applicable |
| Working Ollama embedding endpoint | Set `RAG_EMBEDDING_BASE_URL`; local Ollama needs no provider API key |
| Representative test data and indexed tools | Known answers, valid IDs, and documents for knowledge cases |
| Request and spend budget | Bound paid calls, including warmups, failures, and retries |
| TypeSafe key, only for Phase 4 | Proposed server-only `TYPESAFE_API_KEY`; Jev integration is not implemented |

Use `apps/dashboard/.env.local` for environment values and document new variables
in `apps/dashboard/.env.local.example`. Keep chat keys in the existing settings
flow. Reports contain configuration identifiers, never credentials.

Use internal REST/MCP for data inspection and benchmark requests. Reuse suitable
seeded records and use anonymized questions. Do not automate a browser to manipulate
school data. Identify missing prerequisites before adding test records or indexes.

## 4. Phase 0 — preflight and initial external baseline

This phase does not require a new Najm release or interaction-log migration.

### 4.1 Inspect the running setup

1. Record School commit, package versions, runtime mode, provider/model, test
   dataset identity, and effective AI/routing settings without secrets.
2. Confirm the assistant is enabled and the configured model supports the tool
   contract used by the adapter. Setup failures are not slow successful answers.
3. Probe Ollama **from the application runtime's network context**, checking
   vector dimensions and model availability. A successful host probe does not
   establish access from an application container.
4. Inventory indexed tools and knowledge documents. Record effective limits,
   dependency rules, knowledge enablement, and error/no-match fallback settings.
5. Use the admin debug route on a few read-only questions to inspect routing and
   tool calls. Keep these diagnostic runs separate from streaming measurements.
6. Start locally or in staging. If production inspection is in scope, record its
   effective endpoint and live revision separately rather than inferring either
   from local configuration or the compose file.

Do not wait for complete telemetry before repairing a demonstrated connectivity
problem. Capture the observed failure and a small before/after comparison, then
label the repaired configuration as the baseline for subsequent experiments.

### 4.2 Measure the actual stream

Create a Bun runner for `POST /api/chat`, using the installed UI message protocol
and a unique session for each independent case. Parse events across network chunk
boundaries. HTTP 200 alone does not establish successful completion.

Record with a monotonic clock:

- request start, response headers, and first response byte;
- first non-empty assistant `text-delta`, excluding metadata, reasoning, and tool events;
- protocol finish, response-body end, and the completed answer;
- HTTP/stream errors, timeouts, and client aborts.

First byte is not first answer text. These are API-client timings including
transport; browser submit-to-first-render is a separate acceptance measurement
if performed later. Do not label API timings as browser results.

Start with a small read-only smoke set, then expand using section 6. Report cost
as unknown where usage is missing. Internal timings and exact tool execution on
streaming requests may remain unavailable until Phase 1; separate debug calls
provide diagnostic evidence, not traces of those same requests.

**Deliverable:** `docs/evidence/chatbot-latency/preflight.md`, containing setup
status, initial stream results, routing observations, gaps, and the full-run budget.

## 5. Phase 1 — shared instrumentation and controlled baseline

### 5.1 Ownership

| Owner | Responsibility |
|---|---|
| `najm-chatbot` | Request lifecycle, LLM/tool spans, aggregate usage, terminal outcomes, persistence, normalized stream usage |
| `najm-rag` | Embedding/cache, routing/retrieval spans, and a public request-scoped diagnostics contract |
| School | Configuration, additive log-table migration, fixtures, runner, reports, and published package adoption |

Define a public diagnostics contract between the packages. School must not inspect
private caches or monkey-patch installed code. Correlate events per request under
concurrency. Logging failures must not break answers or consume a stream twice.

The sibling Najm source is read-only during School work. Shared changes belong in
a separately scoped Najm release task. School consumes only published packages:
no local links, copied source, `file:` dependencies, or local tarballs. Verify
publication, update exact root pins and matching overrides, and update `bun.lock`
with `bun install`. Release both packages if the diagnostics contract requires it.

### 5.2 Measurement contract

Record these in interaction-log metadata or a documented diagnostic sink:

| Area | Required evidence |
|---|---|
| Identity | Request/run/case ID, role, language, provider/model, config/package/dataset versions, history size |
| Preparation | Settings/history load, total preparation, routing, and knowledge-context durations |
| Embeddings | Purpose, duration, cache hit/miss, attempts, timeout/error for each call |
| Retrieval | Semantic/tool/document searches, selected counts, routing status, fallback reason, missing dependencies |
| Generation | First text, each LLM step, finish reason, retries when observable, `steps_count` |
| Tools | Name, start/end, executed/blocked/denied/error outcome |
| Completion | Generation end, persistence duration, stream finish, timeout stage, failed/aborted outcomes |
| Usage | Aggregate input/output tokens, cached/reasoning details when available, price source/date, estimated cost |

Use start/end spans and document nesting. Routing may include embedding;
preparation includes routing. Do not add nested or overlapping durations as if
they were independent elapsed times. Tool execution must be distinguishable from
provider time.

Use **`totalUsage` across all SDK steps**, or a reconciled sum of step usage.
`onFinish` also exposes the final step's usage, which alone undercounts multi-step
answers. Normalize `inputTokens`/`outputTokens`, preserve unknown values, and
respect provider-specific cached/reasoning accounting without double-counting.
Reconcile billed retries and failures with provider records where available.

Record one terminal outcome even for failures before `streamText`, provider errors,
or client cancellation. Success-only logging would hide the slowest failures.
Report estimates separately from invoices. Use redacted diagnostic fields and
set retention/access rules before logging real questions or tool arguments.

### 5.3 Integrate in School

1. Export `chatbotInteractionLogsTable as chatbotInteractionLogs` from
   `najm-chatbot/pg` in `packages/server/src/database/schema/index.ts`.
2. Run `bun run db:generate`; review the SQL and target migration history. Accept
   only the intended additive table/index changes, with no unrelated drops.
3. Apply the reviewed migration using `bun run db:migrate` on the designated
   development/test database. Production application is a separate rollout step.
4. Enable `chatLogging: { enabled: true }` in `chatbotConfig()` after the sink exists.
5. Verify successful, blocked/denied, embedding-failure, and aborted requests;
   check correlation, aggregate usage, log persistence, and terminal outcomes.
6. Re-run unchanged cases/settings to measure instrumentation overhead before
   adopting unrelated performance changes.

**Gate:** usable correlated traces and a controlled baseline report. Claims about
which internal stage dominates require this evidence; Phase 0 still provides an
external baseline while the releases are pending.

## 6. Benchmark contract

Create these files when implementation begins:

- `scripts/chatbot-benchmark.ts`: streaming runner, request limits, and budget controls.
- `datasets/chatbot-latency/questions.json`: anonymized cases and expected outcomes.
- `docs/tests/chatbot-latency.md`: setup, execution, cache controls, and scoring.
- `docs/evidence/chatbot-latency/`: sanitized raw samples and comparison reports.

### 6.1 Corpus and correctness

Start with 40 questions, 10 per language: small talk, grounded knowledge,
single-tool reads, multi-tool reads, and attempted writes that must remain blocked.
Each case specifies role, fixture IDs, expected tools/alternatives, important
arguments, answer facts, and refusal behavior. Human-review quality in every
language; a fast incorrect answer fails.

Add controlled follow-ups, ambiguity, missing records, authorization denials, and
routing misses. Freeze dataset, indexed semantics, documents, and history fixtures
for comparisons. Independent cases use fresh sessions; conversation cases replay
the same history. Repetitions must not silently grow conversation length.

Do not create, update, or delete real school records through the benchmark.
Write cases validate the existing block, not a hypothetical confirmation flow.

### 6.2 Cache and load conditions

| Condition | Setup and evidence |
|---|---|
| Application cache hit | Pre-run the exact input/history and verify the observed hit |
| Empty application caches, warm Ollama | Clear both caches through supported test controls or restart the isolated app; verify an actual embedding call without a model reload |
| Empty application caches, cold Ollama | Empty both caches and unload the isolated model; verify a real call and reload |
| Concurrent traffic | Declare client concurrency; report queueing, rate limits, errors, and results separately |
| Failure paths | Exercise refused connections, hanging embedding requests, provider failures, and client cancellation in isolation |

Unloading Ollama alone does not make a repeated query cold. Restarting the app can
also introduce app/database cold starts; warm or measure them separately. Do not
unload a shared production model to benchmark. Count warmups toward spend and
record provider prompt caching separately from application RAG caches.

Three repetitions are smoke coverage only. Size extended runs to the decision;
aim for at least 100 observations per important comparison group where affordable,
report sample counts/uncertainty, and do not treat that count as a statistical
guarantee. Small cold-run or language subgroups remain exploratory. Interleave
baseline/candidate runs to reduce time-of-day bias and obey the declared budget.

### 6.3 Reports and gates

Report p50/p95 first text and completion, internal spans, errors/aborts, tool and
answer correctness by language/role, usage, cost per attempt, and cost per correct
completed answer. Separate cache/load conditions. State treatment of failures
and timeouts; never silently remove them to improve percentiles.

Keep observed results separate from traffic-weighted monthly projections. A
balanced fixture set does not establish the distribution of real user questions.

Before each comparison, record the latency/cost target, allowed non-target
regression budget, and sample plan. Require no observed authorization or blocked-
write regressions, review all correctness regressions, and reject improvements
that merely hide a weaker language or fall within measurement variability.

## 7. Phase 2 — configuration and failure-path improvements

Apply one change per experiment and retain before/after evidence.

1. **Embedding availability/residency.** Repair the endpoint where needed. Evaluate
   `OLLAMA_KEEP_ALIVE=-1` on the Ollama server after checking memory capacity.
   Verify the running process received it and residency works; the setting does
   not itself preload a model after restart.
2. **Bound query waits.** Choose a budget from warm/cold timings and user goals.
   Test tool/document indexing before reducing the shared timeout. If indexing
   needs longer, add separate query/indexing timeouts in a published `najm-rag` release.
3. **Handle failures explicitly.** Compare `fallbackOnRouterError: 'none'` with
   `all` in staging. It prevents the schema explosion but also removes data tools
   during an outage, which must be communicated honestly. If bounded fallback
   tools or shared failure handling are needed, implement them in Najm. Prevent
   a second full wait for the same failed embedding during knowledge retrieval;
   define and test the knowledge-unavailable outcome. `maxTools` alone cannot fix it.
4. **Tune tool selection.** Compare the current cap with a smaller candidate such
   as six. Check lookup dependencies, multi-tool tasks, and all languages. Reject
   savings that cause extra retries or incomplete answers.
5. **Compare chat models.** Start with the current model and one cheaper tool-capable
   model available from the same provider. Verify exact IDs, prices, availability,
   adapter compatibility, and caching at test time. Hold routing/history/data
   constant. Add providers only when justified. Evaluate local chat models against
   actual hardware and load rather than assuming embedding performance predicts chat.
6. **Control context size.** Measure history, tool-schema, tool-result, and knowledge
   tokens. Test shorter history or concise results where correctness allows it;
   preserve IDs, pagination, grounding, and required facts.

**Gate:** meet the declared latency/cost objective, preserve the correctness
contract, and stay within the recorded timeout/error budget. Embedding changes
also require indexing and failure-path checks.

## 8. Phase 3 — reduce unnecessary work

Classify traces before changing orchestration:

- Routing misses/dependency cuts: improve multilingual semantics and dependencies
  in RAG Studio; add a regression case for each fix.
- Wrong picks: improve the owning `@McpTool` description and verify the updated
  index/semantics actually participate in the next run.
- Repeated lookups or oversized results: review tool contracts and app-owned
  service/repository work without removing authorization or entity validation.
- Independent calls: evaluate supported parallelism only where measured; dependent
  ID lookups retain their ordering. Parallel preparation must share/deduplicate
  embeddings rather than accidentally issue duplicate calls.
- Necessary multi-tool work: retain it. Lowering `maxSteps` must not hide truncated
  or incomplete answers behind shorter request times.

For fully specified single-tool reads, a proposed efficiency gate is at least
95% of successful runs using at most two LLM steps: tool request and final answer.
Report failures separately and preserve overall correctness. Clarification and
multi-tool cases have separate expectations.

**Deliverable:** explain which work each adopted change removes, its measured
latency/cost effect, and the evidence that complete answers remain correct.

## 9. Phase 4 — optional Jev experiment

### 9.1 Entry decision and cost model

Default: **defer Jev**. Experiment only when representative usage demonstrates
avoidable LLM work whose monthly cost or latency justifies implementation and
maintenance.

TypeSafe advertises **$0.042 per million input tokens, free output, and 70–500 ms
responses**. These vendor figures were checked on 2026-09-23; they are not School
measurements or guarantees. The vendor says its evaluations are generally run
from the US west coast. Recheck pricing, access, versions, and actual latency from
School's hosting region before implementation.

Jev returns typed decisions, not prose or embeddings. Code must resolve validated
arguments, invoke tools, and render replies. Its published 255-choice limit does
not rule out shortlisting or hierarchical routing, but it cannot supply embedding
vectors.

Savings can come from bypassing the LLM, removing calls, or reducing enough billable
context. Adding Jev before unchanged LLM calls increases cost. Rerouting/reranking
can provide a net gain only if measured downstream savings exceed its extra cost
and delay. Knowledge reranking remains deferred unless evidence justifies a test.

`net API savings = baseline LLM cost - candidate LLM cost - Jev cost`

Include fallback classifications, warmups, retries, and additional service costs.
Show implementation/maintenance costs separately. **Illustration only:** 10,000
questions at an assumed $0.002 LLM cost each cost $20. Bypassing 30% leaves $14 in
LLM costs. Classifying all 10,000 with 1,000 Jev input tokens each adds $0.42,
saving **$5.58**, before engineering and hosting. These are not measured School costs.

### 9.2 Narrow implementation

1. Select a few frequent read-only intents with deterministic or closed-set
   arguments. Ambiguous/free-text arguments, unsupported follow-ups, and writes
   keep the existing path.
2. Compare simple deterministic shortcuts or suggested actions using the same
   tools/templates before adding a classification provider.
3. Where possible, filter eligibility locally before calling Jev. Require a
   supported intent, calibrated confidence, and valid arguments. Otherwise fall
   back on low confidence, errors, rate limits, invalid output, or timeout.
4. Add a generic pre-generation reply hook in `najm-chatbot`, preserving the UI
   stream protocol, conversation history, diagnostics, cancellation, and one
   terminal outcome. School owns domain intents/templates; the hook stays reusable.
5. Execute an explicit allowlist of read-only tools through the authenticated MCP
   path as the same user. Validate arguments and permissions server-side; model
   confidence never grants authorization.
6. Put templates in `packages/contracts/src/locales/`. Use School's existing time-
   zone preferences for dates/months, and test mixed-language input and every
   supported output language.
7. Pin a versioned model verified available at implementation time. Do not assume
   the previous draft's `jev-1.13.0` identifier remains available. Add a server-only
   key and a default-off feature switch. Use anonymized fixtures initially; owner
   agreement to the new provider/data transfer is needed before sending real
   school questions that can contain information about students.

```text
question -> local eligibility check
  ineligible -> normal chat
  eligible -> Jev classification under a short deadline
    supported and validated -> authorized read tool -> translated reply
    otherwise               -> normal chat, with classification delay recorded
```

A sequential fallback is slower by time already spent on classification. An 800 ms
deadline would permit roughly that added wait; it is a candidate, not a promise of
unchanged latency. Do not hide the delay with speculative parallel LLM calls
without accounting for their cost.

### 9.3 Acceptance or disable decision

Use held-out multilingual cases plus unsupported, ambiguous, denied, failed, and
timed-out cases. Tune thresholds on separate development cases. Report precision
among accepted requests, coverage, unsupported false acceptance, answer correctness,
API cost, and p50/p95 for direct replies and fallbacks separately.

Before testing, set a minimum meaningful monthly saving or explicit latency value,
minimum useful coverage, and maximum fallback regression. A proposed precision
floor is 98% among accepted requests, with sample counts and uncertainty; a small
fixture set cannot establish that rate in real traffic. Require no observed
permission/write-policy regressions. Sub-second replies remain an aspiration.

Enable only if these gates pass against the best non-Jev configuration. Otherwise
leave it disabled and retain the comparison report.

## 10. Verification, rollback, and completion evidence

### Implementation checks

- Start with focused checks for affected behavior: stream parsing, aggregate
  multi-step usage, concurrent request correlation, cache controls, failures,
  blocked tools, and cancellation.
- Run `bun run lint`, `bun run typecheck`, and `bun run test` for code changes.
- Run `bun run build` when production behavior can be affected.
- Run `bun run db:check` after migration changes; separately verify application
  on the designated test database. Migration consistency is not live schema proof.
- Run `bun run i18n:check` when templates/translation keys change.
- Shared releases need package tests and public-export checks before School's
  published-consumer validation.
- Attach benchmark evidence for each adopted performance change. A successful
  build does not prove latency, billing, authorization, or deployment.

### Rollback

Record previous effective settings, package pins, and reports before experiments.
Revert configuration independently. Restore published versions and the matching
lockfile through a reviewed change if necessary. Disable logging if it causes a
runtime issue; keep the additive log table/evidence rather than dropping data.

The Jev switch immediately restores the normal path for subsequent requests.
Revert residency/timeout settings if they cause memory pressure or indexing failures.
Keep the last passing configuration identifiable.

### Completion ledger

Track independently: source checks, package publication, migration application,
local/staging API acceptance, benchmark results, production revision/readiness,
production API measurements, and browser rendering acceptance if performed.
Unrun stages remain explicitly unrun. Publishing, migration, and deployment are
separate execution steps; prepare reviewable changes and validation before any
approval actually required by the execution scope.

## 11. Sources and verification references

Installed runtime is authoritative for School behavior:

- `package.json`, `bun.lock`: pins and resolved dependencies.
- `packages/server/src/config/index.ts`: embedding/chatbot policy.
- `packages/server/src/database/schema/index.ts`: exported tables.
- `apps/dashboard/src/shared/DashboardShell/index.tsx`: chat endpoint integration.
- `compose.production.yml`: declared services, not effective production settings.
- `node_modules/najm-chatbot/dist/index.mjs`: `ChatAgent.stream`, `prepare`,
  `debugRun`, `buildChatTools`, `logChat`, and `computeUsageCost`.
- `node_modules/najm-rag/dist/index.mjs`: embedding, routing, knowledge search,
  and context-cache behavior.
- `node_modules/ai/dist/index.d.ts`: stream events and aggregate usage contract.

External references:

- [Ollama FAQ](https://docs.ollama.com/faq): residency and server configuration.
- [TypeSafe: Introducing System One Models and Jev](https://typesafe.ai/blog/introducing-system-one-models-and-jev): capabilities, advertised pricing, and timing caveats.
- [TypeSafe documentation](https://docs.typesafe.ai/): verify the current API,
  model versions, and error contract before Phase 4. The API reference was not
  accessible during review; exact API/version claims remain unverified.
