# Streaming chat benchmark

`scripts/chatbot-benchmark.mjs` measures the real `POST /api/chat` stream the
dashboard widget uses (CHATBOT-LATENCY-PLAN section 4.2). It signs in as the
local admin from `apps/dashboard/.env.local`, sends each fixture as a fresh
session in the fixture's academic year, and parses the AI SDK UI message
stream across network chunk boundaries.

**It spends provider money.** Every live run needs `--max-requests`, and the
runner refuses before any chat request when the planned count exceeds it, or
when AI Settings is disabled or has no saved key.

## Run

From the repository root:

```powershell
bun scripts/chatbot-benchmark.mjs --validate
bun --env-file=apps/dashboard/.env.local scripts/chatbot-benchmark.mjs --preflight --output=docs/evidence/chatbot-latency/preflight-YYYYMMDD.json
bun --env-file=apps/dashboard/.env.local scripts/chatbot-benchmark.mjs --transport-probe --max-requests=1
bun --env-file=apps/dashboard/.env.local scripts/chatbot-benchmark.mjs --limit=12 --max-requests=12 --output=docs/evidence/chatbot-latency/stream-smoke-YYYYMMDD.json
```

| Option | Default | Meaning |
|---|---|---|
| `--max-requests` | 0 | Budget: chat requests this run may send (cases × repeats) |
| `--preflight` | off | Read health and saved AI settings after login; zero chat requests or model updates |
| `--max-estimated-usd` / `--request-reserve-usd` | unset | Optional client estimate stop / declared estimate reserved per in-flight request; both positive and supplied together |
| `--pricing-file` | unset | Explicit OpenRouter estimates for missing installed prices; requires the estimate budget, coherent token counts and matching stream/server model; raw metadata stays unchanged |
| `--cases` | `datasets/chatbot-latency/morocco.json` | Complete Morocco corpus: Darija, Arabic, French; frozen school facts |
| `--languages` | all | Comma-separated case languages, e.g. `fr,ary` (Darija); `--limit` applies after |
| `--limit` / `--repeat` | all / 1 | First N cases, repeated; baseline/candidate pairs interleave when `--compare-model` is set |
| `--compare-model` / `--baseline-model` | unset | Candidate ID / optional baseline override; saved model restored afterwards |
| `--year` | fixture `academicYear` | Sent as `?academicYear=`, as the widget does |
| `--timeout-ms` | 120000 | Per request, including the whole stream |
| `--concurrency` | 1 | Bounded workers: 1, 2 or 4; comparison and transport-probe modes require 1 |
| `--cache-mode` | uncontrolled | `fresh` resets query-embedding and knowledge-context caches before each serial chat and verifies the resulting routing miss |
| `--keep-text` | off | Store answer text; off by default because answers can name students |
| `--transport-probe` | off | Send one request even without a key, to prove body, year and stream framing |

Live runs hold a machine-wide `school-chatbot-benchmark.lock` in the temporary
directory. This prevents overlapping runs from updated School checkouts,
including comparisons that change shared model settings. Preflight remains
read-only and needs no lock. Provider/model settings are checked before every
chat. A process killed without cleanup may leave a stale lock; verify that its
recorded PID is no longer running before removing it. Older runners do not
participate in this cooperative lock.

`najm-chatbot` template replies identify `server.reply.source = "template"`,
emit actual guarded tool reads and report zero LLM usage/cost. Their selected
model label does not mean a provider generated their text. The derived
`modelAndStreamMs` is zero for these replies; keep template and model samples
separate when interpreting generation speed. Template/helper hashes are retained
in the report alongside the corpus, prompt and scoring hashes.

Only loopback URLs are accepted. Requests run serially by default; each
concurrent worker holds its slot through stream completion and diagnostic
retrieval. Concurrency changes overlap, not the planned request count or budget.
`--max-requests` limits chat requests, not monetary spend or model-internal
steps/retries. Declare prices and a monetary budget separately before paid runs.

