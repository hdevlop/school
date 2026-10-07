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
| `--pricing-file` | unset | Explicit OpenRouter estimates; default fallback for missing SDK prices or declared mode for known prices; requires budget and coherent matched usage |
| `--pricing-mode` | `fallback` | `declared` uses the price file even when SDK prices exist; never falls back to SDK prices on missing/mismatched usage |
| `--capture-provider-usage` | off | Read the selected School key's ledger before/after a run through dev/admin controls; no paid generation or credentials returned |
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

School's `schoolListReplies.ts` now renders narrow, whole-message class lists,
next-five exam lists and today's student attendance through the same guarded
executor. Qualified/quoted/unsupported requests remain on the model path.
Attendance handles both empty and populated results, showing up to 20 actual
rows without phones/notes and with a truncation notice. Malformed data throws
into the executor's existing controlled error response; there is no post-read
model fallback. The new helper hash is retained with the other template hashes.

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

Use `--pricing-mode=declared` with an explicit price file and both budget options
when installed SDK rates are stale for the configured routing policy. Every
sample needs coherent stream token counts and matching correlated server
provider/model; otherwise scheduling stops with unknown cost. SDK metadata and
`summary.usage` stay unchanged, while `sample.declaredCost`, `summary.declaredCosts`
and the estimate stop use the declared rates. Templates with verified zero usage
can have a zero declared estimate. Current catalog maxima across eligible hosts
can supply a conservative assumption; they are not a verified per-call host or
guaranteed bound on future prices, fees or missing usage. `budgetSourceSha256`
records the accounting implementation separately from answer-scoring hashes.

`--capture-provider-usage` reads `/api/chat-benchmark/provider-usage` before and
after live scheduling, while holding the runner lock. This REST-only admin route
requires `CHATBOT_BENCHMARK_CONTROLS=true` and refuses production. It uses the
decrypted selected key in-process against a fixed OpenRouter key endpoint and
returns only ledger numbers, provider/model and an environment-key equality
boolean. Neither credentials, fingerprints nor raw provider response bodies are
returned. An unsupported provider or failed initial read blocks chats. A failed
final read is recorded as unknown billing. The window delta includes any other
traffic on that key; it does not attribute hosts, cache discounts or embedding
infrastructure cost. Preflight captures one read without chats.

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

Attendance fixtures now declare `emptyResultTools`. The runner's opt-in stream
capture retains only an array's `resultSummary` (`kind`, `count`), decoding Najm's
JSON-as-text output as needed. It stores no result rows or names. If an authorized
read succeeds with zero rows, the answer must explicitly report the empty result
and must not claim unavailability or suggest settings/retry advice. Missing or
unknown array shape/execution evidence requires review; it is never assumed to
mean zero rows. Populated arrays and genuine tool errors are separate cases.
These multilingual wording checks remain heuristics and need reply review.

The parser's default still captures no tool-result summary. The benchmark enables
summary capture and includes `chatbot-empty-reads.mjs` in its scoring hashes.
Default Moroccan corpus version 4 and legacy corpus version 3 include this policy;
the generator carries it through from the legacy cases. Historical raw scores,
including the 60/60 automatic result on 2026-10-04, remain unchanged. Old samples
lacking result summaries cannot certify the new empty-read gate.

The [2026-10-05 focused live check](../evidence/chatbot-latency/empty-read-results-20261005.md)
ran the three Moroccan attendance cases twice with the updated scorer: 6/6
automatic and assistant passes, six successful empty arrays and verified fresh
caches/correlation. This narrow check does not replace full-corpus acceptance.

The later [full post-fix repeat](../evidence/chatbot-latency/postfix60-results-20261005.md)
passed all 60 automatic and assistant checks, with serial timing targets met.
Declared estimates and delayed stable selected-key usage exceeded the unchanged
cost gate; paid load/model expansion and rollout remain deferred. Immediate
zero ledger deltas can be stale and must not be counted as free generation.

The subsequent [guarded-list repeat](../evidence/chatbot-latency/list60-results-20261005.md)
passes 60/60 automatic/assistant checks and serial timing/estimated-cost gates
on this corpus: actual observed window increase $0.012718700 for 60 replies,
declared estimate $0.012989100, 48 templates/12 model replies and 18 generation
steps. Broader conditions remain. [Price-unit reconciliation](../evidence/chatbot-latency/price-units-20261005.md)
explains the user's rounded $0.06/66 view and distinguishes actual bills from
per-1,000 workload projections; lead with actual run spend when reporting cost.

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

