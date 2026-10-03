# Chatbot latency and cost plan

Status: **FASTER HOST FOUND: GPT-OSS-120B:NITRO ANSWERS IN 0.6 S P50 (1.1 S P95), 12/12 CORRECT; NOT YET ADOPTED**

2026-10-03, host comparison ([review](docs/evidence/chatbot-latency/model-nitro-20261003.md)):
OpenRouter's live stats show the default route serves `gpt-oss-120b` from the
cheapest hosts (CoreWeave, DekaLLM: 23–36 tokens/s). Faster hosts run the same
model at 183–933 tokens/s. The runner's new `--compare-model` mode
interleaved the default with `openai/gpt-oss-120b:nitro`, OpenRouter's
fastest-host route:

| | Default | `:nitro` |
|---|---|---|
| Complete p50 | 1.95 s | 0.63 s |
| Complete p95 | 6.64 s | 1.07 s |
| Checks passed | 12/12 | 12/12 |

The estimated cost rises from about $0.11 to about $0.75 per 1,000 answers.
Adopting it is a change to the AI settings model, not to code. Before adopting:
- add a `:nitro` price to `najm-chatbot`, which today reports no cost for that id;
- review the answers in every language by hand.

Crusoe ($0.05 / $0.25, about 183 tokens/s) would be a middle option. It needs
an OpenRouter account preference, because School cannot send provider routing
options yet.

2026-10-03, internal baseline ([review](docs/evidence/chatbot-latency/stream-diagnostics-20261003.md)):
School now sends each chat's diagnostics to an in-memory, admin-only log at
`GET /api/chat-diagnostics`, which holds no question text. The interaction log
table stays off (`chatLogging.enabled: false`) until a retention rule exists.
The runner matches each request to its server record by `x-request-id`.

Two runs of 36 requests completed 72/72, with a server record for each. Per
answer, at p50:
- settings, routing, tools and saving took about 10 ms in total;
- routing took about 150 ms for a question it hadn't seen and about 6 ms when
  cached;
- tools took 0.3–19 ms.

The rest is the provider. The same 36 questions ran at complete p50 5.1 s in
one run and 2.7 s in the next, with server stages unchanged. So latency work
belongs in Phase 2 items 5–6 (model choice, context and reasoning size), and
comparisons must interleave runs. Write checks now use the server's
`blocked` outcome; the stream could not tell a blocked tool from a real one.

2026-10-03, Phase 1 (section 5): `najm-chatbot@2.0.5` (published and pinned;
a 2-request live check completed 2/2 with usage) now records diagnostics for each request
to `chatLogging.onDiagnostics` and, when logging is on, to
`metadata.diagnostics` on the interaction log row. They contain:

- **Outcome:** exactly one of completed, error, aborted or setup_error.
- **Timings:** settings, history, routing, context and preparation spans;
  first-text and finish marks.
- **Steps:** finish reason and tokens for each step.
- **Tool calls:** executed, blocked or error, with duration and argument and
  result sizes.
- **Cost:** usage and estimated cost.
- **Correlation id:** the `x-request-id` the client sends.

The row also gains `steps_count`, `success` and `error`.

Building it found a gap: when a provider stream throws mid-answer, the AI SDK
calls no `onError`, `onFinish` or `onAbort`, and the client sees a dropped
connection. Before, such requests were never logged; the body is now watched,
so they are logged, as are client disconnects. All 184 `najm-chatbot` tests
pass after fixing a stale `ai-settings` test, which expected JSON for a
`204 No Content` reply. The API snapshot changes are additive.

Not done yet:
- **Embedding spans** (cache hit/miss, attempts) belong to `najm-rag`
  (section 5.1). Routing and context are timed only as whole spans.
- **School wiring** (section 5.3) is done with the in-memory log above. The
  interaction log table remains off. Rows store questions and tool arguments,
  so set retention and access before enabling it (section 5.2).

