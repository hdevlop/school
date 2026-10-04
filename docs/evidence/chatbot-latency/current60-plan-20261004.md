# Current-configuration 60-request acceptance run — 2026-10-04

User instruction: execute the next acceptance steps, then `continue` after the
concrete proposal of a **$0.50 estimated stop** with the existing key's $50 total
cap disclosed. Proceed with that estimated-only run and $0.01 reserved per outer
request. The user has accepted this exception to a benchmark-sized hard cap;
do not claim a hard $0.50 billing limit. Preparation sent zero paid chats.

## Prepared configuration

- Frozen School copy: `C:/Users/pc/AppData/Local/Temp/school-chatbot-acceptance-20261004-20b0fd6c`.
  Its own `bun install --frozen-lockfile` installed published dependencies.
  [Source manifest](current60-manifest-20261004.json), [launcher](current60-server-20261004.json).
- Isolated dev app: `http://localhost:3102`, started with `bun run dev` and
  `CHATBOT_BENCHMARK_CONTROLS=true` only in that process. No School app was
  listening on ports 3000–3200 before launch. Worktree edits cannot affect it.
- [Preflight](current60-preflight-20261004.json): health ready, database/cache OK,
  OpenRouter `openai/gpt-oss-120b`, enabled and saved key present. No model update.
- Source policy: Cerebras first, fallbacks enabled, Groq excluded, low reasoning
  effort; Moroccan latest-message language policy and guarded School templates.
  Source policy does not prove the provider host for each request.
- Ollama serves Qwen3 embeddings locally; `/api/ps` showed the model resident
  before preparation. No model unload or paid warmup is planned.
- [Cache status](current60-cache-status-20261004.json): query-embedding and
  knowledge-context controls enabled, instance `22393708-ef03-42d7-b37a-5a0f97e802d7`.
- [Fresh internal facts](current60-facts-20261004.json): 100 students,
  50 teachers, 9 classes, 12 exams. The facts reader used MCP `tools/list` and
  authorized read tools plus REST classes. No fixture record was created.
- [Frozen corpus](current60-corpus-20261004.json): 30 admin cases in `2026-2027`,
  Darija/Arabic/French. All case expectations are identical to the existing
  corpus; only refreshed capture metadata/hash changes. [Fixture check](current60-fixture-check-20261004.json).

## Execution contract

Maximum outer chat requests: **60** (30 cases twice), serial, fresh sessions,
warm embedding model and verified fresh application caches per request. No paid
warmups, probes, comparisons or additional retries. Model-internal calls may
exceed the number of outer requests. Count failures toward the limit.

Approved operating controls: **$0.50 estimated ceiling**, **$0.01 per-request
reservation**, **60 maximum outer requests**. No extra paid probes/warmups/retries.
Unknown cost or failed cache verification stops scheduling. The cooperative
machine-wide runner lock and per-request saved-model checks remain active.

The [existing environment key check](current60-key-precheck-20261004.json)
returned a $50 total key limit, $49.369976616 remaining and $0.630023384 usage.
This is not an isolated $0.50 benchmark cap, and equality with School's encrypted
selected key has not been verified. The user authorized proceeding with the
estimated stop after this limitation was disclosed. No key/settings mutation
is part of this run.

Capture provider usage immediately before/after any authorized run and retain
the key-attribution limitation. [Endpoint prices](current60-endpoint-prices-20261004.json)
show Cerebras $0.35 input/$0.75 output per million tokens; installed SDK rates
are $0.039/$0.19 and are not host-aware. The runner's pricing-file fallback does
not override known SDK prices. Its stop cannot establish actual billed spend.
Use the [official current-key API](https://openrouter.ai/docs/api/api-reference/api-keys/get-current-api-key)
for limit/usage reads; never persist credentials or authorization headers.

## Review and gates

Use section 6.4's unchanged gates. Retain reply text for factual/register review,
with tool arguments stripped by the runner. Do not publish private answers.
Record per-language and per-kind counts plus separate hybrid/model/template
latency/usage. Review all 60 replies, including refusals and successful empty
reads. Preserve raw failures; fixes or extra paid runs need a new recorded budget.

Two repetitions are regression evidence, not a production p95 or 1% error
guarantee. Provider prompt caching remains uncontrolled; no cold-model,
concurrency, broader role or browser acceptance is established by this run.
Current billed-cost acceptance requires valid attribution and reconciliation,
including failures/retries and embeddings, rather than the SDK estimate alone.

## Local verification completed

- Frozen checkout: 284 benchmark/chat/read-only tests passed, zero failures.
- Focused chat year/read-tools/MCP-year tests: 20 passed, zero failures.
- Frozen 30-case expectations match the refreshed internal facts.
- Read-only preflight and admin-only cache status passed.

The isolated app is left running for the authorized run. Its launcher record
identifies the task-owned process; do not stop unrelated app/embedding processes.

## Authorized command

Run from the frozen checkout, retaining the refreshed corpus and raw output in
School's evidence directory:

```powershell
bun --env-file=apps/dashboard/.env.local scripts/chatbot-benchmark.mjs --base-url=http://localhost:3102 --cases=C:/Users/pc/Desktop/school/docs/evidence/chatbot-latency/current60-corpus-20261004.json --repeat=2 --max-requests=60 --max-estimated-usd=0.50 --request-reserve-usd=0.01 --concurrency=1 --cache-mode=fresh --keep-text --output=C:/Users/pc/Desktop/school/docs/evidence/chatbot-latency/current60-run-20261004.json
```