`scripts/chatbot-roles.mjs` separately checks parent, teacher and student own
records, forbidden data and admin follow-ups. Its historical 10/10 result is
smoke evidence; the main benchmark runner still supports admin only. The direct
SQL fixture picker has been removed. Capture current selected-year membership
through internal MCP/REST into a private file outside the repo, then validate it
offline (no login or chat in `--preflight`):

```powershell
$roleFixturePath = Join-Path $env:TEMP 'school-private-role-fixtures.json'
./scripts/chatbot-role-fixtures.ps1 -BaseUrl http://localhost:3102 -AcademicYear 2026-2027 -Output $roleFixturePath
bun scripts/chatbot-roles.mjs --fixtures-file=$roleFixturePath --preflight
```

Do not publish the private fixture: it contains identities and parent phones.
The runner requires a matching year, explicit `--max-requests`,
`--max-estimated-usd`, `--request-reserve-usd` and a dated OpenRouter
`--pricing-file` for live work. Ten scenarios require twelve outer chats because
follow-ups have two turns. A future separately authorized run uses:

```powershell
bun --env-file=apps/dashboard/.env.local scripts/chatbot-roles.mjs `
  --fixtures-file=$roleFixturePath --max-requests=12 `
  --max-estimated-usd=<approved-client-allowance> --request-reserve-usd=<declared-estimate> `
  --pricing-file=<dated-model-rates.json> --output=<new-report.json>