Preflight records source/corpus hashes, package pins, revision/dirty state and
redacted saved-model readiness. `preflight_ok` means the reads succeeded; check
`readyForChat` separately. It does not validate provider connectivity, prices,
tool schemas, cache emptiness or embedding residency. It accepts no comparison,
transport probe or concurrent mode.

With both estimate-budget options supplied, the runner reserves the declared
amount before dispatching each chat, then settles from priced stream metadata.
If another reservation cannot fit, cost is unknown, or observed estimates exceed
the budget, scheduling stops and existing streams drain. Unknown costs retain
their reservation instead of counting as free. `report.estimatedBudget` records
the stop reason, known estimates and unresolved reservations; unknown usage is
also counted in `summary.usage`. With the options unset, no estimate stop applies.

This is **not a hard provider billing cap**: reservations are user-declared
estimates, in-flight calls continue, and missing usage/retries/provider charges
may exceed them. Use a verified isolated-provider limit for a hard monetary
ceiling. Record the reservation assumption and current price source/date in the
run evidence. No paid run or amount is authorized by these example commands.

For a model missing from installed pricing, `--pricing-file=<path>` accepts a
frozen JSON object with `provider: "openrouter"`, `capturedAt`, `source` and
`models: { "exact-model-id": { "inputUsdPerMillion": 0.14, "outputUsdPerMillion": 0.4 } }`.
Rates must be positive finite numbers. Declare and justify them before execution.
Fallback budgeting requires complete coherent token counts and the same exact
model in SDK metadata and correlated server diagnostics. Missing usage or an
unknown/mismatched model still stops scheduling. `sample.declaredCost` and
`summary.declaredCosts` report these estimates separately; `summary.usage` keeps
the original SDK pricing coverage and metadata unchanged. A declared rate is
not a provider charge or guaranteed upper bound.

## What is recorded

Per request, from a monotonic clock started before `fetch`: response headers,
first byte, **first non-empty `text-delta`** (not metadata, reasoning or tool
events), the `finish` chunk, and body end. Also the finish reason, chunk counts,
each tool call's name and outcome (`output`, `error`, `denied`,
`approval-requested`, `input-error`, `none`), stream errors (truncated),
message metadata, and the answer length.

Outcomes: `completed`, `stream_error`, `http_error`, `timeout`,
`request_failed`, `aborted`, `incomplete` (body ended without `finish`) and
`empty_answer`. HTTP 200 alone is not success. The summary counts every
outcome and computes nearest-rank p50/p95 over completed requests only, by kind
and language; failures are never dropped silently.

With `najm-chatbot` 2.0.4 or later, each request's `metadata` holds its token
counts and estimated cost, and the summary's `usage` block totals them. Older
versions sent none.

Automatic checks: every `expectedToolGroups` group has a tool that returned
output, no `forbiddenSuccessfulTools` executed (server diagnostics), and all
`answerFacts` appear at word/number boundaries after digit normalization.
`forbiddenAnswerFacts` must be absent. `expectedToolCalls` require a successful
tool from each alternative group with an exact subset of expected arguments.
Arguments are captured in memory for scoring and stripped from saved tool reports.
Without server
diagnostics the scorer falls back to stream output, which cannot distinguish
a blocked result from a real write and needs review. The runner also checks
reply language, false completed-write claims (`falseWriteClaims`) and future
write offers (`writePromises`). Darija expects Arabic-script output. Null
language detection now fails automatic acceptance and sets `reviewRequired`;
an explicitly language-neutral fixture may set `replyLanguage: null`.
`schoolFacts` binds every displayed exam's date, start/end time, name,
class/section and next-five order to its own authoritative row. Class lists
require every class and its exact sections; numeric prefixes such as `2A`
fail when the stored name is `A`. Inconsistent total/remaining count claims
also fail. These checks are scoped to the recorded list facts and supported
date/count forms; they do not prove every possible narrative claim.

