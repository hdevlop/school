# Live concurrency 2/4 checks — 2026-10-05

**Actual observed key increases: $0.012707450 at concurrency 2 and $0.012680550
at concurrency 4; $0.025388000 total for 120 completed chatbot replies.**

Concurrency 2 passed its 60 automatic and assistant checks. Concurrency 4 remains
unaccepted: 59/60 language checks/reviews passed, and first-text p95 was 8.166 s,
above the unchanged 8 s gate. All requests completed and correlated; no 429s,
executed writes, incorrect fixture facts or incomplete embedding captures occurred.

The [plan](load24-plan-20261005.md) ran two separate 30-case/two-repeat admin
batches with GPT-OSS/Cerebras-first/low reasoning and guarded templates fixed.
Each new allowance was 60 outer requests/$0.25 in estimates/$0.01 reserved per
in-flight request; both are consumed. No paid role/failure/model experiment or
deployment followed the failing level-4 gate.

## Conditions and timing

Reused the immutable published-dependency [list-template snapshot](list60-manifest-20261005.json)
after matching current app source and private environment. A new task-owned dev
process used `.next-load24-live`; [facts](load24-facts-20261005.json),
[corpus](load24-corpus-20261005.json), [catalog](load24-endpoint-prices-20261005.json)
and [declared prices](load24-declared-prices-20261005.json) were refreshed.

Supported application caches were cleared once before each batch, with no chat
active. No resets happened during overlap. CLI mode remains `uncontrolled`, which
does not claim per-request fresh caches: each run observed **30 misses/30 hits**,
with 30 completed local embedding attempts. App instance/reset IDs stayed fixed
through each batch. Model residency was observed; provider cache/host was not controlled.

The first [level-2 setup](load2-setup-20261005.json) recorded a null `reset` field
because the response was unenveloped; the immediately following read-only
preflight captured valid instance/reset count 1. That capture and every diagnostic
agree; the original null is retained with an explanatory note. Level-4 setup
captures its reset directly. Do not pool these batches with fresh-cache serial
timings or with each other.

| Load/path | Replies | First-text p50/p95 | Completion p50/p95 |
|---|---:|---:|---:|
| 2, hybrid | 60 | 0.254 / 1.217 s | 0.255 / 1.270 s |
| 2, model | 12 | 0.914 / 2.648 s | 1.031 / 2.684 s |
| 2, template | 48 | 0.063 / 0.459 s | 0.063 / 0.459 s |
| 4, hybrid | 60 | 0.251 / 8.166 s | 0.251 / 8.243 s |
| 4, model | 12 | 6.161 / 10.388 s | 6.169 / 10.433 s |
| 4, template | 48 | 0.049 / 0.802 s | 0.050 / 0.802 s |

Client queue p50/p95 was 7.198/11.684 s at 2 and 11.092/13.323 s at 4. This is
waiting for a bounded worker in the closed batch, separate from request latency;
it is not measured provider queue time or a fixed arrival-rate capacity test.
The tiny samples do not establish production p95 or safe production concurrency.

## Failures and investigation

At level 4, `missing-student-fr`, repetition 2, said:
`Pouvez-vous me fournir son identifiant (« student ID »), son code ...`
The not-found fact is correct, but the English label violates the predeclared
French-only wording policy. Keep its raw automatic failure and assistant rejection;
this is a label/register issue, not an ownership leak or a wholly wrong-language reply.

Eight model replies took over four seconds. Their preparation was at most 681 ms,
and measured search reads were 4.4–6.5 ms. For the slow Arabic missing-student
reply in repetition 2, preparation was 29 ms, the read was 4.6 ms, and completion
was 10.433 s. The delay is predominantly **after School preparation**, in the
model/transport/stream portion. This does not identify a provider host, queue,
retry or causality from concurrency: those fields are not captured. Ledger cost
matches Cerebras catalog rates, which supports pricing consistency but does not
prove per-generation host routing.