```

The client stop reserves before dispatch and prices measured usage from the
declared rates. Unknown usage or mismatched diagnostics retains the reservation
and stops further chats; known costs from failed requests remain counted. This
is an estimate stop, not a provider billing cap. No allowance is supplied by the
example. Verify a suitable provider limit before a future run.

Admin-authenticated diagnostics are matched to each turn's unique request ID,
including embedding correlation. Missing/malformed/partial capture or changed
provider/model stops the run. Diagnostic polling is excluded from chat duration.
Reports keep each turn separately, checkpoint after attempts and refuse existing
output paths. Default reports omit fixture identities, query/reply text, tool
arguments and outputs. `--keep-text` creates private content-bearing evidence.
The shared benchmark lock prevents another participating local runner from
changing settings during the test. Application caches remain uncontrolled.

[Offline control verification](../evidence/chatbot-latency/role-measurement-readiness-20261006.md)
exercises a full mocked twelve-turn run and stopped attempts, with no real login,
provider, tool or database requests. The later
[live twelve-turn smoke](../evidence/chatbot-latency/role-live-results-20261006.md)
has 12/12 correlated captures, but assistant review is 9/10 despite automatic
10/10. Keep the failed Darija not-found/empty-attendance claim and denied
finance-profile selection visible; broader live role acceptance remains open.
The [offline correction](../evidence/chatbot-latency/role-lookup-fix-20261006.md)
now rejects the saved wording under its confirmed empty-search contract and
requires matching executed terminal evidence. Diagnostic tool errors/blocks are
retained separately from UI-output events. Scoring still uses finite wording
heuristics and requires answer review; this is not a new live accuracy pass.
The subsequent [focused live recheck](../evidence/chatbot-latency/role-recheck-results-20261006.md)
reviews 6/6 answers across the two known parent cases. Its original automatic
5/6 false positive remains; a separate corrected scoring reconstruction passes.
It does not replace full role/year or native acceptance.

Use `--case-ids=parent-children-en,parent-other-absences-ary --repeat=3` to select
this six-chat schedule. Repetitions are limited to 1–5; unknown or duplicate case
IDs fail before authentication. A repeated follow-up uses two chats each time.
`--preflight` reports the selected count offline; the live run still requires its
own request cap, client budget, reservation and pricing file. The example above
does not grant another allowance; the recorded six-chat allowance is consumed.
[Current preparation](../evidence/chatbot-latency/role-preparation-20261005.json)
validated fixtures without paid role chats; it does not prove role login,
ownership, language or current-model acceptance.

## Server timings

Each chat request carries `x-request-id: <sessionId>`. The runner also retains
`sample.streamTimings`: client arrival milestones for
stream/step starts, tool input/output, each step's first non-empty text, step/end
and errors/aborts, plus last-text time. Milestones contain only type, relative
milliseconds and step index; no payloads/identities/arguments. Storage is bounded
at 128 events with `droppedEvents` exposed. Templates have no model-step markers.
Arrival intervals include transport and SDK buffering: `start-step` is not the
provider generation start, and these events do not measure provider queue/retries.

Once its stream ends,
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

[Live checks on 2026-10-05](../evidence/chatbot-latency/load24-results-20261005.md)
ran sixty replies separately at levels 2 and 4, with one initial cache clear per
batch, then 30 misses/30 hits each. All 120 diagnostics correlated. Level 2 passed
60/60; level 4 passed 59/60 and first-text p95 8.166 s missed the 8 s gate.
The French identifier-label hint was fixed locally after those frozen runs;
paid post-fix acceptance remains unrun. Actual observed combined key increase
was $0.025388000. Preserve separate percentiles and the failed gate; these small
closed batches do not establish production capacity or provider queue causality.

The [subsequent wording/load recheck](../evidence/chatbot-latency/stream-recheck-results-20261005.md)
passed all six original French lookup repeats and both French lookup rows in
the new level-4 batch. That batch's first-text/completion p95 was 1.854/1.879 s.
Its raw automatic result remains 59/60: a correct French greeting was flagged
because `nombre` was scored as exclusively Spanish. Assistant review accepted
60/60. The separate offline language audit identifies exactly that false positive;
prospective scoring treats the shared word correctly and still rejects the earlier
English `student ID` failure. Raw results and their original gates are unchanged;
no extra paid run or expansion followed this allowance. Timing variation does not
prove a latency fix or concurrency causality.

[Pinned provider comparison](../evidence/chatbot-latency/provider-compare-results-20261005.md)
used separate temporary apps differing only in provider-routing configuration,
with `only`/no fallbacks/require-parameters and four serial/fresh thirty-case
ABBA blocks. This avoids shared model/settings mutations; it is not the runner's
`--compare-model` mode or per-request interleaving. Both providers passed 60/60
with the corrected scorer. Crusoe's declared sixty-reply cost was 84.10% lower,
but model completion mean was 3.306 versus 1.318 s on Cerebras. Preserve per-block,
model/template and same-provider repeat statistics; do not compare global public
TTFT directly with complete two-step School answers. A separate Jev probe used
the same key; aggregate ledger movement reconciles, not isolated host invoices.
Root defaults unchanged.

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

### Jev classification-only probe

`scripts/chatbot-jev-probe.mjs` sends synthetic classification questions directly
to the Decisions API; it does not run a School reply or tool. Validate the corpus
offline with `bun scripts/chatbot-jev-probe.mjs --validate`.

Live runs require the OpenRouter key plus these controls:

| Option | Behavior |
|---|---|
| `--max-requests` | Required integer 1–5000; cumulative cap across all supplied reports and new attempts, including failures |
| `--budget-usd` | Cumulative client spending stop; default 0.05, positive and at most 0.25 |
| `--request-reserve-usd` | Required positive estimate reserved before every attempt; no greater than the budget |
| `--acceptance-policy` | `full` by default; `core` declines `upcoming_exams` as well as `needs_llm` without changing the nine model choices |
| `--interval-ms` | Minimum spacing between attempt starts, 0–10000; excluded from each API duration |
| `--resume-report` | Repeat once per earlier raw report, in dispatch order; verifies the full attempt chain and frozen experiment before deriving the next case/repetition |
| `--retain-unknown-costs` | Explicit continuation with unresolved costs; earlier reservations remain deducted from the cumulative budget |
| `--preflight` | Offline allowance, schedule and continuation checks; no key, ledger read or paid dispatch |

Nonzero `--skip-requests` is rejected. Supply every earlier report with
`--resume-report` instead. The corpus, request body, wording, threshold, policy,
repetitions and classification/eligibility sources must match. Transport/pacing
changes are recorded separately. Reports must contain contiguous, settled
attempts whose raw costs match their budget snapshots. Cumulative allowances
cannot exceed the first report's allowance. A fresh experiment with changed
wording or corpus starts a separate report rather than resuming old results.

If the remaining budget cannot cover a reservation, the next call is not sent.
Missing/invalid cost or an unknown-cost failure retains its reservation and stops
dispatch. A 429 also stops when its cost is known; its status and `Retry-After`
are retained, with no automatic retry. Valid reported costs from failed decisions are still counted. Reports
also retain bounded `X-RateLimit-Limit/Remaining/Reset` headers and the documented
error metadata fields (`error_type`, `provider_code`, `limit_source`, `reason`)
when supplied, to distinguish the available provider/platform diagnostics.
They separate the known reported-cost sum, unknown attempts, reservation state and key
ledger reads; a sum of zero with unknown attempts does not imply free requests.
Stopped/error runs save their report and exit nonzero. A completed run needs an
allowance covering selected cases × repetitions. Reservations are estimates;
provider billing can exceed them. [Offline fix evidence](../evidence/chatbot-latency/jev-budget-fix-20261005.md).

Use a fresh `--output` path: an existing report refuses a new paid run. A standalone
corpus can omit `baseCorpus`. Fresh exploratory corpora are checked for old/duplicate
questions and explicitly cannot authorize production acceptance. The
[first two core legs](../evidence/chatbot-latency/jev-core-results-20261005.md) stopped
on two upstream 429s. Following a later user continuation, 251 further paced
attempts completed the original 312-attempt schedule without expanding its
cumulative allowance. The [final result](../evidence/chatbot-latency/jev-core-final-results-20261005.md)
still fails accuracy: a Darija teacher-name request was accepted as a count.

For the now-finished schedule, this command verifies all four raw reports
without making requests. It exits nonzero because the request schedule is
exhausted; adding acknowledgement does not create a new allowance:

```sh
bun scripts/chatbot-jev-probe.mjs --preflight \
  --cases=datasets/chatbot-latency/jev-core-exploration.json --split=test \
  --repetitions=3 --acceptance-policy=core --gate-threshold=0.8 \
  --budget-usd=0.02 --max-requests=312 --request-reserve-usd=0.002 \
  --interval-ms=2000 \
  --resume-report=docs/evidence/chatbot-latency/jev-core-exploration-20261005.json \
  --resume-report=docs/evidence/chatbot-latency/jev-core-continuation-20261005.json \
  --resume-report=docs/evidence/chatbot-latency/jev-core-health-20261005.json \
  --resume-report=docs/evidence/chatbot-latency/jev-core-finish-20261005.json \
  --retain-unknown-costs