`storedNames` exempts only exact values at word boundaries (Unicode whitespace
is normalized). Language checks inspect tables, parenthetical text and list
glosses, catch foreign prose and unsupported scripts, and flag formal Arabic
for Darija. This register heuristic is not native-speaker quality assurance.
Reports include `factFailures` (codes/indices, no private values),
`mixedLanguage`, `wrongRegister`, and scoring-source hashes. Inconclusive
language and factual failures cannot receive an automatic pass.
Blocked-write cases without server diagnostics also require review and cannot
receive an automatic pass. Older reports used weaker scoring and must be re-run.

Example fixture assertion (argument keys are an exact subset; extra pagination
fields are allowed):

```json
{
  "expectedToolCalls": [
    { "tools": ["search_search_students"], "arguments": { "q": "Zzbench Qqtest" } }
  ],
  "forbiddenAnswerFacts": ["a fixture-specific forbidden record"]
}
```

## Fixture

The default `datasets/chatbot-latency/morocco.json` has **30 cases**, all ten
original scenarios in each of Darija, Modern Standard Arabic and French.
Refresh its authoritative snapshot before a paid run, without provider calls:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/chatbot-school-facts.ps1 -BaseUrl http://localhost:3104 -Output docs/evidence/chatbot-latency/morocco-school-facts.json
bun scripts/chatbot-morocco-corpus.mjs --facts=docs/evidence/chatbot-latency/morocco-school-facts.json
bun test scripts/tests
bun scripts/chatbot-benchmark.mjs --validate
```

The PowerShell reader explicitly decodes UTF-8 even if the JSON response lacks
a charset, protecting stored French/Arabic names. The corpus records the facts'
capture time and SHA-256. A full two-repeat Morocco run needs 60 outer requests;
one interleaved baseline/candidate pair per case also needs 60. Record budgets
and routing prices separately before spending.

The legacy `datasets/chatbot-latency/questions.json` remains available via
`--cases=...`. It contains 50 independent cases, ten
each in English, French, Spanish, Modern Standard Arabic and Darija: greetings,
counts, classes, attendance, upcoming exams, multi-tool reads, missing students
and blocked writes. The initial corpus had 12 cases; `--limit=12` now selects
the first twelve current cases, not that historical four-language smoke set.
The missing-student name (`Zzbench Qqtest`) deliberately matches nothing.
Count answers depend on `seed:demo`; verify fixture counts for the selected
year before a run. Populated knowledge, ambiguity and broader conversation/role
coverage remain work in CHATBOT-LATENCY-PLAN section 6.

In the first run, no chat session rows were written (`chat_sessions` stayed
empty), and no other records were written.

A refusal without a tool call checks the model's read-only reply, not adapter
blocking. Check `checks.blockedTools` and the server's `blocked` outcome before
claiming the adapter was exercised. Synthetic missing names may stop at lookup;
the separate real-demo-student blocking evidence is recorded in the plan.
An offer to record attendance after requesting an ID is still a quality failure,
and is now checked by `findWritePromise` alongside completed-write claims.

`scripts/chatbot-roles.mjs` separately signs in as demo parent, teacher and
student accounts and checks their own records, forbidden student data and admin
follow-ups. Its 10/10 local result is smoke evidence; the main benchmark runner
still supports admin only. Keep role checks separate until their fixtures and
controlled timing/reporting are integrated.

## Server timings

Each chat request carries `x-request-id: <sessionId>`. Once its stream ends,
the runner reads the matching record from `GET /api/chat-diagnostics/:id`. That
route is admin only and returns 204 until the record lands. The record is kept
in memory, holds the last 200 requests and contains no question text. It is
stored as `sample.server`. The summary's `server` block gives p50/p95 for:

- the stages: settings, history, routing, context, preparation and the session
  save;
- tool time;
- server first text and finish;
- `modelAndStreamMs`, derived as the finish mark minus the stages before the
  model and the tool time;
- the gap between server and client first text.

With `najm-chatbot@2.2.1` and `najm-rag@2.4.0`, `sample.server.embeddings`
also records routing, context and tool-side embedding calls: operation/purpose,
cache hit/miss/bypass, duration, provider/model, timeout bound and outcome, plus
actual provider attempts. Offsets are relative to chat request start. Input
text, vectors, endpoints, credentials and raw embedding errors are omitted.

`summary.embeddings` includes failed requests and reports cache/outcome counts,
actual attempts and separate p50/p95 call/attempt durations. Missing capture
is unknown; an empty array means no settled call was recorded.
`embeddingsIncomplete` flags capture still running when chat ended, so partial
records never count as verified zero calls. Attempts nest inside calls; calls
overlap routing/context/preparation/tool execution. Do not add their durations.
Restart a running app after package adoption before measuring the new contract.
See [release evidence](../evidence/chatbot-latency/embedding-diagnostics-20261004.md).

## Fresh application-cache samples

On an **isolated local dev app**, set `CHATBOT_BENCHMARK_CONTROLS=true` before
starting it. Production resets are always refused, regardless of this flag.
The REST-only `GET /api/chat-benchmark/status` and
`POST /api/chat-benchmark/reset-caches` require a signed-in administrator.
Leave the flag unset on the shared app.

First check readiness without resetting or chatting:

```powershell
bun --env-file=apps/dashboard/.env.local scripts/chatbot-benchmark.mjs --preflight --cache-mode=fresh --output=docs/evidence/chatbot-latency/cache-preflight-YYYYMMDD.json
```

Then use `--cache-mode=fresh` on the separately budgeted live run. Only
concurrency 1 is supported for this mode: clearing shared process caches during
another benchmark request would invalidate the condition. Every sample records
the reset instance/count and verifies matching terminal diagnostics, complete
embedding capture, and a routing `cache: miss` with a completed provider attempt.
A successful reset alone cannot pass. Wrong instances, another reset, cache hits,
cooldown skips, routing disabled/no call, failures and partial traces fail the
condition. `summary.cacheConditions` reports verified and failed samples.
Failed fresh-cache verification retains the sample and stops further scheduling.
Reset HTTP timings are recorded in `report.requests`, outside chat first-text
and completion timings; they are included in the overall `loadElapsedMs`.

The public controls clear `EmbeddingService.clearQueryCache()` and
`KnowledgeContextProvider.clearCache()` on their injected app instances. They
do not clear the failure cooldown, settings caches, conversation data, provider
prompt cache or embedding model residency, and do not alter the database/index.
Within-request knowledge embedding reuse can still be a hit after routing
embedded the same text. These controls do not establish a cold-model or populated
knowledge baseline. See [cache-control evidence](../evidence/chatbot-latency/cache-controls-20261004.md).

The runner validates each diagnostic record's `correlationId` and each embedding
span's ID against the request's `x-request-id`. Mismatched records are discarded
before scoring and summaries, with `sample.correlationError` recorded. Such a
request fails acceptance. Concurrent runs additionally require a verified
server record for every request; unavailable diagnostics cannot prove isolation.

## Concurrent load

Run each load level separately with its own budget and output; keep the saved
model fixed. For example, after recording the monetary budget and cache/model
conditions:

```powershell
bun --env-file=apps/dashboard/.env.local scripts/chatbot-benchmark.mjs --concurrency=2 --max-requests=50 --output=docs/evidence/chatbot-latency/load-2-YYYYMMDD.json
bun --env-file=apps/dashboard/.env.local scripts/chatbot-benchmark.mjs --concurrency=4 --max-requests=50 --output=docs/evidence/chatbot-latency/load-4-YYYYMMDD.json
```

`summary.load` reports declared concurrency, verified/missing diagnostic records,
correlation errors, duplicate request IDs, HTTP 429 responses and client queue
p50/p95. `sample.clientQueueMs` measures waiting for a worker from the start of
the scheduled batch; it is separate from request first-text/completion latency.
It does not measure server or provider queueing. `loadElapsedMs` includes
diagnostic retrieval. Samples retain planned order via `scheduleIndex`, even
when streams finish out of order. Failures remain in outcome counts; mismatched
records contribute neither server nor embedding measurements.

This is a closed workload with bounded workers, not a fixed request-arrival-rate
test. Shared routing caches may make overlapping repeated questions hit different
cache states. Record actual observed states and do not pool load levels. Mocked
CLI tests verify scheduling/correlation, not live isolation, throughput or p95.
See [load-runner evidence](../evidence/chatbot-latency/concurrent-runner-20261004.md).

Forbidden writes are scored from the server's tool outcome (`executed` versus
`blocked`), because the stream shows both as an output event. Without a server
record the runner falls back to the stream (`forbiddenCheckSource`).

## Comparing models

`--compare-model=<id>` runs every question once on the saved model and once on
`<id>`, using the same provider and key. Each pair alternates which model goes
first, and each request uses a fresh session. Between requests the runner sends
`PUT /api/ai-settings { model }` and checks each server record's `model`; a
mismatched sample is excluded and fails the run. The saved model is restored at
the end, even after a failure. Any failure to restore is reported as
`restoreFailed`. The budget counts both variants: the default 30 Moroccan
questions once need `--max-requests=60`; two repetitions need 120. Settings
updates apply to every app sharing the database, including separate checkouts.
Coordinate comparisons so a second runner cannot change a measured model.

```sh
bun --env-file=apps/dashboard/.env.local scripts/chatbot-benchmark.mjs \
  --max-requests=60 --compare-model=openai/gpt-oss-120b:nitro \
  --output=docs/evidence/chatbot-latency/model-<name>-YYYYMMDD.json
