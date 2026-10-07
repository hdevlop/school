# Chatbot latency and cost plan

Status: **NAJM-CHATBOT 3.4.0 PUBLISHED AND INSTALLED. DEFAULT-OFF JEV ADAPTER IMPLEMENTED; FIXTURE READ ACCESS REPAIRED. 8/8 SCOPED MCP READS, SIX UNPAID TEMPLATE REPLIES AND 1,882 ROOT TEST EXECUTIONS PASS. TEMPLATE COMPLETION MEAN 117.17 MS: CACHE MISS 201.03 / HIT 33.31 MS. NO NEW PAID CALLS. EARLIER PAID RUN STOPPED ON CANCELLED UNKNOWN BILLING; NO LIVE JEV WIN OR BENEFIT ESTABLISHED. REAL-QUESTION/PRODUCTION JEV REMAINS OFF; CEREBRAS DEFAULT RETAINED.**

## 0. Current status and next work — 2026-10-07

**2026-10-07 unpaid fixture follow-up:** the failed read prerequisite is repaired through a fixed, admin-only, marker-bound fixture helper using Najm's permission service. [Repair, successful replies and next work](docs/evidence/chatbot-latency/jev-fixture-read-repair-20261007.md): 8/8 scoped MCP reads and six actual template replies in French/Arabic/Darija pass. Latest local completion mean is 117.17 ms (201.03 ms for three cache misses, 33.31 ms for three hits), with zero classifier/model requests; these are existing-template timings, not Jev speed. 1,882 root test executions, route-security/refresh checks, lint/typecheck and production build pass. The owner's daily charts are recorded as rounded totals, not an individual cancellation receipt. The fixture read gate is complete; cancelled billing and a fresh successful paid comparison remain open. Production and real-question Jev remain off.

**2026-10-07 School adapter update:** the published async hook now has a default-off School classifier, shared strict protocol/guard5, server-issued synthetic first-turn eligibility, separate attempt/cost ledger and existing scoped MCP execution. [Implementation, benchmark, cost and next actions](docs/evidence/chatbot-latency/jev-school-adapter-results-20261007.md): 72/72 mock HTTP chats pass; 1,881 root test executions, lint/typecheck/i18n and production build pass. The bounded live stage stopped after two model replies averaging 4.721 seconds, both denied student-count access. Cached ordinary preparation won at 21.62 ms, cancelling Jev and retaining unknown billing. The later shared-key increase was $0.002352550 against $0.000447080 SDK generation estimates; it is not an isolated invoice or proof that cancellation is free. Mode is off, the fixture key is removed and its isolated app stopped. Next prerequisites are unpaid scoped-read acceptance and cancelled-attempt billing, followed by a fresh bounded comparison. No real-question rollout, native-authorship requirement or automatic reuse of the stopped allowance is introduced.

**2026-10-07 publication update:** the owner authorized publication and both repository pushes. `najm-chatbot@3.4.0` is published; its downloaded registry tarball matches the tested candidate SHA-256 and integrity exactly. Najm source commit `1d79369` is pushed to `origin/master`, and the Desktop checkout is fast-forwarded and clean. School's root/server/dashboard pins now agree on 3.4.0 with the root override and Bun lockfile. [Publication and adoption evidence](docs/evidence/chatbot-latency/najm-chatbot-3.4.0-published-20261007.md) records checks and the separate pending demo-budget test failure. Jev is still off; package availability does not prove runtime classification, timing savings or qualification.

**Earlier 2026-10-07 framework preparation:** the missing async readiness hook is now implemented in an isolated writable upstream clone. The [3.4.0 release candidate](docs/evidence/chatbot-latency/jev-async-release-candidate-20261007.md) has 274 passing tests, passing builds/API checks and a source-attributable tarball. Real MCP guards and parallel user/year scope are verified. The Desktop reference is untouched, School remains on 3.3.0, and no additional paid classification requests were sent. B1 now awaits the explicitly required real-publication approval; B2 integration, paired full-chat timing/cost and acceptance remain open. Historical status below describes its own dated stages.

This section and sections 1–11 describe the current plan. The dated entries
below are experiment history; their package versions, pending work and provider
prices describe that run, not the current installation. Source/configuration
review does not establish the effective settings of a running deployment.