2026-10-02, latest: `najm-chatbot@2.0.4` is published and pinned, and School
sets a 30 s stall limit. A 12-request pass completed 12/12, with first text
p50 2.2 s and complete p50 2.4 s. All 12 answers carried usage: 23.8k tokens,
an estimated $0.0012 in total. See [the 2.0.4 section](docs/evidence/chatbot-latency/stream-fixed-20261002.md#after-najm-chatbot-204-report).
Remaining: routing 14/20, the section 6 corpus and sample size, non-admin
roles, production.

2026-10-02, fixes ([review](docs/evidence/chatbot-latency/stream-fixed-20261002.md)):
- **Date:** today's date and weekday now come per request from the school's
  clock. The old prompt date was computed once at startup, in UTC.
- **Language:** replies now match the question's language. French grade
  requests: English 3/3 before, French 3/3 after.
- **Greetings:** now 219–480 characters, describing lookups only.
- **Name lookups:** they use `search_search_students` instead of the full
  list, so write requests went from 12.5 s to 6.7 s complete p50.
- **Blocked actions:** the message now says nothing was done and not to ask
  for confirmation in chat.
- **Blocking proven:** with a real demo student, the model called
  `attendance_mark` and `grades_create`, both were refused, and the database
  was unchanged.

In the Najm clone, `najm-chatbot` gained a `streamTimeout` (default chunk
limit 60 s) and correct v6 token usage. Its tests and build pass. It needs a
2.0.4 release and School pin before School gets them (then set
`streamTimeout: { chunkMs: 30_000 }`).

2026-10-02, seeded run ([review](docs/evidence/chatbot-latency/stream-seeded-20261002.md)):
after `seed:demo`, 36 requests (12 cases × 3) gave first text p50 2.4 s
(p95 12.5 s) and complete p50 4.8 s (p95 16.6 s) over 35 completed requests.
Count answers were correct 12/12. Findings for the next phases:
1. A provider stream went silent mid-answer, and nothing ended it before the
   runner's 120 s abort. A stall timeout is needed in `najm-chatbot`.
2. French grade-entry requests were answered in English, 3/3.
3. One French answer gave the wrong date for today.
4. Write requests are the slowest (p50 12.5 s). The suspected cause is
   full-list student lookups; this needs tool-result sizes from Phase 1 to
   confirm.
5. Blocking is still unproven: the synthetic name never reaches the write tool.
6. The stream carries no token usage.

Use this run as a smoke reference, not the acceptance baseline. Next: add
argument and result-size capture (Phase 1); decide whether a write case may use
a real student's name to prove blocking; grow the corpus and repetitions.

2026-10-02, later: the key and `openai/gpt-oss-120b` were saved to AI Settings
via the admin API, and the 12-case smoke set ran
([report](docs/evidence/chatbot-latency/stream-smoke-20261002.md)). All 12
completed. First text p50 was 5.1 s (max 12.3 s); complete p50 was 8.5 s
(max 20.3 s). Every read used two LLM steps, and answers were correct for the
data. Caveats: this workstation's database has **no students, attendance or
grades**, so reads returned nothing. The write cases never reached the blocked
tool. The stream reports **no token usage**. Greetings answered quickly but
ran long (up to 20 s) and over-promise write abilities. Next: run on seeded
data, then repeat for sample size.

2026-10-02, second workstation (`C:\Users\pc`): there was no llama.cpp or Qwen
install here, and the app was on the source default (Ollama EmbeddingGemma),
which passed **6/20**. Qwen3 Embedding 0.6B Q8_0 now runs through Ollama's
OpenAI-compatible endpoint (`.env.local`), all 430 tools were reindexed, and
the 20 held-out cases pass **14/20** with the current instruction. pgvector was
already correct here. See [the re-run](docs/evidence/chatbot-latency/routing-trial.md#re-run-on-the-second-workstation-2026-10-02).
The section 4.2 runner exists ([guide](docs/tests/chatbot-latency.md)) with a
12-case smoke corpus. A keyless one-request probe proved body, year and
stream framing ([probe](docs/evidence/chatbot-latency/stream-transport-probe-20261002.json)).
At that point AI Settings had no key; see the later entry above.

Earlier the same day, on the original workstation: OpenRouter /
`openai/gpt-oss-120b` was configured in School's AI settings (`hasKey:true`)
and the chat widget answered locally in the selected academic year ([release follow-up](docs/tests/academic-year-release-2026-10-02.md),
`SCHOOL-ACADEMIC-YEAR-HISTORY-PLAN.md` section 0.1j). Since the 12/20 preview
below, the Qwen query instruction changed ("teacher request" → "user request",
commit `b96c55f`), student-list tool descriptions became multilingual, and
`students_get_student_count` was added; the 14/20 re-run above reflects them.

Informal timings from that follow-up, four local samples through the
release check, not the section 4.2 runner: first answer text 1.8–8.4 s,
complete answer 2.2–8.6 s. Earlier long-list count requests took roughly
71–79 s and returned wrong totals; the aggregate count tool replaced them.
These are leads for the baseline, not a baseline.

2026-09-30: the local app at port 3102 is healthy. Authenticated diagnostics found
428 registered tools, zero indexed tools, zero semantic phrases, and no dependency
mappings. Routing preview returned `router_error` because local Ollama was
unreachable. See [preflight evidence](docs/evidence/chatbot-latency/preflight.md)
and the [routing-only runner guide](docs/tests/chatbot-routing.md).

Follow-up: llama.cpp b11146 with EmbeddingGemma Q8_0 is running locally on
port 18080 (since replaced by Qwen on 18081, below). `najm-rag@2.1.0` was published and adopted; its adapter passed 221
package tests. The local database needed a pgvector schema repair before all
428 tools could be indexed. The first full preview matrix passed 4/20 minimum
selection checks. A trial with 14 general semantic phrases passed 3/20 and was
rolled back. See [routing trial evidence](docs/evidence/chatbot-latency/routing-trial.md)
and [local setup](docs/tests/local-embeddings.md).

The follow-up Qwen3 Embedding 0.6B trial ranked the primary tool in the top 12
for 16/20 direct cases using 768 dimensions. Published `najm-rag@2.1.1` adds
opt-in vector shortening; School now uses that version and Qwen locally
(llama.cpp, `openai-compatible`, port 18081). After
reindexing 428 tools, adding explicit teacher-task lookup dependencies, and
clarifying two grade-tool descriptions, the admin preview passed 12/20 cases.
Grade report/create requests in several languages and mixed follow-ups still
miss. A Qwen phrase experiment regressed to 10/20 and was rolled back. This is
selection evidence only, not teacher execution or chat latency acceptance.

The next routing change should be in shared Najm: compare phrase and tool
description matches together, use a single strongest score per tool instead of
summing repeated phrases, and preserve lookup dependencies inside the tool cap.
Keep the 20 current cases held out and add new paraphrases before judging a
change.

**Out of scope here:** an executable review-and-confirm path for attendance or
grade writes, and extracting grades from a photo of a filled grade sheet with a
teacher review screen. Both are feature work, not latency work, and belong in
their own plan; this plan only benchmarks that writes stay blocked (section
2.2). Until they exist, retain the direct dashboard correction path for
teachers. Limited-role selected-year refusals were proven locally in 0.1j of
the academic-year plan; teacher permission behavior inside routing is still
unproven (section 2.4).

Scope: School's dashboard assistant, built on `najm-chatbot` and `najm-rag`,
from sending a question through receiving the completed answer. Preserve answer
quality and authorization in English, French, Arabic, and Spanish.

## 1. Decision and order of work

**Local llama.cpp embeddings and the configured OpenRouter chat model are both
in place. Jev is optional and is not needed for the initial tests.** No new
paid provider is a prerequisite; paid chat runs need a declared budget.

1. Re-run the 20 routing cases under the current Qwen instruction and tool
   descriptions; check runtime configuration, embedding connectivity, the
   database's pgvector schema, and routing failures. **Done 2026-10-02: 14/20.**
2. Build the section 4.2 runner and establish an external baseline using the
   actual streaming chat route. **Runner built; smoke runs on empty and seeded
   data are done (35/36 completed on seeded data). An acceptance baseline still
   needs a larger corpus and sample.**
3. Add shared instrumentation in Najm and establish a controlled internal baseline.
   **`najm-chatbot` diagnostics released in 2.0.5, wired into School and the
   runner; internal baseline captured (2026-10-03). `najm-rag` embedding spans
   remain.**
4. Compare configuration, model, routing, and tool-call improvements separately.
5. Consider Jev only if measured traffic and avoidable LLM spending justify it.

Do not assume that the LLM dominates latency. Embedding timeouts, database/tool
calls, large tool prompts, and provider retries are competing hypotheses.
The former 1.5-second first-text and 1-second completed-answer targets remain
aspirations until a baseline supports realistic acceptance thresholds.

The original rewrite changed documentation only. Local read-only routing
diagnostics and a routing-only runner were added on 2026-09-30. Shared embedding
adapter publication, School adoption, and a local routing trial are complete.
The chat provider was configured and focused functional chat checks passed
locally on 2026-10-01/02. The streaming benchmark runner, instrumentation, and
deployment have not started. A local database schema repair was required;
production schema state remains unknown. Execute remaining activities within
their subsequently agreed scope and budget.

## 2. Verified source findings and runtime unknowns

Reviewed on **2026-09-23** against School's configuration, installed
`najm-chatbot@2.0.3`, `najm-rag@2.0.3`, and AI SDK declarations. This is a source
snapshot, not a measured baseline. **Pins as of 2026-10-03: `najm-rag` `2.1.2`,**
(`najm-chatbot` `2.0.4`, `najm-core` `3.0.2`). The 2.1.x releases added the
`openai-compatible` adapter and opt-in vector shortening; the router behavior
in sections 2.2 and 2.4 (error fallback, phrase-score summing, dependency
expansion, caches, default timeout) has not been re-checked against 2.1.1 and
must be before it is relied on. Recheck root pins before implementation.

### 2.1 School configuration

In `packages/server/src/config/index.ts`, re-read 2026-10-02:

- `RAG_EMBEDDING_PROVIDER` selects `ollama` (default) or `openai-compatible`.
  The source defaults are still Ollama, `embeddinggemma`, 768 dimensions, and
  `http://127.0.0.1:11434`. **Local runtimes override them, and differ per
  workstation:** the original one runs llama.cpp serving `qwen3-embedding`
  (Qwen3 Embedding 0.6B Q8_0) at port 18081; the second (`C:\Users\pc`) serves
  the same Q8_0 model from Ollama at `http://127.0.0.1:11434/v1`. Both use
  `openai-compatible` with `RAG_EMBEDDING_TRUNCATE_DIMENSIONS=true` shortening
  its 1024 values to 768. Record which one produced each result. For Qwen, School supplies the query instruction
  "Retrieve the school management tool that fulfills the user request" and
  an empty document prefix. A query-prefix change alters routing scores without
  invalidating stored tool vectors; a model, quantization, or document-prefix
  change requires reindexing.
- On the original workstation the Qwen server is a manually started process
  (`scripts/start-local-embeddings.ps1 -Model Qwen3`), not a supervised service.
  Ollama on the second workstation was already running; whether it starts at
  login was not checked. On
  2026-10-01 chat failed in preparation because it had stopped and its model
  file was missing (academic-year plan 0.1h). Treat embedding-process
  availability as a latency and failure risk, not only model residency.
- School's default `RAG_EMBEDDING_TIMEOUT_MS` is **60,000 ms**. The installed
  RAG package default was 8,000 ms in 2.0.3. Query and indexing embedding calls
  share this timeout; health probes have a separate timeout.
- Tool routing and knowledge support are enabled, with explicit lookup
  dependencies for `attendance_mark`, `grades_get_student_report`,
  `grades_get_by_student`, and `grades_create`. Effective RAG Studio settings
  can override routing limits and disable knowledge retrieval.
- Chat allows up to 10 LLM steps and stores conversations in the database.
  Ten is a ceiling, not an observed step count. Interaction logging is disabled.
  The configured model is OpenRouter / `openai/gpt-oss-120b`.
- Chat runs in the dashboard's selected academic year. `ChatController` is a
  REST year consumer in `config/yearScope.ts`; each request validates the year
  before provider work, and `SchoolChatContextProvider` adds the year and role
  rules to the system prompt. Both are per-request preparation work.
- The database schema exports AI settings and chat sessions, but not
  `chatbotInteractionLogsTable`.
- `compose.production.yml` has no embedding service of either kind. Its absence
  does not prove an outage: the effective production endpoint and container
  connectivity are unknown.

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
  or retrieval even after the embedding model has been unloaded or stopped.
- Ollama embedding requests omit `keep_alive`. Ollama documents a five-minute
  default residency unless its configuration changes this. llama.cpp keeps its
  model loaded for the life of the server process, so locally the cold case is
  a process start, not an idle unload. Cached questions still avoid a model call.
- Knowledge retrieval defaults to five chunks. Document index definitions exist
  in migration 0020; applied indexes and actual query cost remain runtime checks.
- Tools marked with confirmation metadata are **blocked** by the chat adapter.
  It does not implement an executable approval/resume flow. Benchmark the blocked
  outcome; do not introduce writes as part of latency optimization.

### 2.3 Evidence currently missing

The 2026-09-30 local preflight verifies the local inventory, effective routing
settings, and embedding failure only. The remaining statements below describe
gaps in chat-stream, internal timing, production, and billing evidence.

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

### 2.4 Routing correctness prerequisites before cap tuning

The matching Desktop sources for `najm-rag@2.0.3` and `najm-chatbot@2.0.3`
were reviewed again on 2026-09-30; recheck them against the `najm-rag@2.1.2`
pin. Before comparing a smaller tool limit:

- Evaluate complete operation-plus-lookup coverage. Dependency expansion followed
  by a final slice can remove a required lookup even if the primary tool survives.
- Compare selection after permission-based candidate filtering. The current
  routable-tools filter only excludes RAG Studio internals; execution guards remain
  a separate boundary. Admin preview does not establish teacher authorization.
- Test unequal example-phrase coverage. Summing the strongest three scores can
  favor a tool with several weaker phrases over one stronger match. Tool-description
  retrieval only runs when no semantic phrase qualifies.
- Test topic changes and short follow-ups. Routing uses the latest three user text
  turns by default, not assistant clarification text or image contents. The selected
  tools remain fixed within an LLM request. Photo extraction and approval/resume
  are separate workflow requirements, not routing configuration changes.
- Do not treat preview as the production router: `RoutingPreviewService` expands
  dependencies one level and returns no tools on an embedding error, while
  `ToolRouterService` expands transitively and applies its configured error fallback.
  Preview also does additional scoring work. Check parity before using preview
  results to certify the chat path; an HTTP 200 can contain `router_error`.

The initial 20-case routing corpus includes English, French, Arabic, Spanish,
Darija, mixed language, follow-up text, and a topic switch. Its expected tool groups
are minimum candidate coverage checks, not proof of valid arguments or completed
school operations. Expand to the section 6 benchmark before making accuracy claims.
The last result, 12/20 in `routing-final.json`, predates the 2026-10-02 query
instruction and description changes; re-run all 20 cases (and confirm the tool
index covers the new count tool and changed descriptions) before treating any
routing number as current.

## 3. Test prerequisites and required APIs

| Requirement | Purpose and configuration |
|---|---|
| Running School app and test account | Exercise authenticated `/api/chat`; admin access for configuration/debug only where required |
| Existing chat provider key and exact model ID | **Met on both workstations:** OpenRouter / `openai/gpt-oss-120b`. On the second, the key was saved through `PUT /api/ai-settings` from a local env variable on 2026-10-02. Record the custom base URL if applicable |
| Seeded test data | **Met on the second workstation (2026-10-02):** `seed:demo` after verifying the synthetic 2026-2027 calendar; 100 students, 946 student attendance rows, 64 grades |
| Working embedding endpoint | **Met on both workstations** via `RAG_EMBEDDING_PROVIDER=openai-compatible`: llama.cpp Qwen on 18081 (started manually; confirm it runs before each run) or Ollama Qwen at `11434/v1`. Ollama EmbeddingGemma remains the source default; none needs a provider API key locally |
| pgvector schema on the target database | `vector` extension present and RAG embedding columns typed `vector(768)`; `db:check` does not detect a mismatch |
| Selected academic year | Fix the year sent with each chat request; it changes tool results and the system prompt |
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
3. Probe the configured embedding endpoint **from the application runtime's
   network context**, checking provider, vector dimensions, and model
   availability. A successful host probe does not establish access from an
   application container.
4. On the database actually used, confirm the `vector` extension and that the
   three RAG embedding columns are `vector(768)`. The local database lacked
   both until the 2026-09-30 repair, and `db:check` did not notice.
5. Inventory registered and indexed tools and knowledge documents; a tool was
   added after the 428-tool count (`students_get_student_count`), so recount
   and confirm the index is current. Record effective limits, dependency rules,
   knowledge enablement, and error/no-match fallback settings.
6. Use the admin debug route on a few read-only questions to inspect routing and
   tool calls. Keep these diagnostic runs separate from streaming measurements.
7. Start locally or in staging. If production inspection is in scope, record its
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
| Identity | Request/run/case ID, role, language, selected academic year, provider/model, config/package/dataset versions, history size |
| Preparation | Settings/history load, academic-year validation and School context provider, total preparation, routing, and knowledge-context durations |
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
4. Decide logging explicitly in `chatbotConfig()`. `chatLogging.enabled`
   already defaults to `true`, which today inserts into a missing table. Either
   enable it with the table and a retention rule, or use `onDiagnostics` alone,
   which carries no question text or tool arguments. The benchmark runner can
   match rows to cases by sending `x-request-id`, which is recorded as
   `correlationId`.
5. Verify successful, blocked/denied, embedding-failure, and aborted requests;
   check correlation, aggregate usage, log persistence, and terminal outcomes.
6. Re-run unchanged cases/settings to measure instrumentation overhead before
   adopting unrelated performance changes.

**Gate:** usable correlated traces and a controlled baseline report. Claims about
which internal stage dominates require this evidence; Phase 0 still provides an
external baseline while the releases are pending.

## 6. Benchmark contract

Files (created 2026-10-02 unless noted):

- `scripts/chatbot-benchmark.mjs` with `scripts/chatbot-stream.mjs` (parser,
  tested in `scripts/tests/chatbot-stream.test.mjs`): streaming runner, request
  limits, and budget controls. `.mjs` follows the other `scripts/` runners.
  Server diagnostics are read for each request by `x-request-id` (2026-10-03).
  Still to add: interleaved baseline/candidate runs, declared concurrency above
  one, and non-admin accounts.
- `datasets/chatbot-latency/questions.json`: currently a 12-case smoke set;
  grow it to the section 6.1 corpus.
- `docs/tests/chatbot-latency.md`: setup, execution, and scoring; cache
  controls arrive with section 6.2 work.
- `docs/evidence/chatbot-latency/`: sanitized raw samples and comparison reports.

### 6.1 Corpus and correctness

Start with 40 questions, 10 per language: small talk, grounded knowledge,
single-tool reads, multi-tool reads, and attempted writes that must remain blocked.
Each case specifies role, selected academic year, fixture IDs, expected
tools/alternatives, important arguments, answer facts, and refusal behavior.
Include count questions: list-based counting took 71–79 s and gave wrong totals
before the aggregate tool existed. Human-review quality in every
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
| Empty application caches, warm embedding model | Clear both caches through supported test controls or restart the isolated app; verify an actual embedding call without a model reload |
| Empty application caches, cold embedding model | Empty both caches, then unload the isolated Ollama model or restart the isolated llama.cpp process; verify a real call and reload |
| Embedding process down | Stop the isolated llama.cpp process and measure the outcome; this is the failure seen on 2026-10-01 |
| Concurrent traffic | Declare client concurrency; report queueing, rate limits, errors, and results separately |
| Failure paths | Exercise refused connections, hanging embedding requests, provider failures, and client cancellation in isolation |

Unloading or restarting the embedding model alone does not make a repeated query cold. Restarting the app can
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

1. **Embedding availability/residency.** Repair the endpoint where needed. For
   llama.cpp, run the embedding server under supervision (a startup service or
   container with restart and a health check) so a stopped process is restarted
   rather than discovered by a failed chat; check its memory footprint first.
   For Ollama, evaluate `OLLAMA_KEEP_ALIVE=-1` after checking memory capacity,
   and verify the running process received it; the setting does not itself
   preload a model after restart.
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
5. **Compare chat models.** Start with the current model (OpenRouter /
   `openai/gpt-oss-120b`) and one cheaper tool-capable
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

School's published package pins and live runtime are authoritative. Per AGENTS.md,
inspect matching Desktop package sources as read-only references; do not read
Najm internals from `node_modules` or make School consume the Desktop checkouts.
**Source location unresolved (2026-10-02):** AGENTS.md names
`C:\Users\hdevlop\Desktop\najm`, the paths below assume `../najm`, and neither
exists on the current machine (`C:\Users\pc\Desktop`). Section 2 cannot be
re-verified until the Najm checkout is located or cloned at the matching tag.

- `package.json`, `bun.lock`: pins and resolved dependencies.
- `packages/server/src/config/index.ts`: embedding/chatbot policy.
- `packages/server/src/modules/chat/SchoolChatContextProvider.ts` and
  `config/yearScope.ts`: per-request year validation and prompt context.
- `scripts/start-local-embeddings.ps1`, `docs/tests/local-embeddings.md`: local
  llama.cpp embedding server.
- `packages/server/src/database/schema/index.ts`: exported tables.
- `apps/dashboard/src/shared/DashboardShell/index.tsx`: chat endpoint integration.
- `compose.production.yml`: declared services, not effective production settings.
- `../najm/packages/najm-chatbot/src/agent/ChatAgent.ts` and `McpToolAdapter.ts`:
  streaming, preparation, debug, tool adaptation, logging, and usage cost.
- `../najm/packages/najm-rag/src/`: embeddings, toolRouter, knowledge, and caches.
  Compare package.json versions with School pins before relying on these sources.
- `node_modules/ai/dist/index.d.ts`: stream events and aggregate usage contract.

External references:

- [Ollama FAQ](https://docs.ollama.com/faq): residency and server configuration.
- [Qwen3 Embedding 0.6B GGUF](https://huggingface.co/Qwen/Qwen3-Embedding-0.6B-GGUF):
  the local embedding model.
- [TypeSafe: Introducing System One Models and Jev](https://typesafe.ai/blog/introducing-system-one-models-and-jev): capabilities, advertised pricing, and timing caveats.
- [TypeSafe documentation](https://docs.typesafe.ai/): verify the current API,
  model versions, and error contract before Phase 4. The API reference was not
  accessible during review; exact API/version claims remain unverified.