```

To compare two models that are neither the saved one, add
`--baseline-model=<id>`. The saved model is still restored at the end.

The summary holds one block per variant under `summary.comparison`. Do not run
it while someone is using the assistant: the saved model changes for everyone
during the run.

Nemotron Lightning was rejected after the reply-fix comparison. The saved
model remains GPT-OSS. GPT-OSS 120b Nitro previously failed the older 50-case
comparison; any new route comparison must pass the stronger Moroccan checks.
Recheck model availability and prices before any new comparison;
use the proposed gates in CHATBOT-LATENCY-PLAN section 6.4.

## Limits

Darija wording is handled by `createDarijaQueryRewriter` from the published
`najm-rag@2.3.0`. School's wrapper supplies its attendance, grade, payment,
family/contact and transport words plus its phone-number interpretation.
Literal `rewriteRules` transform routing input; semantic phrases remain example
questions attached to tools. Other apps opt in with their own vocabulary.
The migration preserves all 109 checked routing outputs; it adds no LLM call.
See [migration evidence](../evidence/chatbot-latency/darija-shared-20261004.md).

- API-client timings including local transport; not browser rendering.
- Main runner: admin only; separate role/follow-up smoke runner exists.
- Default runs leave application caches uncontrolled. Fresh mode supports
  verified query/knowledge resets; embedding model load state and provider
  prompt caching still need separate controls (section 6.2).
  Repeating a question hits the routing cache: about 6 ms instead of about
  150 ms for a new one.
- Embedding capture is available; historical records and running apps that have
  not loaded the new versions may lack it. An instance-level embedding cache
  reset does not control every application cache or embedding-model residency.
- Concurrency 1/2/4 and an optional client estimate stop are supported; controlled
  live concurrency runs and a verified provider billing cap remain pending.
  Existing uncontrolled serial runs do not establish the
  proposed acceptance targets or production SLA.