A local French lookup hint now requests `identifiant de l’élève`/`code de l’élève`
and forbids the English label while preserving stored names/codes. The hint is
limited to French note/identifier requests so unrelated consumers/count prompts
remain unchanged. It was implemented **after the frozen live runs**, tested and
built locally; there is no paid post-fix evidence or latency fix claimed.

Next: obtain provider-generation IDs/host/retry timings or otherwise isolate the
slow portion, then predeclare a focused repeat for the wording and level-4 gates.
Do not loosen the target, silently cap requests at 2, infer production safety or
start paid expansion from these results.

## Cost and complete diagnostics

| Measure | Concurrency 2 | Concurrency 4 |
|---|---:|---:|
| Completed replies | 60 | 60 |
| Automatic/assistant accepted | 60 | 59 |
| Recorded generation steps | 18 | 18 |
| Raw SDK estimate | $0.001558268 | $0.001551652 |
| Declared estimate | $0.012974850 | $0.012941150 |
| Later observed key increase | **$0.012707450** | **$0.012680550** |

Declared estimates, including the failed reply's usage, remain below the
$0.25/1,000 correct-reply cost gate. That does not waive level 4's language/timing
failures. SDK estimates remain understated and preserved unchanged.

Both runs verified all 60 request/embedding IDs, no duplicate IDs, missing
diagnostics or incomplete spans. Each used 48 template/12 model replies and 48
guarded read executions, with empty initial history and no writes/promises.
The 24 second-repetition template texts in each run exactly match their reviewed
first-repetition texts. [Level-2 raw](load2-run-20261005.json),
[review](load2-analysis-20261005.json), [later ledger](load2-postflight-20261005.json),
[stable ledger](load2-settled-20261005.json); [level-4 raw](load4-run-20261005.json),
[review](load4-analysis-20261005.json), [later ledger](load4-postflight-20261005.json),
[stable ledger](load4-settled-20261005.json).

Ledger increases exactly match recorded input/output tokens at current Cerebras
catalog rates. Initial reads were stale/zero; later stable readings were used.
Selected-key equality was verified. Other account traffic, actual host/invoice
and local infrastructure cost remain unallocated. These are actual run-window
increases; per-1,000 figures are normalized projections, not daily bills.

## Role preparation and local verification

The old role runner's direct SQL picker was removed. Private fixtures now come
from `scripts/chatbot-role-fixtures.ps1` via internal MCP/REST, with live registry
read-only checks. Teacher membership uses the selected-year profile API rather
than legacy student class pointers; outsiders are checked against actual scoped
members. The private fixture is kept only in task temp storage; public evidence
has counts and a hash, no identities or phones.

[Preparation](role-preparation-20261005.json) captured a parent with three scoped
children, a teacher with four scoped pupils, a signed-in student identity and
outsiders. Offline validation passed for ten scenarios/twelve planned chats.
The role runner now requires this fixture file and explicit request allowance;
missing own-record failures retain only fixture indices. **Zero paid role chats**
were sent; login/ownership/language and monetary accounting for that future run
are not established by fixture preflight alone.

Local benchmark/chat/read-only/year-boundary tests: **350 passed**, zero failures,
1,059 assertions. The tests cover denial of historical chats before provider work
for ordinary roles and overlapping year-context isolation using controlled mocks,
not live-model role acceptance. Source/test typechecks, lint and isolated build
passed. Provider failure/fallback/cancellation/termination still need their own
controlled acceptance evidence; do not mistake earlier mocks for live outages.

[Post-run source check](load24-source-after-20261005.json) confirms the frozen app
matches its manifest. The worktree's subsequent French hint differs deliberately;
no current-source paid acceptance is implied.

[Cleanup](load24-cleanup-20261005.json) verified and stopped only the task-owned
app subtree; port 3102 has no listener. The frozen snapshot and private fixtures
remain in task temp storage. [Final verification](load24-verification-20261005.json)
records local checks, distinct live gates and zero paid role chats.