```

The verified result is 312 earlier attempts, zero remaining and no next case.
Known reported cost is $0.012219438; the earlier $0.004 reservations remain
unresolved. Always supply every earlier report, including successful later
legs; a partial prefix is not permission to repeat already dispatched work.
Run summaries cover only that leg; `cumulativeAccounting` carries all earlier
attempt/cost totals. The [earlier preflight verification](../evidence/chatbot-latency/jev-resume-fix-20261005.md)
records the historical two-leg position; it is not the current restart point.
This verifies orderly stopped reports; it does not recover attempts from a
process killed before saving its report. Such attempts need separate accounting
before another live run.

For the next human/native held-out study, use the
[offline native intake workflow](jev-native-validation.md) and its empty
collection template. The probe accepts only a complete, hash-checked
`native-heldout` export under its frozen acceptance policy; intake/worksheet
files and unknown purposes refuse before provider calls. Native collection
and numerical classification results remain separate from production
acceptance. No native questions or paid allowance are provided by that workflow.

An [offline count/list guard study](../evidence/chatbot-latency/jev-count-guard-dev-20261006.md)
compares a development-only veto against saved core decisions. It makes no
provider or app call and records correct coverage losses beside prevented
errors. Run it with a fresh output path:

```sh
bun scripts/chatbot-jev-count-guard-study.mjs \
  --output=docs/evidence/chatbot-latency/count-guard-dev-<new>.json
```

This guard is not connected to the live probe or runtime. Its replay results
do not replace the failed core accuracy gate or independent/native acceptance.

### Benchmark measurement limits

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
- Concurrency 1/2/4 and an optional client estimate stop are supported; live
  levels 2/4 have separate evidence, with level 4 unaccepted. A verified hard
  provider cap matching each small run allowance remains unavailable.
  Existing uncontrolled serial runs do not establish the
  proposed acceptance targets or production SLA.
