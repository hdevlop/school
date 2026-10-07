# School Jev adapter and full-chat experiment — 2026-10-07

School now uses the published `najm-chatbot@3.4.0` async preparation API. The adapter is implemented and defaults to off. Its current on/shadow modes accept only server-issued, one-use synthetic sessions on the marked local `school_history_test` database. Production and ordinary School questions remain off. This experiment did **not** qualify a rollout or prove a latency saving.

## Implemented behavior

- One shared Decisions request/parser and guard5 implementation serve both the development scripts and the adapter. Finite probability/range, complete distribution, model and cost validation remain enforced. The historical replay checks request equivalence and all 310 normalized saved decisions; changed profiles require explicit flags and cannot masquerade as the original frozen run.
- The server binds synthetic eligibility to authenticated admin/principal, the existing validated academic year, a fixed catalog query and a verified first turn. Caller-provided history claims, changed queries, replayed grants and unsupported languages cannot authorize classification.
- Off dispatches no classifier. Shadow returns no candidate. On returns a plan to the existing scoped MCP executor; it does not execute tools itself. Existing synchronous replies precede classification. There is no second year resolver, ownership implementation or tool executor.
- The published zero-grace readiness race seals the ordinary path immediately when ready and propagates cancellation. Late classification cannot replace the selected answer. A process-local request/cost ledger retains unknown reservations and prevents subsequent classification after unknown billing; no reset endpoint is provided.
- Admin benchmark controls verify the actual framework preparation switch. The runner freezes sources, catalog, balanced mode order, count/cost limits and zero retries. A failed stream remains in the report. Final runner source also checks required scoped MCP reads **before** paid dispatch and stops on a failed/blocked chat tool.

## Verification

`bun run test` passed **1,881 test executions across the ten root script groups**, with zero failures. This includes the new adapter/HTTP/year-scope cases, frozen protocol validation, blocked network replay and existing guard fault matrices. Lint, full workspace typecheck, translation-key check and the production build passed. The build used a separate Next output directory; no migration or database reset ran.

One earlier root run had three subprocess test timeouts while build/lint/typecheck competed for CPU. The sequential root rerun passed with the same assertions and default timeout. An earlier PowerShell redirection reported a nonzero shell status for successful lint/typecheck stderr; the explicit native-exit reruns passed. These failures are retained in the local verification ledger rather than reported as application defects.

The [release-source mock integration run](jev-full-chat-fixture-release-20261007.json) completed **72/72 HTTP chats**: 24 off, 24 on, 24 shadow. It used real framework guards, MCP execution and year middleware with synthetic repositories and mocked classifier/model responses. On selected 18 Jev templates, two existing templates and four model fallbacks; shadow selected zero Jev templates. No mutating tool executed. Its millisecond timings are **mock timings**, not provider performance. Earlier fixture snapshots are retained; four extracted guard files received an EOF-whitespace cleanup before this final run.

## Bounded live run

The owner’s “do it” authorized the proposed integration work. Before dispatch, the declared ceilings were **72 chats, 48 classifications and $0.25 combined estimates**, with no retries, one chat at a time, two-second start spacing and an immediate unknown-cost stop. Classification reserved $0.00015 per attempt within $0.0072; generation reserved $0.003 per chat within $0.2428. These are client estimates, not provider-enforced billing caps.

The [frozen live protocol](jev-full-chat-plan-20261007.json) has source fingerprint `661b987dbcbe4c6a844aaad0de8143f9b3e699c96a211bc2787d288c54a41857`. [Unpaid preflight](jev-full-chat-preflight-20261007.json) confirmed the database marker, fresh limits, selected existing OpenRouter key/model and effective off switch. The runner’s scoped-read preflight was added **after** the failure below; it was not part of that frozen run. Keep this chronology when comparing reports. The original plan is spent/stopped and now differs from final runner source; it cannot authorize a silent retry.

The [live report](jev-full-chat-run-20261007.json) dispatched **two chats and one classification attempt**, then stopped. Both chats used the same assistant-authored French student-count question. The model was GPT-OSS-120B with School’s unchanged Cerebras-preferred routing and fallback policy.

| Measured event | Off | On |
|---|---:|---:|
| First streamed text | 5,057.32 ms | 4,348.83 ms |
| Completed reply | 5,070.26 ms | 4,371.61 ms |
| Model-path preparation | 507.1 ms | 27.1 ms |
| Routing | 430.2 ms, cache miss | 17.3 ms, cache hit |
| Selected reply | Model | Model |

On sealed ordinary preparation at **21.62 ms** and cancelled the pending classification after **21.25 ms**. The attempt has no response-reported cost and retains its $0.00015 unknown reserve. The next dispatch was refused. This demonstrates prompt fallback selection and the unknown-cost stop; it does not demonstrate a Jev win. The apparent 698.65 ms completion difference is a single cold/warm pair with differing model steps, not a causal improvement or a meaningful fallback p95. The two completed replies average **4.721 seconds**, but neither answered the requested count.

Both replies hit `students_get_student_count` permission errors and returned an access-denied explanation. [Unpaid direct checks](jev-live-tool-check-20261007.json) reproduced REST 403 and MCP `FORBIDDEN` using the same fixture administrator. The guards correctly denied access. Stream completion alone does not establish a successful school-data answer. This is why final runner source requires scoped-read acceptance before paid work. No shadow reply or live Jev template was measured.

## Cost and cleanup

SDK generation estimates total **$0.000447080**; the budget rounds conservatively to $0.000447081. They do not include the cancelled classification and are not a Cerebras invoice. The immediate provider-key delta was zero. Later key reads settled at **$0.002352550 above the baseline** and remained at that value in the [settlement/cleanup evidence](jev-full-chat-settlement-cleanup-20261007.json). This shared-key increase is about 5.26 times the SDK estimate. It cannot isolate generation from cancelled classification or concurrent key traffic; the cancelled request’s terminal cost remains unknown. Do not report that request as free or attribute the full key increase to Jev.

The isolated port-3103 app was stopped; port 3102 remained running. Jev was restored off and the fixture’s saved OpenRouter key was removed and verified absent. The fixture initially had no AI settings; because the public settings API has no delete operation, a disabled, keyless fixture settings row remains. The main School database, real env file and production settings were not changed. Najm remains on the already-published source commit `1d79369`; no second framework publication was needed.

## What we can do next

1. Prepare a fixture operator with valid, narrowly scoped read permissions through the supported fixture setup/auth APIs, then pass unpaid count/class/attendance MCP checks. Preserve the tested denials instead of bypassing guards.
2. Resolve cancelled-attempt billing, or design a separately frozen experiment that retains known terminal billing without delaying ordinary readiness. Aggregate key deltas do not settle an individual attempt. Do not reset the ledger or reuse the stopped plan to spend around this block.
3. Run a fresh bounded off/on/shadow comparison after those prerequisites, distinguishing cold and cached routing. Measure successful answers, Jev wins, paired fallback regression, response-reported classification costs and provider-specific generation billing. Keep the owner-selected assistant-draft/Darija-review workflow; no extra manual native-provenance collection is introduced.
4. Keep Jev off for real questions until broader accuracy/coverage, the existing 500 ms classifier-p95 target, full-chat benefit and the 100 ms fallback-regression gate are satisfied. Current evidence supports the adapter’s failure handling, not production enablement.

The earlier 304-classifier mean/p95 of 436.8/602.5 ms remains a separate classifier-only result. It is not replaced by the 4.721-second mean of two access-denied chat replies or the mock integration timings.