**Owner-selected Jev review update:** native-authored collection and independent
native label review are waived for the current workflow. The assistant drafts
questions/provisional labels; the owner checks whether the wording matches their
Darija. Use the [100-question draft](docs/tests/jev-operator-darija-review.md) and
[active protocol](docs/tests/jev-native-validation.md#active-owner-selected-workflow).
Record actual feedback once for the batch, with corrections by question number;
no manual provenance/reviewer forms are required. This replaces native-collection
blockers in the earlier plan for this path. Assistant authorship remains explicit,
historical failures remain failed, and classification/write/latency, framework
publication and end-to-end gates still precede runtime enablement. Jev remains off
while those checks are unrun.

The owner completed the expanded wording review and then authorized the
[100-request/$0.02 classification plan](docs/evidence/chatbot-latency/jev-operator-review100-plan-20261007.json).
The [100-case frozen batch](datasets/chatbot-latency/jev-operator-review100-frozen-20261007.json)
has 50 paired families and 18 write cases; assistant labels remain provisional.
[Results](docs/evidence/chatbot-latency/jev-operator-review100-results-20261007.md):
100 unique attempts, 96 valid responses, four retained transport failures, no
retries. Eligible accepted choices are 38 / 31 paired families with zero frozen
label disagreements or writes accepted as reads. Successful classifier mean/p95
is 433.6/663.1 ms; maximum 5.335 s. One of 17 valid writes misses the binary write
score, but is not accepted as a read. Known costs total $0.003770844, matching the
later shared-key increase in aggregate; four unknown attempts retain $0.0006.
All 100 slots are consumed. Classification remains failed on run errors, sample
size and p95; no runtime enablement, package upgrade or new paid stage follows.
The last 18 attempts use an explicitly logged transport mode disabling connection
reuse after socket failures; earlier DNS/socket errors and a later timeout stay
recorded. No pooled causal latency improvement is claimed.

The subsequent “fix all bench and report” work implements the nine missing
language variants and shared deterministic write refusals: on the reviewed corpus,
language skips become 0 and all 18 writes receive a refusal without a tool plan.
An optional semantic query veto v3 blocks computed sums, filters and subject
substitutions independently of the binary write score. It remains a benchmark
candidate, not a runtime Jev integration. The offline replay reparses 598 preserved
valid decisions and blocks the old core teacher-name/count error without losing a
correct core shortcut. A separate 100-request/$0.02 same-corpus regression stage
has 99 valid responses and one socket failure, no retries. Successful classifier
mean/p95 is 511.4/729.7 ms, so API latency is not fixed. The current projection is
18 synchronous refusals plus 33 eligible guarded Jev choices, with no frozen-label
disagreement; readiness wins and full-reply savings were not measured. Known new
costs are $0.003887352 plus a $0.00015 unknown-cost reserve, and all new request
slots are consumed. [Fixes, benchmark and next actions](docs/evidence/chatbot-latency/jev-fixes-report-20261007.md)
retains the distinction between implemented source fixes, post-result replays,
same-corpus measurements and the still-required fresh accuracy/integration work.

The [public metadata transport check and next batch](docs/evidence/chatbot-latency/jev-transport-and-next-batch-20261007.md)
completed 36 unpaid GETs with no observed failures: means 122.0 ms Bun default,
130.4 ms reuse-disabled and 169.5 ms curl. These do not measure Jev computation
or replace the 511.4/729.7 ms classifier mean/p95. A new 304-case multilingual
stress corpus is authored, duplicate-checked and audited; its wording review
is pending. Its 61 semantic groups cannot satisfy the 150-family qualification
gate. A concrete one-pass 304-request/$0.05 proposal is prepared but not authorized
or run; no additional paid classification allowance or runtime change is implied.

The [offline guard fault check and readiness replay](docs/evidence/chatbot-latency/jev-offline-safety-and-readiness-20261007.md)
tests 1,290 injected wrong-read choices. Guard v3 leaves 227 unblocked; a new
offline v4 candidate blocks all of them and retains the latest 33 guarded recheck
choices, but loses substantial older-corpus coverage and is not adopted. Fourteen
virtual readiness scenarios add zero fallback waiting; Jev wins no races against
assumed routing at 250 ms, 16 at 500 ms and 33 at 800 ms. These are not live chat
timings or model errors. The installed 3.3.0 hook remains synchronous and invokes
templates after routing/context; a [package implementation contract](docs/architecture/jev-async-reply-contract.md)
is authored, not installed. No additional paid calls or runtime changes occurred.

The subsequent [guard4 coverage repair](docs/evidence/chatbot-latency/jev-guard4-coverage-results-20261007.md)
resolves those prototype declines on all four saved studies: v4 retains all
284 v3-accepted attempts (33/145/53/53), with zero additional correct declines
or accepted label disagreements. All 6,604 injected wrong-read checks across
the 304/960/104 corpora are blocked. These are tuned development/fault results,
not new provider accuracy or independent samples. The probe now supports guard4
and freezes its dependency sources for continuation; pending wording still
blocks dispatch. An updated single 304-request/$0.05 proposal selects guard4
and supersedes the unrun guard3 proposal, without granting a new allowance.
No API calls or runtime/package changes occurred; published async/full-chat and
fresh qualification work remain open.

The owner's subsequent “continue” authorized the concrete 304-request/$0.05
development pass. An explicit unreviewed assistant-development mode keeps
wording review pending and qualification false. [Live results](docs/evidence/chatbot-latency/jev-stress304-guard4-results-20261007.md):
304 valid responses, zero transport errors/retries, classifier mean/p95
436.8/602.5 ms, maximum 1.908 s; known cost $0.011942532 with no unknown reserve
and a matching later shared-key increase in aggregate. Guard4 accepts 88
eligible choices / 30 linked groups with zero accepted label disagreements,
including 45 read/small-talk and 43 refusals. Guard3 accepts 107 with zero
disagreements, so v4 adds 19 correct declines on this newer corpus. Two raw
accepted arithmetic mistakes are blocked by both. Seventeen language abstentions
remain. All 304 slots are consumed. No full-chat latency/savings, rollout
acceptance or native review is claimed; Jev remains off and async/qualification
work remains open.

The [offline guard5 follow-up](docs/evidence/chatbot-latency/jev-guard5-coverage-results-20261007.md)
restores all 19 extra v4 declines on saved development304 decisions: projected
acceptance rises 88 to 107, with zero accepted label disagreements and no older
accepted choice lost. All 6,604 injected wrong-read checks remain blocked.
Guard3/v4 and the measured run are unchanged; guard5 is a separate post-result
candidate, not a paid-probe mode or runtime callback. No new classifier calls,
price/latency measurements, package changes or native/wording approval occurred.
The 17 language abstentions and shared conservative guard3 declines remain.

| Work | Current state | Evidence or remaining action |
|---|---|---|
| Published packages | Adopted | Current root pins: `najm-chatbot` 3.3.0, `najm-rag` 3.2.0, `najm-mcp` 2.2.5, `najm-api` 5.0.0; RAG/chatbot Desktop reference versions match; earlier releases below are dated history |
| Provider routing and reasoning | Configured; earlier serial run measured | OpenRouter `openai/gpt-oss-120b`, Cerebras first, fallbacks allowed, Groq excluded, reasoning effort low; [routing report](docs/evidence/chatbot-latency/step3-cerebras-low-20261004.md); actual host and fallback acceptance remain |
| Provider price/performance comparison | Strict Cerebras/Crusoe ABBA test complete; default unchanged | Sixty serial/fresh replies each, all checks/review pass. Crusoe nominal token estimate 84.10% lower, model completion mean 3.306 versus 1.318 s; model p95 9.269 versus 3.142 s. Both hybrid gates pass, no production/default change or captured per-generation host invoices. [Results](docs/evidence/chatbot-latency/provider-compare-results-20261005.md) |
| MCP tool-name compatibility and index cleanup | Implemented; published RAG adopted | Prefix collisions removed; year inputs accept unused nulls; RAG 3.2.0 removes retired tool embeddings; [rename report](docs/evidence/chatbot-latency/cerebras-tool-prefix-20261004.md), [cleanup report](docs/evidence/chatbot-latency/step3-cerebras-low-20261004.md) |
| Latest-message language policy and School templates | Guarded list expansion implemented and live verified | Najm remains the single executor. School supplies counts/refusals plus narrow class, next-five exam and today's student-attendance renderers; latest 60 replies split 48 templates/12 model. [Latest report](docs/evidence/chatbot-latency/list60-results-20261005.md); qualified/quoted/unrecognized requests retain the model path |
| Streaming runner and School diagnostics | Implemented; stream arrival milestones live captured | Bounded payload-free event times distinguish tool/result/final-text arrivals, alongside admin-only diagnostics. All 66 new requests correlated, no timeline truncation. Provider IDs/host/queue/retry attribution unavailable; [recheck](docs/evidence/chatbot-latency/stream-recheck-results-20261005.md) |
| Embedding diagnostics | Published and adopted; serial and concurrent correlation verified | All 120 load requests have complete correlated diagnostics, no duplicate IDs or missing spans; [load review](docs/evidence/chatbot-latency/load24-results-20261005.md); durable multi-instance collection remains |
| Concurrent benchmark runner | Separate initial levels 2/4 and post-hint level 4 completed | Initial level 4's label/8.166 s failures retained. New level 4: p95 1.854/1.879 s, raw 59/60 (scorer false positive), assistant review 60/60. Each full load has 30 cache misses/30 hits; no timing-fix/host/capacity claim. [Latest results](docs/evidence/chatbot-latency/stream-recheck-results-20261005.md) |
| Preflight and estimated-spend stop | Verified during authorized 60-request run | Frozen published-dependency app at port 3102: health, saved GPT-OSS and cache controls verified before/after; [run report](docs/evidence/chatbot-latency/current60-results-20261004.md). User accepted $0.50 estimated stop/$0.01 reserve with existing $50 total key cap disclosed. SDK prices are not host-aware; no hard $0.50 cap claimed |
| Cost accounting and selected-key ledger | Implemented, locally and live verified | Explicit declared-rate mode preserves SDK metadata but uses dated catalog rates for the stop; dev/admin-only ledger route verifies the saved key equals the environment key. [Accounting](docs/evidence/chatbot-latency/cost-accounting-20261005.md); current full run settled $0.052940950 against its new $0.50 estimate stop; no hard cap or per-generation invoice attribution claimed |
| Application-cache controls | Implemented; 100/100 live samples verified | Opt-in dev/admin resets, matching instance/reset IDs and completed routing embedding misses/attempts; [cache review](docs/evidence/chatbot-latency/cache-controls-20261004.md); cold-model and provider-cache conditions remain uncontrolled |
| Read-only chat and argument schemas | Fixed; local checks pass | Confirmation-marked writes blocked; AI SDK `inputSchema`; [schema review](docs/evidence/chatbot-latency/tool-schemas-20261003.md) |
| Successful empty reads | Guarded attendance renderer implemented; full corpus passed | Six template replies accurately report verified empty arrays and selected year. Populated/status/truncation/missing-relation/malformed cases have local coverage; [latest report](docs/evidence/chatbot-latency/list60-results-20261005.md). Live populated/held-out/error acceptance remains |
| Attendance refusal and concise exam replies | Pre-fix repeat verified; empty-read defect rechecked | Twelve template write refusals and six next-five exam replies passed. The retained Arabic empty-read failure has a prompt/scoring fix and [6/6 focused live recheck](docs/evidence/chatbot-latency/empty-read-results-20261005.md); held-out/populated/error coverage remains |
| Scoring, facts and Darija register | Full post-fix automatic and assistant review 60/60 | Fresh per-row class/exam facts, arguments, register, write-policy and empty-read checks pass. [Full review](docs/evidence/chatbot-latency/postfix60-results-20261005.md) retains two minor Darija editorial caveats; independent human/native fluency and held-out coverage remain. Pre-fix 59/60 review remains unchanged |
| Reusable Darija rewriting | Published and adopted | `najm-rag@2.3.0` exports an opt-in factory; School retains domain vocabulary and literal rules; [migration review](docs/evidence/chatbot-latency/darija-shared-20261004.md), 109/109 output parity |
| Multilingual answers and routing | French hint and corrected scorer live verified on current corpus | New pinned comparison passes 120/120 automatic/review on Darija/Arabic/French with corrected nombre and explicit English identifier-label checks. Earlier raw failures/audit unchanged. Literal apostrophe escape and Darija editorial caveats retained; native/held-out and current English/Spanish remain. [Results](docs/evidence/chatbot-latency/provider-compare-results-20261005.md) |
| Parent, teacher, student and follow-ups | Original full smoke reviewed 9/10; focused corrective recheck reviewed 6/6 | [Original twelve-turn run](docs/evidence/chatbot-latency/role-live-results-20261006.md) retains the Darija absence claim and denied finance-profile call. [Focused six-turn recheck](docs/evidence/chatbot-latency/role-recheck-results-20261006.md): two questions ×3, no unsupported attendance claims or finance calls; original scorer 5/6 from a confirmed false positive, corrected offline scorer 6/6. Mean/p95 2.132/7.838 s, 6/6 correlated captures, 2 cache misses/4 hits. Declared estimate $0.007348900, later shared-key increase $0.007972200; broader role/year and native acceptance remain |
| Embedding availability and failure handling | Local fixes and outage checks complete | Queries 5 s, indexing 60 s, failure cooldown 30 s, router-error fallback `none`, Ollama residency; hanging requests and populated knowledge need controlled acceptance |
| Tool cap and context | Evaluated locally | Keep cap 12 / semantic hits 8; shorter prompt passes 50/50 and cuts input tokens 21%; one-run evidence |
| Faster model | Nemotron full-corpus comparison rejected | Final prompt, same 50 questions/checks per model: GPT-OSS 47/50, Nemotron 45/50; completion p50/p95 6.367/18.802 vs 2.105/5.000 s. Nemotron wrong/mixed language and invented exam count; estimated cost gate failed. [Results](docs/evidence/chatbot-latency/reply-fixes-results-20261004.md) |
| Jev intent routing | B0 and later core exploration failed; off everywhere; B1 not started | Original [B0](docs/evidence/chatbot-latency/jev-b0-20261005.md) has an accepted exam-count error. [Final core exploration](docs/evidence/chatbot-latency/jev-core-final-results-20261005.md): 312 scheduled attempts, 310 valid, one accepted teacher-name/list request became a count at 0.80. Only 50 eligible accepted questions / 16 families; zero native review. Warm classification mean/p95 320/422 ms; known cost $0.012219438 plus $0.004 retained unknown reservations. Later 251 paced attempts succeeded; earlier failures stay recorded. Owner now selects assistant drafts plus operator Darija review; fresh classification acceptance and a supported published async hook remain before B1 integration. |
| Repeated-call termination | Published and adopted; package tests | Chatbot 3.2.0 introduced termination after two identical tool-call steps; no live trigger in the routing run; verify termination and legitimate multi-step work separately |
| Acceptance baseline | Serial/level 2 pass; new level-4 timing and review pass, original scorer gate retained | New 60: completion 0.329/1.879 s, model 1.240/2.384 s, templates 0.130/0.817 s p50/p95; raw automatic 59/60, assistant 60/60, confirmed scorer false positive corrected after run. Original load failure retained; broader/prospective-scoring conditions remain. [Latest report](docs/evidence/chatbot-latency/stream-recheck-results-20261005.md) |
| Current cost gate | Estimated API gate passes on the frozen corpus; observed window is consistent | Actual observed key increase $0.012718700 for 60 replies, declared estimate $0.012989100. Normalized projections: $0.212 observed/$0.216 declared per 1,000 correct replies against $0.25. Key verified; host/invoice, other traffic, infrastructure and production mix remain unallocated. [Report](docs/evidence/chatbot-latency/list60-results-20261005.md), [price units](docs/evidence/chatbot-latency/price-units-20261005.md) |
| Latest recheck accounting | Separate actual windows and declared estimates retained | Focused six: $0.000874260 observed/$0.008311850 declared; full level 4: $0.012767300 observed/$0.013036100 declared. Combined actual $0.013641560; full estimate $0.221/1,000 using 59 raw passes, within $0.25. SDK is not host-aware; no fixed multiplier/pooled cost or daily-bill claim. [Report](docs/evidence/chatbot-latency/stream-recheck-results-20261005.md) |
| Pinned comparison accounting | Nominal host rates differ; shared-key window reconciled in aggregate | Cerebras/Crusoe estimates $0.012706550/$0.002020800 per sixty, $0.212/$0.034 normalized per 1,000 accepted replies. A1 overlapped a separate Jev probe; aggregate key movement agrees with both recorded costs, not isolated host invoices. [Accounting](docs/evidence/chatbot-latency/provider-compare-results-20261005.md) |
| Production and browser measurements | Unrun | Deployment revision, runtime connectivity/schema, production API and submit-to-render evidence |

Remaining work, in order:

The latest [guarded-list 60-request repeat](docs/evidence/chatbot-latency/list60-results-20261005.md)
passed 60/60 automatic and assistant reviews, fresh caches and correlation.
Actual observed selected-key increase is **$0.012718700 for this 60-reply run**;
declared estimate is $0.012989100. Normalized projections are about $0.212/$0.216
per 1,000 correct replies, within the unchanged $0.25 estimated API-cost gate.
Forty-eight replies used templates and twelve used GPT-OSS, with 18 generation
steps; completion p50/p95 is 0.250/0.952 s. These figures are not daily bills or
flat provider-request prices; the user's older $0.06/66 view matches the earlier
runs ([unit reconciliation](docs/evidence/chatbot-latency/price-units-20261005.md)).
Overall acceptance remains open for broader conditions, native fluency and
production/invoice attribution. Historical failures remain recorded; no faster
model or interleaved model improvement is claimed.

The subsequent [separate concurrency-2/4 batches](docs/evidence/chatbot-latency/load24-results-20261005.md)
completed 60 replies each, all correlated, with actual observed key increases
of $0.012707450 and $0.012680550 ($0.025388000 combined spend). Level 2 passed
60/60; level 4 failed one French label check and first-text p95 (8.166 s > 8 s).
School reads took milliseconds; host/queue/retry attribution is unavailable.
Each batch cleared caches once before overlap and then observed 30 misses/30
hits. These are separate conditions, not pooled serial percentiles. Both new
60-request/$0.25 estimated allowances are consumed; paid expansion is held.

The [subsequent bounded recheck](docs/evidence/chatbot-latency/stream-recheck-results-20261005.md)
used its own six-chat/$0.10 focused allowance, then 60-chat/$0.25 level-4
allowance. All French lookup replies passed. New hybrid first-text/completion
p95 is 1.854/1.879 s, but raw scoring remains 59/60 from a confirmed `nombre`
false positive; assistant review is 60/60. The scorer correction is local and
separately audited, with no raw rewrite or extra paid run. Actual observed key
increases total $0.013641560. All 66 captures correlate; task app stopped,
temporary auth headers removed. Timing variation and the focused serial delay
do not establish a provider cause or latency fix. Both allowances are consumed.

The [strict provider comparison](docs/evidence/chatbot-latency/provider-compare-results-20261005.md)
then tested Cerebras/Crusoe on separate frozen apps in four serial/fresh ABBA
blocks, 30 questions each. All 120 checks/reviews/correlation/cache conditions
pass; the corrected scorer is now live exercised without rewriting older results.
Cerebras model completion mean/p95 is 1.318/3.142 s; Crusoe 3.306/9.269 s.
Declared estimates for sixty replies each are $0.012706550/$0.002020800. Crusoe
passes the predeclared hybrid/value gates but is slower; retain Cerebras for
responsiveness and keep the candidate's latency tradeoff explicit. Catalog table
latency is not end-to-end School time. The shared-key window overlaps the separate
Jev probe and reconciles in aggregate; isolated host invoices remain absent.
All 120 slots/$0.50 client-estimate allowances are consumed; no CoreWeave test,
new paid stage or default/deployment change is included.

1. **Role and measurement readiness:** corrected scorer has new 120/120 live
   comparison evidence; earlier failures/audit are retained. Shared source's 354
   tests/lint and prior application types/build remain valid; both temporary
   provider-route objects passed independent install/source/test typechecks.
   Role-run monetary stops and correlated diagnostics are now live exercised in
   twelve serial chats; one Darija answer fails assistant review despite 10/10
   automatic checks. Failed-lookup/empty-attendance guidance and terminal
   tool-error scoring are corrected. A separate six-turn recheck passes assistant
   review on both known questions; a new scorer false positive was corrected
   offline with its original 5/6 result preserved. Broader roles/year conditions
   remain. Supported provider-generation ID/
   host/retry diagnostics and isolated invoice attribution remain missing.
   Crusoe's lower declared cost trades off slower model replies; CoreWeave and
   DeepInfra are untested next candidates, each needing its own allowance.
   Keep production Cerebras/fallback policy, targets and raw history unchanged;
   cold-model, held-out/populated and fallback acceptance remain.
2. **Correctness:** extend role/year denials, ambiguity, topic switches, follow-ups,
   qualified count requests, held-out paraphrases and synthetic populated knowledge.
   Recheck English/Spanish using the legacy corpus on the current configuration.
   Review all replies for facts and language/register, including the documented
   wording caveats; do not treat heuristic passes as native-speaker fluency.
   Role fixtures now prepare via internal MCP/REST with zero paid role chats;
   runner monetary stops and correlated diagnostics now have twelve-turn live
   smoke coverage; the automatic 10/10 versus reviewed 9/10 failure is retained.
   A corrective, separately budgeted repeat and broader year denials remain.
3. **Failure paths:** exercise Cerebras unavailability/fallback, hanging embedding
   requests, provider errors, client cancellation and repeated identical calls in
   isolation. Preserve legitimate multi-step work and verify terminal diagnostics.
4. **Cost reconciliation:** reconcile the current hybrid workload with isolated provider billing,
   current host prices, cached/reasoning usage, retries/failures and embedding costs.
   The latest run's actual observed increase is $0.012718700 for 60 accepted replies;
   its normalized $0.212/1,000 projection and declared $0.216 estimate are below
   $0.25 on this corpus. Selected-key equality is verified, but per-request host/cache charges
   and other traffic remain unallocated. SDK metadata is not a billed pass. Declare each run's request/monetary
   budget and verified provider limit before execution; do not relax gates after a run.
5. **Rollout:** record production revision, effective embedding connectivity,
   pgvector schema/indexes and a redacted diagnostics collector across app instances;
   then measure production API and dashboard submit-to-first-render separately.
   Keep interaction-table logging optional until retention/access rules exist.
   Keep GPT-OSS configured and Nemotron rejected. Jev stays off until section 9 B4 passes.

The earlier status refresh changed documentation only. Its local verification is in
[status-refresh checks](docs/evidence/chatbot-latency/status-refresh-20261004.md).
That refresh's default-target preflight failed to reach the health endpoint.
Subsequent acceptance preparation found no app on ports 3000–3200, launched a
frozen isolated app at 3102 and completed the authorized 60-request repeat; the
earlier failure remains recorded. No new model, deployment or database migration
was performed. Further paid runs require their own recorded budgets.

## Experiment history

2026-10-05, pinned provider value comparison
([results](docs/evidence/chatbot-latency/provider-compare-results-20261005.md)):
Cerebras A1/Crusoe B1/B2/Cerebras A2, thirty serial/fresh chats per block,
strict only-provider/no-fallback/require-parameters temporary apps. All 120
automatic checks/assistant reviews/cache/correlation pass; corrected scorer live
verified, earlier failures retained. Each provider: 48 templates/12 model replies,
18 steps. Model mean/p95 completion Cerebras 1.318/3.142 s versus Crusoe
3.306/9.269 s. Declared sixty-reply estimates $0.012706550/$0.002020800, Crusoe
84.10% lower but 2.51 times slower model mean; hybrid/value gates pass on corpus.
A1's shared-key ledger overlaps the separate Jev probe; aggregate costs reconcile,
not isolated host invoices. Shared 354 tests/lint valid; both frozen installs/
source/test types pass. All allowances consumed; task apps stopped/auth headers
removed/snapshots retained. Root routing unchanged; no extra paid stage/deployment.

2026-10-05, French identifier and instrumented level-4 repeat
([results](docs/evidence/chatbot-latency/stream-recheck-results-20261005.md)):
six original French lookup repeats pass, with fresh caches and accurate empty
reads; then 60 level-4 replies, 48 templates/12 model/18 generation steps.
Hybrid first-text/completion p95 1.854/1.879 s passes. Raw automatic 59/60
retained, assistant 60/60: shared French/Spanish nombre produced a false positive.
Prospective scorer fix and separate offline language audit preserve the previous
genuine English-label failure. All 66 captures correlate; no writes, fixture
fact/argument errors or 429s. Observed key increases $0.000874260/$0.012767300,
combined $0.013641560; SDK/declared prices differ and hosts remain unallocated.
Arrival milestones show waits before tools and after results, not provider queue.
354 tests/lint pass; application code's prior types/build still valid. Task app
stopped, auth-header temp file removed. New allowances consumed; no paid expansion.

2026-10-05, separate concurrency-2/4 checks and local follow-up
([results](docs/evidence/chatbot-latency/load24-results-20261005.md)):
60 replies each, 48 templates/12 model and 18 generation steps per batch,
120/120 complete correlated traces, no 429s, writes or fixture-fact errors.
Level 2: 60/60 review, first-text/completion p95 1.217/1.270 s. Level 4:
59/60 review (French English-label failure), first-text/completion p95
8.166/8.243 s; first-text gate fails. Actual key increases $0.012707450/
$0.012680550, combined $0.025388000. No pooled latency or host attribution.
French lookup hint fixed after the frozen live runs, not paid rechecked.
Role SQL picker replaced with private internal MCP/REST fixtures and offline
preflight, zero paid role chats. 350 tests/typechecks/lint/build pass; task app
stopped, snapshot retained. Both allowances consumed; no paid expansion/deployment.

2026-10-05, guarded list templates and full repeat
([results](docs/evidence/chatbot-latency/list60-results-20261005.md)):
narrow class-list/next-five exam/today student-attendance templates implemented
through Najm's existing single guarded executor; populated attendance rendering
and strict unsupported/qualified/quoted model fallbacks covered locally. Darija
sections-to-classes routing dependency added; tool cap/guards/pins unchanged.
332 tests, typechecks, lint/i18n/build and frozen install passed; nine routing
previews pass. Sixty replies: 60/60 automatic and assistant review, 48 templates/
12 model, 18 generation steps, 60 fresh caches/correlation. Actual observed key
increase $0.012718700; declared estimate $0.012989100, normalized $0.212/$0.216 per
1,000 correct replies. Estimated API-cost gate passes on this corpus; completion
p50/p95 0.250/0.952 s. Broader conditions remain; no extra paid stage/deployment.
User screenshot $0.06/66 matches prior recorded windows, not a flat token price.

2026-10-05, cost accounting and full post-fix serial repeat
([accounting](docs/evidence/chatbot-latency/cost-accounting-20261005.md),
[results](docs/evidence/chatbot-latency/postfix60-results-20261005.md)):
declared-rate budgeting and dev/admin selected-key ledger capture implemented;
306 tests, typechecks, lint/build and frozen install passed. Thirty Moroccan
cases twice: 60/60 automatic and assistant reviews, all attendance empty replies
correct, 60 fresh caches/correlation, 30 template/30 model replies. Completion
p50/p95 0.566/1.235 s; SDK $0.006241680, declared $0.052940950. Immediate ledger
delta was stale/zero; delayed stable increase $0.052126750 matches Cerebras catalog
token pricing, about $0.869/1,000 accepted replies. Key equality verified; invoice
hosts/other traffic/infrastructure unallocated. Cost gate failed; no conditional
paid load/model expansion or rollout. Sixty-request allowance consumed; task app
stopped. Guarded template expansion is a prioritized, unimplemented next candidate.

2026-10-05, focused live successful-empty attendance recheck
([results](docs/evidence/chatbot-latency/empty-read-results-20261005.md)):
three original Moroccan attendance cases twice, new sessions, serial warm
embeddings/fresh application caches; 6/6 automatic and assistant reviews,
six successful empty arrays and complete correlation. All replies accurately
reported no records, with no settings/outage advice or attendance-status
inference. Completion range 0.860–1.718 s; SDK estimate $0.000963154 versus
observed key delta $0.008235850, exactly matching current Cerebras catalog
token pricing but not proving key/host attribution. New $0.10 estimated
stop/$0.01 reservation, six chats consumed; no extra paid calls or deployment.
This narrow check does not replace the full post-fix repeat or change the cost gate.

2026-10-05, successful-empty attendance guidance and scoring
([local verification](docs/evidence/chatbot-latency/empty-read-fix-20261005.md)):
system/request prompts now separate successful empty reads from failures, with
localized examples. Benchmark captures only array shape/count and checks explicit
empty wording plus unavailable/settings/retry claims; missing shape/execution
evidence requires review. Moroccan corpus v4, legacy v3 and scoring-source hashes
record the stronger policy. The exact retained Arabic failure is rejected by the
stream/scorer regression. No paid recheck, new model, deployment or gate change;
historical 60/60 automatic and 59/60 assistant-review results are unchanged.

2026-10-04, current-configuration repeat
([results](docs/evidence/chatbot-latency/current60-results-20261004.md)):
30 Moroccan admin cases twice, serial warm embeddings/fresh application caches,
60/60 completed and automatic passes; assistant review 59/60. One Arabic
attendance reply gave unavailable/settings advice after a successful empty read.
Hybrid completion 0.622/1.180 s p50/p95; model 0.945/1.412 s, templates
0.330/0.662 s. SDK estimate $0.006040756; environment-key usage delta
$0.0333943, stable on later read, with selected-key/host attribution limitations.
Timing sample passes; correctness/cost acceptance remains open. No additional
paid role/concurrency/failure run, model switch or deployment.

2026-10-04, shared Moroccan reply policy
([results](docs/evidence/chatbot-latency/najm-reply-results-20261004.md)):
published `najm-chatbot@3.3.0`, original 30-case corpus, 30/30 completed and
reviewed, no rescoring or model switch. Completion p50/p95: hybrid 0.523/1.345 s,
model subset 0.951/1.584 s, templates 0.305/0.523 s. Fifteen templates used no
generation tokens but still routed and, for counts, executed guarded reads.
Model-token estimate $0.003020093; serial fresh-cache development run, billing,
broader roles and production acceptance unproven.

2026-10-04, Cerebras-first routing and low reasoning
([results](docs/evidence/chatbot-latency/step3-cerebras-low-20261004.md)):
chatbot/RAG 3.2.0 adopted provider preferences, repeated-call termination and
retired-tool index cleanup. Thirty Moroccan cases: 28/30 automatic passes,
completion 0.81/1.26 s p50/p95; two unreviewed Darija register flags. Account
usage delta about $0.0309 ($1.03/1,000 answers); actual host per request and
fallback behavior unverified. Sequential comparison, uncontrolled caches.
The earlier [prefix probe and rename](docs/evidence/chatbot-latency/cerebras-tool-prefix-20261004.md)
removed the teacher-count tool-name truncation; language/register failures
remained in its 30-case comparison. These findings do not erase the earlier Nitro failures.

2026-10-04, attendance/exam fixes and full model comparison
([results](docs/evidence/chatbot-latency/reply-fixes-results-20261004.md)):
current model first, original corpus twice (100 requests), then corrected exam
recheck (10), then interleaved GPT-OSS/Nemotron pairs (100, plus one price-stopped
greeting). Final-prompt GPT-OSS exam rows passed direct factual review 15/15;
exam median completion 27.273 → 15.128 s. Original automatic paired checks were
47/50 and 45/50; language/factual failures remain documented. Nemotron was faster
but rejected, and the saved model was restored. An explicit price-file fallback
now budgets missing installed prices without changing raw SDK metadata.
No deployment or domain-data write.

2026-10-04, 100 requests with the retained default ([report](docs/evidence/chatbot-latency/default100-fresh-20261004.md)):
50 cases repeated twice, concurrency 1, fresh application caches verified on all
100 samples. All completed; 99/100 automatic checks passed, with one English
attendance-write offer flagged. First text: 6.053 s p50 / 11.413 s p95;
completion: 8.235 s / 27.273 s. Estimated cost $0.015093. These were one-shot
development-API requests, with resident local embeddings and uncontrolled
provider prompt caching. The proposed latency and read-only reply gates failed;
the saved model remains unchanged.

2026-10-04, context size ([review](docs/evidence/chatbot-latency/context-size-20261004.md)): the
system message was 55% of input tokens (960 per model step, uncached), tool
definitions 19% (44 per tool), the conversation 26%. The chat cannot write,
so the prompt's create recipes went; it now says writes are impossible here.
50 questions: 50/50, 174k to 137k input tokens; language-risk set: 36/36,
148k to 83k; blocked writes refuse without a tool call.

2026-10-04, tool cap ([review](docs/evidence/chatbot-latency/tool-cap-20261004.md)): `maxTools` 12
stays. Routing sends 8-10 tools; a cap of six cuts dependencies first and
fails 9/20 core, 3/31 Darija/French and 7/45 benchmark questions that pass
now. Six semantic matches instead of eight lose the Arabic class list and
student search, whose tool ranks 7th-8th. Routing only, no provider calls.

2026-10-03 (night), tool arguments and roles ([review](docs/evidence/chatbot-latency/tool-schemas-20261003.md), [roles](docs/evidence/chatbot-latency/roles-20261003.md)):
until `najm-chatbot` 2.1.2 every tool reached the model with an empty argument
schema (AI SDK 6 reads `inputSchema`, not `parameters`), so the model guessed
argument names. Fixed, then: named students resolve by search only (the full
list cost 52k tokens on one step), a closing reply-language line (2/36 to 0/36
on English tool results), and the chat context names the signed-in parent,
teacher or student. Parent, teacher, student and follow-up checks: 10/10, no
other student in any tool output. Full set: 50/50, 178k input tokens. Twice
in 98 blocked-write replies the model said a refused announcement was created;
the benchmark now fails such a reply (`falseWriteClaims`).

2026-10-03, all 50 questions, default vs `:nitro` ([review](docs/evidence/chatbot-latency/model-nitro-full50-20261003.md)):
`:nitro` completed in 1.0 s p50 / 1.5 s p95 against 3.5 s / 12.3 s, but three
teacher-count answers came back empty. Cerebras, which serves `:nitro`, returned
`teachers_get_teacher_count` calls as `teachers_get_teacher` (12/12 in a direct
probe); Groq rejects the `null` the model sends for optional parameters. Measured
cost about $1.5 per 1,000 answers against $0.18. The saved model is unchanged.

2026-10-03, embedding failure paths, Phase 2 items 1-3 ([review](docs/evidence/chatbot-latency/embedding-residency-20261003.md)):
a warm question embeds in 137 ms p50, a cold one in about 1.7 s, an indexing
batch of 16 long tool texts in 14 s. School's empty knowledge base used to embed
every message again and, with the embedding server down, failed the chat
(`setup_error`) despite the routing fallback. Now (`najm-rag` 2.2.0,
`najm-chatbot` 2.1.1): questions time out after 5 s while indexing keeps 60 s,
skip the server for 30 s after a failure, and `fallbackOnRouterError: 'none'`
answers without the ~51k-token all-tools fallback. Live with Ollama stopped,
12/12 answers said the data was unreachable, in the question's language,
0.8-6.6 s; after Ollama returned the same questions were correct again.
`OLLAMA_KEEP_ALIVE=-1` on this workstation removes the reload after idle.

2026-10-03, full baseline after the fixes ([review](docs/evidence/chatbot-latency/full50-20261003.md)):
all 50 questions in five languages pass (49/50 as scored; the miss was the
language check reading French class names in an English answer's table,
now fixed). Complete answer 4.2 s p50 and 13.1 s p95 on the default
OpenRouter route; School's own work is 0.2 s p50 and under 0.5 s p95, and the
model about 93%. About $0.19 per 1,000 answers. One run: smoke coverage.

2026-10-03, French and Darija ([review](docs/evidence/chatbot-latency/fr-darija-20261003.md)):
the corpus gained 10 Darija (`ary`) cases, and `--languages=fr,ary` runs only
those. On the saved model, French went from 8/10 to 10/10 and Darija from 5/10
to 10/10 (two runs), with no wrong-language reply:
- `teachers_get_teacher_count` replaces counting a list (42, 62 and 84 became 50);
- the system prompt judges the reply language by the user's own words, so a
  student name or French class labels no longer switch a Darija answer to
  English or French;
- Darija words are rewritten to Modern Standard Arabic before tool routing
  embeds a message (`najm-rag` 2.1.3 `rewriteRoutingQuery`, School's
  `darijaRouting.ts`). The embedding model scored every tool about equally
  for Darija, and well for the same question in MSA. Semantic phrases were
  measured and rejected: they replace description matches whenever one clears
  the threshold, and unrelated questions cleared it.

Because the benchmark questions shaped the word list, 31 more Darija and French
routing questions on other topics (`routing-darija-fr.json`) went from 23/31 to
29/31, after more words, French and Arabic sentences on 27 common read tools,
and student-search dependencies for per-student tools. The all-language
preflight stayed at 18/20, and French and Darija passed 20/20 a third time.

Earlier the same day, an audit found 41 chat-callable tools that changed data
without a confirmation; all are now confirmed, so the chat refuses them
(`tests/security/ChatReadOnlyTools.test.ts`). Marking the 249 reads
`readOnly` stopped najm-rag dropping them as possible writes: routing
preflight 14/20 → 17/20 (18/20 with the Darija rewrite).

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

`gpt-oss-20b:nitro` was rejected ([review](docs/evidence/chatbot-latency/model-20b-nitro-20261003.md)).
It answered 10/12: on both write requests it retried an invalid student search
until `maxSteps` and returned an empty answer. It was not faster than
`120b:nitro` and used 4× the input tokens.

I scanned all 101 cheap, tool-capable OpenRouter models, then compared four
fast ones against `120b:nitro` ([review](docs/evidence/chatbot-latency/model-candidates-20261003.md)).

Candidate from the small smoke set:
- `nvidia/nemotron-3.5-lightning:nitro` passed 12/12 with the right
  languages and facts, at 0.97 s p50 and about $0.18 per 1,000 answers. It is
  a candidate for full-corpus comparison, not an accepted fallback.

Rejected:
- `gemini-2.5-flash-lite` answered an Arabic count question in English with
  a wrong, tool-free number.
- `mercury-2` had one server stream error and one hang.
- `nemotron-3-nano` took 78 s and 9 steps on one write request.

At candidate-test time the runner did not check reply language. It now checks
language and false completed-write claims; these heuristics still require human
review and stronger factual/argument scoring before model acceptance.

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
the academic-year plan. The separate 10/10 role check now provides local ownership
and follow-up evidence; permission-filtered routing and broader repeated coverage
remain unverified (section 2.4).

Scope: School's dashboard assistant, built on `najm-chatbot` and `najm-rag`,
from sending a question through receiving the completed answer. Preserve answer
quality and authorization in English, French, Modern Standard Arabic, Darija,
and Spanish; Darija checks currently require Arabic-script output.

## 1. Decision and order of work

**Local Qwen embeddings (Ollama here, llama.cpp on the original workstation) and
the configured OpenRouter chat model have local evidence. Jev remains optional.** No new
paid provider is a prerequisite; paid chat runs need a declared budget.

1. Re-run the 20 routing cases under the current Qwen instruction and tool
   descriptions; check runtime configuration, embedding connectivity, the
   database's pgvector schema, and routing failures. **Latest preview, 2026-10-04:
   18/20 core, 30/31 Darija/French. Remaining misses are not silently accepted.**
2. Build the section 4.2 runner and establish an external baseline using the
   actual streaming chat route. **Runner and 50-case corpus built; local full-set
   smoke runs recorded; default is now the 30-case Moroccan corpus with richer
   facts/register scoring. Latest post-fix repeat passes 60/60 automatic and
   assistant reviews; empty-read regression is covered. Guarded-list expansion
   brings the declared estimate within the unchanged cost gate on this corpus;
   other cache/load conditions and broader cases remain before overall acceptance.**
3. Add shared instrumentation in Najm and establish a controlled internal baseline.
   **`najm-chatbot` diagnostics released in 2.0.5, wired into School and the
   runner; local internal traces captured (2026-10-03), with caches/load
   uncontrolled. Request-scoped embedding spans followed in RAG 2.4.0 / chatbot
   2.2.1 (2026-10-04); serial fresh-cache repeat traces are verified. Cold-model
   and concurrent acceptance remains.**
4. Compare configuration, model, routing, and tool-call improvements separately.
   **Timeout/fallback, tool-cap and prompt-size experiments done locally. Nemotron
   full-corpus comparison rejected. GPT-OSS retained with Cerebras-first/low-effort
   policy and guarded School templates; validate this configuration before any new candidate.**
5. Consider Jev only if measured traffic and avoidable LLM spending justify it.

Do not assume that the LLM dominates latency. Embedding timeouts, database/tool
calls, large tool prompts, and provider retries are competing hypotheses.
The former 1.5-second first-text and 1-second completed-answer targets remain
aspirations until a baseline supports realistic acceptance thresholds.

The streaming runner, shared chatbot instrumentation, published School adoption
and local internal smoke baseline are complete. Per-embedding telemetry is now
available; controlled acceptance and deployment measurements remain. A local database schema repair
was required; production schema state remains unknown. Use section 0 as the
completion ledger and keep paid runs within their recorded budgets.

## 2. Verified source findings and runtime unknowns

Reconciled **2026-10-04** against School source and the matching read-only
reference at `C:\Users\pc\Desktop\najm`. Root pins: `najm-rag` `3.2.0`,
`najm-chatbot` `3.3.0`, `najm-mcp` `2.2.5`, `najm-theme` `0.3.0`,
`najm-core` `3.0.3`, `najm-api` `5.0.0`. Runtime claims remain tied to the
dated reports; this source review does not re-run their benchmarks. Compare
reference versions with root pins again before any shared implementation.

### 2.1 School configuration

In `packages/server/src/config/ragConfig.ts` and `chatbotConfig.ts`, re-read
2026-10-05 (`config/index.ts` re-exports the plugin factories):

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
  Ollama on the second workstation starts at login through a Startup shortcut
  per the 2026-10-03 residency review. `OLLAMA_KEEP_ALIVE=-1` was applied and
  verified after restart; it keeps loaded models resident but does not preload
  after a reboot. On
  2026-10-01 chat failed in preparation because it had stopped and its model
  file was missing (academic-year plan 0.1h). Treat embedding-process
  availability as a latency and failure risk, not only model residency.
- School's indexing timeout is **60,000 ms** (`RAG_EMBEDDING_TIMEOUT_MS`).
  Questions have a separate **5,000 ms** bound
  (`RAG_EMBEDDING_QUERY_TIMEOUT_MS`) and **30,000 ms** failure cooldown
  (`RAG_EMBEDDING_QUERY_COOLDOWN_MS`); health probes have a separate timeout.
- Tool routing and knowledge support are enabled, with explicit lookup
  student-search dependencies for per-student reads and blocked writes, plus
  assessment/date dependencies where needed. `rewriteDarijaForRouting` wraps
  the published `createDarijaQueryRewriter` from `najm-rag/query-rewrites` with
  School's domain vocabulary and phone-number rule. Common wording and the
  engine are shared; semantic phrases remain tool-linked examples. Rewriting
  applies to routing input only; the model still sees the original question. Effective RAG
  Studio settings can override routing limits and disable knowledge retrieval.
- Chat allows up to 10 LLM steps and stores conversations in the database.
  Ten is a ceiling, not an observed step count. The stream stall bound is 30 s.
  Interaction logging is disabled; the redacted `onDiagnostics` sink is enabled.
  The retained saved model is OpenRouter / `openai/gpt-oss-120b`. Source config
  requests Cerebras first with fallbacks allowed, ignores Groq and sets reasoning
  effort low; source policy does not prove which host handled a live request.
- `reply.detectLanguage` uses Najm's opt-in Moroccan latest-message detector;
  `reply.template` uses School's domain templates and already-validated year.
  Unqualified student/teacher totals and narrow class/exam/today student-attendance
  lists execute guarded reads; recognized school writes return localized refusals.
  Qualified, quoted or unfamiliar list requests retain the model path. Attendance
  supports empty and populated results; the published executor cannot fall back
  after reads, so genuine read/render failures retain its controlled error response.
  Templates preserve the stream/memory/diagnostics contract and
  have no generation tokens; routing/knowledge work still occurs.
- The system prompt and School's attendance request hints now distinguish
  successful empty reads from unavailable/failed reads, with localized examples.
  This is model guidance; [six focused live checks](docs/evidence/chatbot-latency/empty-read-results-20261005.md)
  and the full serial repeat pass; held-out/populated/error wording remains unverified.
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

- Tool counts in older reports are snapshots, not a current runtime inventory
  or the number available to a particular signed-in user. Recount registered
  and indexed tools in each controlled run.
- Successful routing defaults to `maxTools: 12`, `topSemanticHits: 8`, and
  similarity threshold 0.45. Dependencies are expanded before the final slice;
  lowering `maxTools` can remove a required lookup tool.
- **Twelve is not a global cap.** The package's router-error default is `all`,
  but School explicitly uses `fallbackOnRouterError: 'none'`. An error therefore
  supplies no data tools and a notice that data is unreachable. No-match behavior
  defaults to `none`. Disabled routing or an effective `all` fallback can still
  return the routable inventory; record effective settings, not defaults alone.
- Selected tool definitions remain available across LLM steps. Actual input
  charges depend on provider usage and prompt caching; schema estimates are not
  billing evidence.
- Preparation still awaits routing and then knowledge context sequentially.
  `najm-rag` now skips query embedding for an empty knowledge index and returns
  an unavailable notice when knowledge search fails. Query failures open the
  cooldown, avoiding another full wait. A populated index and Darija's rewritten
  routing/original knowledge queries can still require distinct embeddings;
  measure that path rather than assuming deduplication.
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
- Published chatbot 3.2.0 added termination after two identical tool-call steps;
  live triggering and preservation of legitimate multi-step work remain acceptance
  items. RAG 3.2.0 prunes retired tool embeddings during indexing. School's MCP
  names avoid prefix collisions; REST route paths were preserved by the rename.

### 2.3 Evidence available and still missing

- Correlated streaming diagnostics now record preparation stages, steps, tool
  outcomes/durations/sizes, aggregate usage and estimated cost, plus request-scoped
  embedding cache hits/misses, attempts and per-call spans. Serial correlation and
  fresh-cache checks passed; all 120 separate load requests also correlated. Reply diagnostics
  identify template/model paths. The sink holds only
  200 records per process and is lost on restart; durable/multi-instance
  collection needs its own design before production measurement.
- The admin-only `POST /api/rag-studio/chat-debug` returns tool traces and
  `latencyMs`, but uses `generateText` and performs extra trace work. Its latency
  cannot substitute for the actual streaming route.
- Multi-step usage now uses SDK `totalUsage`, normalized input/output counts.
  Estimated prices and browser metadata are not authoritative bills. Earlier Nitro
  and Cerebras reports reconcile account usage deltas for those runs. The latest
  full repeat verifies selected-key equality, preserves raw SDK rates and budgets
  from declared catalog maxima. Delayed stable selected-key usage exactly matches
  Cerebras catalog token pricing, while per-generation host/invoice, other traffic
  and infrastructure attribution remain open. Generic SDK prices still understate
  observed spend. The earlier full repeat exceeded the cost gate; the latest
  guarded-list corpus passes the estimated API-cost gate, with observed window
  spend $0.012718700 for 60 replies and a declared estimate of $0.012989100.
- Local settings, seeded data and indexed tools have dated evidence. Controlled
  cold-model coverage, failed level-4 gates, populated knowledge, production connectivity
  and production schema/billing remain unverified. Recheck effective settings
  and fixture facts before the next run.

### 2.4 Routing correctness prerequisites before cap tuning

The 2026-10-04 cap experiment rejects six and retains cap 12 / semantic hits 8.
The following remain prerequisites for future routing changes:

- Evaluate complete operation-plus-lookup coverage. Dependency expansion followed
  by a final slice can remove a required lookup even if the primary tool survives.
- Compare selection after permission-based candidate filtering. The current
  routable-tools filter only excludes RAG Studio internals; execution guards remain
  a separate boundary. The 10/10 role run tests ownership at execution, not
  permission-filtered candidate selection or every denied route.
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
The latest preview is 18/20 core, 30/31 Darija/French and 44/45 tool-requiring
benchmark questions (2026-10-04). These are selection checks, not completed
answer scores; a blocked write may be refused without its tool. Add independent
held-out paraphrases, record remaining misses, and verify actual chat execution
after a routing change instead of certifying it from preview alone.

## 3. Test prerequisites and required APIs

The met prerequisites below describe the earlier dated local runs. Subsequent
[current acceptance run](docs/evidence/chatbot-latency/current60-results-20261004.md)
established isolated health/settings/cache readiness and completed paid requests
at port 3102, superseding the unavailable-app status-refresh check. It does not
prove current billed-cost acceptance or production readiness. Confirm
the intended instance before execution; do not infer readiness from source pins.

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

The public contract is available in RAG 2.4.0 / chatbot 2.2.1. Embedding calls
and attempts are scoped through `RAG_DIAGNOSTICS`, with separate cache status,
operation, timing and terminal category. Chat includes preparation and tool-side
events with request-relative offsets. Unfinished capture at a terminal outcome
is marked partial. School's runner summarizes all outcomes, keeping missing
capture distinct from zero calls. No private cache inspection is needed;
`clearQueryCache()` clears only one embedder's cache, not every cache/model state.

School must not inspect
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

**Current path:** School uses `onDiagnostics` with interaction logging disabled.
The interaction table is not exported in School's schema. Steps 1–3 below are
conditional on choosing durable interaction logging; they are not prerequisites
for the redacted sink or the next local benchmark. Define retention/access first.

1. Export `chatbotInteractionLogsTable as chatbotInteractionLogs` from
   `najm-chatbot/pg` in `packages/server/src/database/schema/index.ts`.
2. Run `bun run db:generate`; review the SQL and target migration history. Accept
   only the intended additive table/index changes, with no unrelated drops.
3. Apply the reviewed migration using `bun run db:migrate` on the designated
   development/test database. Production application is a separate rollout step.
4. Decide logging explicitly in `chatbotConfig()`. `chatLogging.enabled`
    defaults to `true` in the package, but School overrides it to `false`. Either
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
external baseline. Shared diagnostics releases are adopted; broader controlled
acceptance remains pending.

## 6. Benchmark contract

Files (created 2026-10-02 unless noted):

- `scripts/chatbot-benchmark.mjs` with `scripts/chatbot-stream.mjs` (parser,
  tested in `scripts/tests/chatbot-stream.test.mjs`): streaming runner, request
  limits, and budget controls. `.mjs` follows the other `scripts/` runners.
  Server diagnostics are read for each request by `x-request-id` (2026-10-03).
  `--compare-model` interleaves the saved model with a candidate, and
  `--languages=fr,ary` runs only those cases (2026-10-03). Bounded concurrency
  1/2/4 and chat/embedding correlation validation were added on 2026-10-04;
  comparisons remain serial. Non-admin accounts and conversation replay still
  need integration in this runner. Separate `scripts/chatbot-roles.mjs` supplies the
   10/10 role/follow-up smoke checks; integrate broader coverage and reporting.
- The runner now defaults to `datasets/chatbot-latency/morocco.json`: 30 independent
  admin cases, ten each in Darija, Modern Standard Arabic and French, with frozen
  class/exam facts and register checks. `scripts/chatbot-school-facts.ps1` reads
  authoritative internal facts; `scripts/chatbot-morocco-corpus.mjs` binds the corpus
  to their capture time/hash. Recheck facts before a run; never overwrite historical
  evidence to match a changed fixture.
- `datasets/chatbot-latency/questions.json`: legacy 50 independent cases, 10 per
  language (English, French, Spanish, Modern Standard Arabic, Darija), since
   2026-10-03. Missing-student cases exist; ambiguity, populated knowledge,
   topic changes and broader role/follow-up/denial cases still need inclusion.
- `datasets/chatbot-latency/routing-cases.json` (20) and `routing-darija-fr.json`
  (31): routing-only cases for `scripts/chatbot-routing-preflight.mjs`
  (`--cases=<file>`).
- `docs/tests/chatbot-latency.md`: setup, execution, scoring and opt-in fresh
  query/knowledge cache controls; model residency/provider caches remain separate.
- `docs/evidence/chatbot-latency/`: sanitized raw samples and comparison reports.
- `scripts/chatbot-run-lock.mjs`: cooperative machine-wide lock across updated
  checkouts. The runner verifies provider/model before each chat and retains
  corpus/scorer/prompt/template/context hashes. Older runners and other settings
  writers bypass this lock; freeze the app build during measurement.

### 6.1 Corpus and correctness

The default 30 Moroccan questions cover small talk, single/multi-tool reads,
missing students and blocked-write requests in three languages with authoritative
class/exam rows. The legacy 50-case corpus remains available explicitly for five-language
regressions. Extend these frozen cores with grounded knowledge, held-out wording
and broader role/conversation cases; version additions and record each corpus hash.
The extended fixture contract must specify role, selected academic year, fixture
IDs, expected tools/alternatives, important arguments, answer facts, and refusal
behavior. Role/year are currently corpus-level; per-case arguments can be scored
through `expectedToolCalls`, initially populated for the five missing-student cases.
Include count questions: list-based counting took 71–79 s and gave wrong totals
before the aggregate tool existed. Human-review quality in every
language; a fast incorrect answer fails.

Current automatic scoring checks successful tool-output groups, exact required
argument subsets (`expectedToolCalls`), required/forbidden fact boundaries,
reply language, completed-write claims and write promises. A null language
detection now fails automatic acceptance and sets `reviewRequired`, unless a
fixture explicitly opts out with `replyLanguage: null`. Arguments remain in
memory for scoring and are stripped from saved tool reports. Whole-answer
factual correctness still requires richer fixture facts and human review. Include
read-only refusals that never call a tool, and distinguish those from adapter
blocking proved by a `blocked` server outcome. Check knowledge citations and
the honest knowledge-unavailable reply using synthetic indexed documents.

The Moroccan scorer additionally checks exact class sections, each displayed exam
row/date/time and next-five order, mixed-language prose and Arabic/Darija register.
Exact stored names are exempted at word boundaries. This does not establish native
fluency or correctness of every narrative claim. Qualified counts must retain
their qualifier on the model path; test that templates do not answer with a school
total when the user asks for a class, gender, attendance state or another year.

Attendance fixtures declare `emptyResultTools` (Moroccan v4, legacy v3). The runner
retains array shape/count only, decoding Najm's JSON-as-text output; it stores no
row contents. With a successful matching server read and a zero-length array,
require explicit empty wording and reject unavailable/settings/retry claims.
Missing execution or array-shape evidence requires review, not an assumed empty
result. These wording heuristics do not certify populated-row facts or all
narrative claims. Old samples lacking summaries cannot certify this new gate.

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
| Empty query/knowledge caches, warm embedding model | Use opt-in isolated-dev controls with serial `--cache-mode=fresh`; verify same instance/reset and an actual completed routing embedding miss/attempt; separately prove no model reload |
| Empty query/knowledge caches, cold embedding model | Use the same fresh-cache controls, then unload the isolated Ollama model or restart the isolated llama.cpp process; verify a real call and reload |
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

Report hybrid totals and separate template/model distributions with sample counts.
Use `server.reply.source` rather than the selected model label to identify templates;
they report zero generation usage and derived `modelAndStreamMs`, but still incur
routing/knowledge and guarded-read work. Template share is a corpus property, not
a measured production traffic mix. Preserve unknown billing separately from zero
template generation cost. The cooperative run lock and provider/model checks do
not replace a frozen build/configuration or actual per-request host evidence.

Keep observed results separate from traffic-weighted monthly projections. A
balanced fixture set does not establish the distribution of real user questions.

Before each comparison, record the latency/cost target, allowed non-target
regression budget, and sample plan. Require no observed authorization or blocked-
write regressions, review all correctness regressions, and reject improvements
that merely hide a weaker language or fall within measurement variability.

### 6.4 Proposed acceptance targets and next comparison

These are planning targets for the next controlled experiment, **not achieved
results or a production SLA**. They are deliberately less aggressive than the
old sub-second aspirations and must be recorded in the run report before testing.

| Metric | Proposed gate |
|---|---|
| API first answer text | p50 ≤ 3 s, p95 ≤ 8 s |
| API completed answer | p50 ≤ 5 s, p95 ≤ 15 s |
| Completed, non-empty answers | At least 99% of attempts; all failures counted |
| Authorization and read-only policy | Zero observed leaks, executed writes, false write claims or promises to perform writes |
| Answer/tool correctness | All fixture checks pass on completed answers; inconclusive language and factual cases receive human review |
| Estimated API cost | ≤ $0.25 per 1,000 correct completed answers, including failed-attempt spend; reconcile provider billing where available |
| Candidate improvement | At least 20% lower completion p95 than the interleaved default; first-text/completion p50 may not regress more than 10%; preserve the gates above |

The pre-fix 59/60 review and cost-failing full post-fix repeat remain unchanged.
The latest guarded-list repeat passes 60/60 automatic and assistant checks, with
actual observed window spend **$0.012718700 for 60 replies** and a declared
estimate of $0.012989100. Normalized projections are $0.212/$0.216 per 1,000
correct replies, so the estimated API-cost gate passes on this corpus. The user's
$0.06/66 screenshot is consistent with earlier windows, not a new token price;
[reconciliation](docs/evidence/chatbot-latency/price-units-20261005.md) separates
actual run spend from reply/provider-step counts and projections. Retain all
historical failures and unmeasured broader/production conditions.
The first level-2 batch passes; the first level-4 batch fails French label
correctness and first-text p95 at 8.166 s. [Original load results](docs/evidence/chatbot-latency/load24-results-20261005.md)
retain those failures and $0.025388000 observed spend. The separately budgeted
[French-hint recheck](docs/evidence/chatbot-latency/stream-recheck-results-20261005.md)
passes all French lookup rows and new level-4 timing, but keeps its raw 59/60
scorer false positive separate from the 60/60 assistant review and prospective
scorer correction. No original gate/history rewrite or paid expansion follows.
The later [pinned provider experiment](docs/evidence/chatbot-latency/provider-compare-results-20261005.md)
passes 120/120 with the corrected scorer, sixty per provider. Crusoe passes the
configured hybrid/value gates with 84.10% lower declared token cost, but model
completion mean/p95 3.306/9.269 s versus Cerebras 1.318/3.142 s is a clear latency
tradeoff. Retain the default; this is no production/candidate-speed acceptance.
For a newly budgeted changed-product repeat, use
30 frozen Moroccan cases × 2 repetitions = **60 outer chat requests** at
concurrency 1, warm embeddings and verified fresh application caches. Keep the
current Cerebras-first/low-effort/template policy fixed and review every reply.
This repeat is regression evidence, not enough to establish per-language p95 or
a 1% failure guarantee. Templates can avoid provider generation, but every outer
request counts toward the request budget; do not assume an unobserved path is free.
Recheck the legacy 50-case English/Spanish coverage separately with explicit
`--cases=datasets/chatbot-latency/questions.json` and its own budget.

If a candidate is justified after current acceptance, use 50 frozen legacy
questions × 2 repetitions × 2 variants = **200 outer chat requests**, 100 per
variant, or predeclare a versioned Moroccan/extended corpus and its sample counts.
Hold reply templates constant and compare the model-generated subset as well as
hybrid totals; templates cannot prove one model is faster. Alternate variant
order as the runner does. Expand important language/role groups toward 100
observations when the decision depends on them. Role/conversation, cache-hit,
cold-model and concurrency-2/4 runs have separate conditions and budgets;
`--cache-mode=fresh` supports serial execution only. Declare a supported cache
condition for concurrent runs and verify live correlation; do not pool percentiles.

Current evidence against these gates:

| Gate | Evidence | Still required |
|---|---|---|
| Latency/non-empty completion | Serial/level 2 pass; initial level 4 p95 8.166 s failure retained; post-hint level 4 p95 1.854/1.879 s passes | Host/queue/retry attribution, cold-model conditions and production; repeat does not prove a latency fix |
| Read-only policy and correctness | French hint and corrected scorer pass new 120/120 provider comparison; earlier raw 59/60 false positive and genuine label failure retained; no writes/fact errors | Held-out/populated/error wording, roles/year denials, knowledge and current English/Spanish; native fluency/readability review |
| Cost | Estimated API gate passes on this corpus: actual observed increase $0.012718700 for 60 replies, declared $0.012989100; normalized $0.212/$0.216 per 1,000 correct replies | Production workload mix and per-generation host/invoice, other traffic and embedding infrastructure reconciliation; key equality verified for this run |
| Candidate improvement | No current interleaved candidate comparison; Nemotron rejected | Only if a new candidate is proposed after current acceptance |
| Production/browser | No evidence from the latest development run | Production API and submit-to-first-render measurements |

Before execution, record the exact corpus/configuration hashes, prices/date,
maximum requests and maximum monetary spend, counting warmups, probes, role
checks, failures and retries. `--max-requests` is a request-count control, not a
dollar cap. The runner now has optional `--max-estimated-usd` and
`--request-reserve-usd` accounting: reserve before dispatch, stop on unknown cost
or insufficient remaining estimates, and drain in-flight work. Explicit
`--pricing-mode=declared` budgets from coherent measured usage at frozen declared
rates even when SDK prices exist; `--capture-provider-usage` records dev/admin-only
selected-key ledger reads. SDK metadata remains unchanged. This is not a
proven billing ceiling; missing usage, retries and provider charges can exceed
it. Enforce a hard ceiling through a verified isolated-provider limit. Read-only
`--preflight` records readiness and hashes without chatting or changing the model;
cache/model conditions remain unverified. No amount or paid execution is
authorized by this plan.

Report observed failure rates with counts/uncertainty: 100 observations cannot
establish a real-world 1% error guarantee. Keep the default if the candidate
fails, misses the improvement threshold, or the observed difference is within
variability. Publish a repeat comparison before adopting a new model. A failing
default baseline is a recorded gap, not grounds to relax a target after the run.

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

Current disposition: items 1–3 have local residency/timeout/outage evidence,
with populated-knowledge and hanging-request acceptance still pending. Item 4
retains cap 12 and semantic hits 8. Item 5 rejected Nemotron and retains GPT-OSS;
the later tool-name fix removed the observed Cerebras truncation and School now
configures Cerebras-first/low-effort routing. Live fallback and production cost
mix remain; the current serial corpus passes the estimated API-cost gate.
Item 6 shortened the system prompt with a 21% input-token reduction;
longer history and populated knowledge remain unmeasured. The latest guarded
templates bypass generation for counts/refusals and narrow class/exam/attendance
lists. Do not repeat a
rejected cap or adopt another model from smoke results.

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

Already adopted: School's count/refusal and narrow class/exam/today student-attendance
templates remove generation while Najm retains authorization/validation for the
reads. The latest 60-request repeat exercised 48 templates and 12 model answers;
template completion was 0.231/0.526 s p50/p95 with zero generation tokens. Actual
observed window spend fell from $0.052126750 to $0.012718700 for 60 replies, about
75.6%, with a deliberate template-path change. Routing/knowledge work remains.
Broader intent wording, qualified counts,
denied/failed reads and conversation behavior still need acceptance coverage.

## 9. Phase 4 — Jev intent routing (staged experiment)

Status 2026-10-05: **Stage A (classification only) done on a synthetic corpus.
B0 ran and failed its predeclared gate (1 wrong among 161 accepted held-out
questions); B1–B4 not started.** Jev stays off in every running
app until B4 passes and the owner decisions in 9.6 are made.

### 9.1 Why, and what it can win

Today a question gets a template reply only when School's regex matches its exact
wording (`schoolReplyTemplate`, `schoolListReply`). Everything else goes to
GPT-OSS. On the frozen benchmark corpus the regex covers 48 of 60 replies, because
that corpus uses exactly the phrasings the regex knows. On reworded questions it
covered **1 of 45** (Stage A test split). Real users reword, so the real template
share is lower than the benchmark shows. That gap is what Jev can close.

Jev (`typesafe/jev-1.13`, TypeSafe's System One model) returns a typed choice
with probabilities, never prose. Code still validates, executes authorized read
tools and renders the reply. Jev is not an authorization or write boundary.

What it can win, using measured numbers:

| | Template reply | Model reply (GPT-OSS) | Jev classification |
|---|---|---|---|
| Completion p50/p95 | 0.130/0.817 s (level-4 recheck) | 1.240/2.384 s (level-4 recheck) | 0.286/0.433 s warm, dev machine |
| Cost | ~0 generation tokens | ~$0.001 per reply | ~$0.000036 per request |

- **Time:** a question Jev accepts skips the model, so ~1.2 s becomes ~0.3–0.5 s.
  A question it does not accept must not wait longer than today, so Jev runs
  **in parallel with** routing (B1), never in front of it.
- **Cost:** one classification is ~3% of one model reply. Jev pays for its own
  calls once it moves ≥ ~3% of model-path questions to templates.
  `net saving = model cost avoided − Jev cost of every classified question`.
  Real traffic, not this corpus, decides the share.
- **Not a goal here:** a smaller chat model (see B5) and the OpenRouter
  `typesafe/jev-router` auto-router. The router picks from an unrestricted model
  pool with no documented way to limit it, so it can leave Cerebras GPT-OSS,
  pick a model weak in Darija (Nemotron was already rejected), or send questions
  to unapproved providers.

Access, checked 2026-10-05: OpenRouter lists one provider (TypeSafe), $0.042 per
million input tokens, $0 output, 32k context, no published latency. The
Decisions API (`POST https://openrouter.ai/api/alpha/decisions`) takes the
existing OpenRouter key; no TypeSafe key is needed. Pin `typesafe/jev-1.13`,
never the moving `~typesafe/jev-latest` alias. There is no second provider, so
every Jev failure must fall back to today's path.

### 9.2 Stage A result (2026-10-05)

[Classification-only probe](docs/evidence/chatbot-latency/jev-probe-20261005.md)
with `scripts/chatbot-jev-probe.mjs`, `scripts/chatbot-jev.mjs` and
[jev-intents.json](datasets/chatbot-latency/jev-intents.json): 136 synthetic
questions × 3, 0 errors, nothing sent to the school app.

- Test split: 99.5% top-choice accuracy; **0 wrong among 125 accepted** at
  confidence ≥ 0.8; 92.6% coverage of deterministic questions, against 2.2% for
  the regex.
- Darija in Arabic script: always correct, but less confident; coverage at 0.8
  is about 80%. Darija in Latin script (Arabizi) caused every low-confidence
  error, including one write (`sjel … ghayb lyoum`) chosen as today's attendance
  at 0.35, with its write probability at 0.47–0.49, just under the 0.5 guard.
- Warm latency 286/433 ms p50/p95; reported cost $0.014695 for 408 requests. The
  observed key increase was $0.019044; the $0.0043 gap is unattributed.
- Limits: only 44 unique accepted test cases (95% upper error bound about 7%,
  so the 98% floor is **not** established); one author wrote both the cases and
  the intent wording; single-turn questions only; no reply was rendered.

### 9.3 Target design

```text
question
  ├─ School language profile (shared by context and reply policy)
  ├─ regex template (sync) → match: choose template; start no routing/Jev
  ├─ regex miss, Jev ineligible/off → routing + context → GPT-OSS
  └─ eligible miss: start in parallel:
       ├─ A. routing embedding + context (today's path)
       ├─ B. Jev classification (deadline 800 ms)
       └─ first observed outcome:
            ├─ A ready → choose GPT-OSS immediately; abort/ignore late B
            ├─ accepted B → choose mapped template; cancel/mark A unused
            └─ B null/error/deadline → discard B; A continues → GPT-OSS when ready
```

The selector adds **zero deliberate grace** after A is ready: 50 ms routing
with an 800 ms Jev timeout starts the model at 50 ms, not 800 ms. The deadline
only limits B while A is still pending. Once a path is selected it is sealed;
late results cannot change it or execute a second read/answer. Client cancellation
aborts both preparation jobs and prevents execution. This is the target contract,
not the behavior of published 3.3.0, which still has a synchronous post-routing hook.
Less Jev coverage on fast/cached routing is the explicit cost of immediate fallback;
measure that loss in B3 instead of promising the full Stage A acceptance share.

Eligibility requires mode `on`, a supported detected language (`fr`/`ar`/`ary`),
the administrator web channel for the initial experiment, and authoritative
`priorUserTurns === 0`. Unknown/truncated history is ineligible. A selected
template still uses Najm's single authenticated executor. Offline race contract
work is permitted while B0 is failed; runtime B1/B2 work and enablement remain
gated on fresh held-out acceptance and the supported published upgrade.
The [offline eligibility/readiness reference](docs/evidence/chatbot-latency/jev-eligibility-reference-20261006.md)
now requires explicit first-turn, complete-history and administrator/web context
before invoking classification. Unknown/ineligible inputs skip the classifier;
known regex matches must be returned before async preparation. Fake-clock checks
retain immediate fallback and sealed selection. This remains outside the app;
it does not start B1 or clear the current classification gate. The owner-selected
operator wording workflow in section 0 replaces the earlier native collection
prerequisite for the new synthetic path.

Rules that do not change: templates call only explicitly read-only,
non-confirmation tools through the same authenticated MCP builder
(`executeReplyTemplate` already enforces this); writes are refused, never
executed; a failed template read gives the "unavailable" reply, as today.
English and Spanish keep the model path, because School's renderers support
only `fr`/`ar`/`ary`. Follow-ups ("and the teachers?") keep the model path,
because Jev sees only the latest message.

### 9.4 Work order

**B0 — Bigger held-out corpus (no app change; about $0.02 of Jev calls).**
*Ran 2026-10-05, gate failed:* [B0 report](docs/evidence/chatbot-latency/jev-b0-20261005.md).
Wording v3 and threshold 0.8 were frozen on dev; on 253 held-out questions,
"how many exams this month" was accepted once as upcoming exams (1 wrong of 161
accepted questions). A Darija write reached 0.87 as a read and was stopped only
by the write guard. The test set is now spent for tuning. Options: retry with a
fresh, partly native-written held-out set after dev tuning for exam counts;
exclude `upcoming_exams` from Jev; or stop. Original B0 text follows.
The later [core exploration](docs/evidence/chatbot-latency/jev-core-results-20261005.md)
prepared 104 fresh synthetic queries / 26 families and explicitly excluded exam
choices without changing wording v3 or threshold 0.8. Two HTTP 429s stopped both
legs, including one paced at one request/second: 59 valid decisions from 61
attempts, zero wrong among 33 eligible accepted questions / 15 families. Known
reported cost $0.002325456; two unknown attempts retain $0.004 client reservations.
This incomplete, assistant-authored exploration does not satisfy B0. No native
review, full repetition or end-to-end result is claimed; Jev remains off.
The [continuation fix](docs/evidence/chatbot-latency/jev-resume-fix-20261005.md)
verifies earlier raw reports, frozen classification inputs and cumulative
allowances before resuming. Offline preflight reconstructs 61 attempts and
$0.006325456 of known costs plus retained reservations, leaving $0.013674544
and 251 attempts within the original ceiling. Unknown costs block a live resume
unless explicitly retained; a known-cost 429 also stops without retry. This
runner change makes no new paid call or B0 acceptance claim. Provider stability
and fresh native-authored/reviewed acceptance still precede integration.
Following a later user `continue`, the
[final scheduled study](docs/evidence/chatbot-latency/jev-core-final-results-20261005.md)
completed all 312 attempts: 310 valid decisions and the two earlier failures.
The later 251 attempts succeeded with two-second minimum spacing under the
original cumulative limits. Core still failed: one Darija teacher-name request
was accepted as `teacher_count` at confidence 0.80. Combined warm classification
mean/p95 is 320/422 ms, known cost $0.012219438 plus $0.004 retained reservations.
Only 50 eligible accepted questions / 16 families and no native review; no
post-result threshold/wording change or runtime enablement follows this study.
- The [native collection protocol](docs/tests/jev-native-validation.md) separates
  authorship from review, keeps linked language variants in one family/split,
  freezes blind labels before predictions and records actual provenance. It
  now has an [empty intake template](datasets/chatbot-latency/jev-native-intake.example.json)
  and offline intake/check/worksheet/export tooling. Reviewed exports preserve
  provenance and hashes; the probe checks them before network calls. Authorship
  and reviewer identities remain declarations needing human audit. No actual
  native cases or reviews have been supplied; no accuracy acceptance is claimed.
  [Preparation verification](docs/evidence/chatbot-latency/jev-native-intake-20261005.md):
  301 script tests and lint pass; the empty template remains blocked and all
  310 historical normalized core decisions replay unchanged. Actual human
  input/review remains required before a new held-out study.
- A [working native collection](datasets/chatbot-latency/jev-native-collection.json)
  and [first-batch instructions](docs/tests/jev-native-collection-start.md) are
  prepared. The user's subsequent writing request produced a
  [full 960-question assistant draft](docs/tests/jev-moroccan-draft.md): 240 per
  language style, 150 supported synthetic groups, 30 write groups and broad
  negative coverage. Labels are provisional; the blind worksheet has no labels.
  Actual native authorship and human reviews remain zero; native export refuses.
  The separate exploratory corpus passes lexical freshness and is registered
  as seen. No new paid allowance, classifier result or native acceptance is claimed.
- The [960-question offline pipeline audit](docs/evidence/chatbot-latency/jev-draft-coverage-20261006.md)
  finds 145 unknown-language cases, including 106 supported provisional labels.
  All 22 synchronous template matches are write refusals and agree with those
  labels. Under an assumed administrator first turn, 793 misses are classifier
  eligible; this is not acceptance or a Jev result. The prototype count veto
  declines 14 count labels that exclude names/lists. One French combined-count
  variant omits both entities and needs label/translation review. Corpus history
  and the blind worksheet stay preserved; language coverage, native review and
  runtime integration remain open, with zero new provider calls.
- The [language coverage follow-up](docs/evidence/chatbot-latency/jev-draft-language-fix-20261006.md)
  reduces unknown-language questions from 145 to 1 and supported-label skips from
  106 to 1 on the same draft. French detection is 240/240; Arabizi is 239/240.
  The 23 regex hits remain write refusals with no provisional-label disagreement;
  read matching stays narrow. The ambiguous French totals label is corrected to
  `needs_llm` in both corpora and the generator, preserving its text, family,
  provenance and blind worksheet. Earlier reports/hashes remain historical.
  One single-signal Arabizi command and 47 Arabic/Darija register cases remain;
  these synthetic checks do not establish native fluency, Jev accuracy or latency.
- A [bounded 96-case development probe](docs/tests/jev-draft-probe96.md) is now
  prepared from 24 existing assistant-authored families, all `dev`, with frozen
  0.8/core scoring, 96-request/$0.02 client limits, $0.00015 reservations and
  two-second dispatch spacing. Offline validation/preflight pass. Automatic
  approval review rejected the key-precheck command as “blocked by policy”; it
  did not execute. Paid execution and a verified current key limit remain pending.
  No new key read, classifier result, native acceptance or Jev enablement follows
  this preparation. The selected questions keep their IDs/text/provenance and
  are not new independent held-out families.
- Following user confirmation, the [96-case development probe](docs/evidence/chatbot-latency/jev-draft-probe96-results-20261006.md)
  completed with 96 valid decisions, no API errors or unknown cost, and classifier
  mean/p95 288.8/409.7 ms. Frozen 0.8/core/write agreement accepts 57 language-
  eligible questions across 19 linked families with zero provisional-label errors;
  raw top-choice/write-score errors are 5/9. Arabizi eligible supported coverage is
  only 6/18. The prototype count veto drops 10 correct choices and prevents no
  error in this batch. Reported cost and later shared-key increase are both
  $0.003764334; the immediate lower ledger window remains preserved. The key
  precheck used the existing runner after confirmation. All 96 request slots are
  consumed, with no new allowance from the unused $0.02 monetary remainder.
  This synthetic dev result does not clear native acceptance or B1/B2; Jev stays off.
- Separate [development candidates](docs/tests/jev-development-candidates.md) now
  prepare count veto v2 and binary write wording v4. On unchanged saved decisions,
  v2 restores the recent ten correct-question losses (47 → 57) and the core's
  three correct-question losses (48 → 51 under current language gating), while
  still blocking the known core teacher-name error. The name-exclusion exception
  is restricted to a positive count vocabulary/subject; quotes, arithmetic,
  negated counts and unrecognized qualifiers retain abstention. V1/v3 and raw
  reports remain intact. Explicit `--write-wording-version=4` is dev/assistant-only;
  its paired read/write instructions are unmeasured and do not override scores
  or write agreement. No new paid call, native acceptance or runtime integration
  follows this offline work. A future v4 comparison needs a separate allowance.
- The subsequent authorized [v4 development comparison](docs/evidence/chatbot-latency/jev-v4-probe96-results-20261006.md)
  completes all 96 requests under its own $0.02 client budget. False write scores
  fall 9 → 4, with zero missed write scores; eligible accepted choices rise
  57 → 58, Arabizi 6/18 → 7/18, and zero accepted provisional-label errors. Five
  raw intent errors persist. Classifier mean/p95 is 320.4/375.0 ms versus v3
  288.8/409.7 ms; max rises to 1.31 s and reported cost rises 35.88% to $0.005115054.
  The later shared-key increase matches that sum; immediate under-reporting stays
  preserved. All frozen dev checks pass, but v2 vetoes one newly accepted combined
  count, leaving both versions at 57. This sequential, spent assistant comparison
  is not native or end-to-end acceptance. Defaults remain v3/off, with no B1/B2
  adoption; the new 96-request allowance is consumed.
- Review integrity now binds labels to the exact question and collection context.
  The initial version 2 worksheets have a checked import into a new intake file;
  changed questions invalidate earlier reviews, and conflicting completed reviews
  cannot be overwritten. [Verification](docs/evidence/chatbot-latency/jev-native-review-binding-20261006.md)
  covers stale worksheets and offline import. Fingerprints do not authenticate
  people or label truth; actual native questions and independent review remain
  absent, with Jev off and no new provider calls.
- The [blind metadata follow-up](docs/evidence/chatbot-latency/jev-native-blind-ids-20261006.md)
  fixes intent leakage through original IDs/families and label-group ordering.
  Worksheet v3 uses opaque IDs/families and hash-sorted rows, omits author/split
  metadata, and maps imported labels back through the original intake binding.
  V1/v2 import is refused; earlier files are retained. A new v3 packet contains
  all 960 unchanged assistant questions with empty review fields. Human/native
  authorship and review remain zero; actual collection input is still required.
  This offline repair grants no acceptance, paid calls or Jev enablement.
- The [first-batch author form](docs/tests/jev-native-first-batch.md) initially
  had ten blank slots. It now contains ten explicitly AI-authored questions;
  the user confirmed the wording. Its separate
  [intake](datasets/chatbot-latency/jev-native-first-batch.json) preserves all ten
  as assistant/dev cases, with null labels and pending review. Date-only source
  records are retained in notes; no UTC authorship/review times were invented.
  A [v3 worksheet](datasets/chatbot-latency/jev-native-first-batch-review-v3.json)
  is prepared. General operator feedback does not establish blind labels or
  native authorship. Native export remains blocked and Jev remains off; no paid
  calls were made.
- A separate [count/list guard development replay](docs/evidence/chatbot-latency/jev-count-guard-dev-20261006.md)
  blocks the observed teacher-name/count error on saved decisions. It also drops
  three correctly accepted questions, reducing unique acceptances 50 → 46.
  This is post-result development, not a retroactive pass or runtime change.
  The dev corpus is registered as already seen for future native freshness;
  308 script tests and lint pass, with no new provider calls. Fresh native
  accuracy and fallback coverage/cost/latency must evaluate any proposed guard.
- Create a fresh held-out corpus beside the spent
  [jev-intents.json](datasets/chatbot-latency/jev-intents.json), with at least
  **150 unique accepted test cases**. Add Arabizi and mixed French/Darija, about
  30 write requests in every style, qualified counts, how-to questions, and
  follow-up fragments labelled `needs_llm`.
- Under the owner's current waiver, the assistant writes Darija/Arabizi and the
  owner reviews wording instead of supplying native-authored questions. The
  [first review batch](docs/tests/jev-operator-darija-review.md) has 100 questions
  linked into 50 paired families. Only actual feedback approves it. Generated
  labels stay assistant-provisional; no independent native precision claim follows.
- Tune intent wording on the dev split only; rerun the probe; record a new
  evidence report beside the 2026-10-05 one.
- Done when: 0 accepted wrong among ≥ 150 unique accepted test cases, no write
  accepted as a read, and warm p95 ≤ 500 ms. On the current operator-reviewed
  synthetic path, report assistant-label agreement and clustered family counts;
  do not infer a native-user confidence bound from generated cases. If it fails,
  stop here and keep Jev off.

**B1 — najm-chatbot: async, parallel template hook**
(in an authorized writable upstream checkout; the Desktop copy is read-only).
- Implemented candidate API: `reply.template` remains synchronous. Optional
  `reply.preparation` has explicit enablement, server-owned `resolveContext`,
  synchronous `eligible`, an async `prepare`, `timeoutMs` (default 800), and
  separate selection/late-settlement observers. Requests include a cancellation
  signal, authenticated user ID and trusted `historyComplete`/`priorUserTurns`;
  unknown context fails closed for first-turn policies. `ReplyTemplate.label`
  is optional diagnostics only. See the candidate report for the exact contract.
- `src/agent/ChatAgent.ts` (`prepareTurn`, now around line 819): compute the
  language and synchronous regex first; only eligible misses start the classifier
  and routing/context together. Implement the sealed readiness race in 9.3;
  routing readiness starts the model immediately, including cache hits. Handle
  losing promise rejections and propagate client cancellation to both jobs.
- Template calls resolve against the full MCP registry instead of only the
  routed tools. Routing is relevance, not permission; the read-only and
  confirmation checks in `replyTemplate.ts` and the user's guards still apply.
- Diagnostics: a `templateMs` span, `reply.label`, `reply.timedOut`, and the
  selection reason/time. Losing jobs have a terminal `unused`/`cancelled`/partial
  outcome, not a false successful zero-work result. Snapshot every embedding/API
  attempt already started with its request ID before closing the capture scope;
  late completions cannot mutate the settled chat record. An unabortable attempt
  remains explicitly partial/unused and billed/unknown, even after the reply ends.
- Tests: sync hooks behave exactly as before; async accept; async null; timeout
  and throw fall to the model; cancellation aborts the hook; an unrouted
  read-only tool runs; a confirmation or write tool is refused; no unhandled
  rejection after an early template reply; fast/cached routing with slow/hanging
  Jev starts immediately; late acceptance never executes; unknown history skips
  Jev; client cancellation prevents output; losing jobs retain honest diagnostics.
- Completed: the owner approved publication; `najm-chatbot` 3.4.0 was published
  from the tested tarball and verified byte for byte. Najm is pushed; School
  adopts exact root/workspace pins plus the matching override and Bun lockfile.
  See the dated publication report for repository and verification details.

**B2 — School: Jev template behind a switch (default off).**
- `packages/server/src/modules/chat/jevIntents.ts` becomes the single owner of
  the intent list, the request builder and the response parser. Move them from
  `scripts/chatbot-jev.mjs`; the probe imports the server source, as it already
  does for `schoolReplyTemplates.ts`.
- A `JevIntentClassifier` service: one Decisions API call with the hook's
  `signal`, `provider: { data_collection: 'deny' }`, no retry, and `null` on any
  error. Verify that TypeSafe is still served under `deny`; if it is refused,
  record that and treat it as a B4 blocker, never silently drop the setting.
- `schoolReplyTemplate` becomes async: regex first (unchanged), then Jev only
  under the rules in 9.3. Each intent maps to the existing count, list and
  refusal renderers. `small_talk` gets a short fixed greeting in `fr`/`ar`/`ary`,
  kept beside the existing refusal texts.
- Config: `CHATBOT_JEV_MODE=off|shadow|on` (default `off`),
  `CHATBOT_JEV_THRESHOLD=0.8`, `CHATBOT_JEV_TIMEOUT_MS=800`. `shadow` classifies
  and records the decision in diagnostics but never acts; it still sends the
  question, so it needs the same data agreement as `on`.
- Benchmark control: an admin-only (`@isAdministrator()`) dev-only route under
  `/chat-benchmark` to switch the mode between interleaved requests, enabled
  only where the existing benchmark controls are.
- Tests: every intent mapping, the threshold, the write guard, en/es skip,
  follow-up skip, timeout/error → null, regex wins first, `off` sends nothing.
  Then `bun run lint`, `typecheck`, `test`, `build`.

**B3 — Interleaved benchmark (paid; declare budget before the run).**
- Corpus: the 50 base questions plus the B0 held-out `fr`/`ar`/`ary` questions,
  each run with the mode `off` and `on` alternately on the same isolated app.
- Report: first-text and completion p50/p95 separately for regex templates, Jev
  templates, fallbacks and overall; template share; the Jev decision log;
  observed key delta per mode; and the assistant correctness review of every reply.
- Proposed allowance: about 2 × 150 chats with an estimated stop of $0.25,
  recorded before execution.

**B4 — Keep or disable.** Turn `on` beyond the isolated app only when all hold:
- precision ≥ 98% among accepted, with ≥ 150 unique accepted cases; no write
  accepted as a read; no permission regression;
- fallback p95 no more than 100 ms worse than `off`; Jev-accepted completion
  p95 below the model-path p95; overall hybrid p50/p95 not worse;
- observed cost per 1,000 correct replies lower than `off`;
- the data decision in 9.6 is made.

Otherwise leave the mode `off`, keep the comparison report, and record why.

**B5 — Later, separate: a smaller model for `needs_llm`.** Only after B4: use
Jev's choice to send fewer tools, or to pick a smaller model for simple
questions, and measure Darija quality against GPT-OSS on the same corpus.
Nemotron's rejection shows quality, not price, is the risk.

### 9.5 Rollback

`CHATBOT_JEV_MODE=off` restores today's path for the next request with no
deploy. A sync regex-only hook keeps working on najm-chatbot 3.4.0, so the
package needs no rollback unless B1 regresses; then restore the 3.3.0 pin and
override together.

### 9.6 Owner decisions needed

1. **Data:** may real admin questions, which can name students, go to TypeSafe
   through OpenRouter? Required before `shadow` or `on` outside synthetic runs.
2. **Key:** reuse the OpenRouter key selected in AI settings (one secret,
   recommended), or the environment `OPENROUTER_API_KEY`?
3. **Greetings:** may greetings be answered with fixed text instead of the model?
4. **Publish:** approve releasing `najm-chatbot` 3.4.0 after B1 passes.

### 9.7 Review findings — 2026-10-05

[Review](docs/evidence/chatbot-latency/jev-review-20261005.md), with offline
reproductions and no new paid calls: decision validation and probe spending stops
are now fixed (findings 1 and 2). The target design in 9.3 now specifies a sealed,
zero-grace routing-ready race and terminal/cancellation requirements (finding 3
design fix; runtime implementation remains pending). Keep the Desktop Najm reference
read-only while the upstream supported hook is developed elsewhere.

Finding 1 follow-up: the Stage A parser rejects invalid confidence/write scores,
incomplete or inconsistent probability maps, unpinned models and invalid usage.
The acceptance guard also rejects malformed scores and thresholds. All 15 current
Jev tests (154 assertions), corpus validation and lint passed. An
[offline replay](docs/evidence/chatbot-latency/jev-validation-replay-20261005.json)
of 408 saved normalized decisions preserved fields and acceptance at 0.5/0.8/0.99,
with no new paid calls or changes to the raw report. This replay reconstructs
responses from normalized records; it is not a new wire-response or runtime test.
Stage B remains planned.

Finding 2 follow-up: the probe now requires `--max-requests` and
`--request-reserve-usd`, reserves before dispatch, and retains the reservation
and stops on unknown cost. Known reported costs survive decision/HTTP failures;
the report separates known costs, unknown attempts and client reservations. The
original three-request missing-cost mock now stops after one attempt. All 35
focused tests (353 assertions) and lint passed, with zero paid calls.
[Evidence and limits](docs/evidence/chatbot-latency/jev-budget-fix-20261005.md).
Reservations are client estimates, not a provider billing cap; Jev remains off.

Finding 4 follow-up: one School profile now drives both the reply policy and context
hints. It covers clear French paraphrases and multi-signal Arabizi, preserves the
published Moroccan fallback and excludes unknown/unsupported wording. The probe
now uses actual detection rather than fixture labels for regex and candidate counts.
[Fix and verification](docs/evidence/chatbot-latency/jev-language-readiness-fix-20261005.md).
Offline replay preserved all 1,491 normalized decisions and matched original corpus
hashes. Potential new accepted cases after language/regex gates rose from 21 to 29
in Stage A, and from 100 to 127 in B0. B0 still has one accepted wrong case; the
failed accuracy gate and need for fresh independent acceptance remain unchanged.
These are eligibility projections without the readiness race/tool execution.

Repository verification follow-up: the four literal benchmark errors now use
Najm's request translator and shared en/fr/ar/es catalog keys. Full `bun run test`
passes **1,446 tests**, with lint/typecheck, translation-key checks and the
sequential production build passing.
[Evidence](docs/evidence/chatbot-latency/benchmark-i18n-fix-20261005.md).
This closes the previous i18n blocker; the B0 accuracy failure and published
runtime-hook prerequisite remain separate.

At the initial review the detector skipped several accepted French paraphrases.
The original 125 accepted test samples represent **42 unique cases**, not the
44 stated above; the then-proposed pipeline left **21 unique new Jev cases**
after language and regex gates. This recount has matching corpus hashes and is
separate from the preserved raw report. The original Stage A statistics and
0.3–0.5 s projection do not establish end-to-end answer speed/precision. Keep
Stage B planned and Jev off until these findings and its existing gates are resolved.

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

Use section 0 for current states. Production completion requires the deployed
commit/package pins, effective embedding endpoint reachable from the app runtime,
live pgvector column/index checks, representative synthetic-data API runs, and
a diagnostic collection method that works across app instances. Record browser
submit-to-first-render separately, including network/render time. None of those
stages is established by a local development build or the existing API smoke runs.

## 11. Sources and verification references

School's published package pins and live runtime are authoritative. Per AGENTS.md,
inspect matching Desktop package sources as read-only references; do not read
Najm internals from `node_modules` or make School consume the Desktop checkouts.
**Source location resolved (2026-10-04):** AGENTS.md names
`C:\Users\hdevlop\Desktop\najm`; the available read-only checkout here is
`C:\Users\pc\Desktop\najm` (`../najm`). Its chatbot/RAG/MCP/API package
versions match School's current pins. Use it for reference only and recheck
versions before relying on it after a pin change.

- `package.json`, `bun.lock`: pins and resolved dependencies.
- `packages/server/src/config/index.ts`: embedding/chatbot policy.
- `packages/server/src/config/ragConfig.ts`, `chatbotConfig.ts` and
  `chatbotSystemPrompt.ts`: policy implementations re-exported by `index.ts`.
- `packages/server/src/modules/chat/schoolReplyTemplates.ts`, `schoolListReplies.ts`
  and `schoolReplyContext.ts`: School's guarded count/list/attendance/refusal
  renderers and domain reply hints.
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
- [OpenRouter: Jev guide](https://openrouter.ai/docs/guides/community/jev) and [Decisions API reference](https://openrouter.ai/docs/api/api-reference/alphadecisions/submit-a-decisions-questions-and-answers-request): endpoint, OpenRouter-key access, request and answer schema (checked 2026-10-05).
- [OpenRouter: Jev 1.13 endpoints](https://openrouter.ai/api/v1/models/typesafe/jev-1.13/endpoints): single TypeSafe provider, price, context (checked 2026-10-05); [Jev Router](https://openrouter.ai/typesafe/jev-router) is a separate auto-router, not used.
- [TypeSafe documentation](https://docs.typesafe.ai/): verify the current API,
  model versions, and error contract before Phase 4. The API reference was not
  accessible during review; exact API/version claims remain unverified.
