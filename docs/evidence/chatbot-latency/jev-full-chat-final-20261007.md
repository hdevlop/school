# Jev full-chat benchmark — 2026-10-07

The bounded local comparison is finished: **72 chats dispatched, 71 without transport/tool failures, one retained permission failure, no retries**. Jev produced **one of 24 on-mode replies**. Keep Jev **off for real questions and production**: this run does not establish a repeatable latency benefit or meet the fallback-regression gate.

## Reply timing

These are API submit-to-stream measurements against the marked local history fixture, using GPT-OSS-120B and School's existing provider preferences. Browser rendering and production performance were not measured.

| Mode | Attempted / without tool failure | Mean first text | Mean completion | Completion p95 | Jev replies |
|---|---:|---:|---:|---:|---:|
| Off | 24 / 24 | 983 ms | 1,010 ms | 1,745 ms | 0 |
| On | 24 / 23 | 850 ms | 868 ms | 1,636 ms | 1 |
| Shadow | 24 / 24 | 881 ms | 904 ms | 1,457 ms | 0 |

Across the 71 replies without tool failures, completion averages **928 ms**, with **1,745 ms p95**. This is descriptive: model variation, cold/cached routing, and the restarted continuation prevent attributing the lower on-mode mean to Jev. Shadow also appears faster despite never selecting Jev.

The sole Jev win was Arabic class listing: **500 ms completed**, using the existing authorized year-scoped class tool. Its candidate became ready at about 292 ms; ordinary embedding work took about 351 ms. Most other ordinary preparations were ready before Jev. Classification confidence can be correct while arriving too late to help.

There are **20 matched model-fallback pairs**. Their completion-difference p95 is **+619 ms**, above the proposed +100 ms gate. These single-pair cold/warm measurements do not isolate scheduling overhead, but they cannot justify declaring that gate passed. The readiness-race tests verify immediate selection; that is separate from observed end-to-end provider timing.

## Answers and retained failures

Count replies consistently reported eight students and zero teachers in the selected fixture year. Class replies listed the fixture's History 2026-2027/A/B structure; attendance replies said no records were available. All nine write-request replies refused changes, and no mutating tool executed. **43 of 44 terminal classifier choices** matched the assistant's provisional labels. `ary-attendance/shadow` was incorrectly classified as a write request at 0.61 confidence; it was declined, and ordinary attendance answered correctly. The sole accepted Jev template had the correct provisional label. This is same-corpus agreement, not independent accuracy qualification.

The original run stopped after request 58, `ary-classes/on`, because the model selected `sections_get_sections` and the fixture lacked `read:sections`. Its streamed access-denied explanation remains a failed reply. The fixed, admin-only fixture setup now grants that read permission through Najm's permission service; the runner preflights sections as well as counts/classes/attendance.

Only the **14 never-dispatched jobs** were continued. The failed request was never retried. The new process carried the consumed request slots and known spending forward; it did not receive another 72-request/$0.25 allowance. Its fresh caches and repaired permission mean the two segments are explicitly identified in the evidence.

Stream/tool success is not a language-quality score. Review also found Chinese text in `ar-greeting/shadow`, an ETX control character and awkward Darija in `ary-greeting/on`, and unsupported wording about girls in CE2 in `fr-filter/off`. Those model-path defects remain recorded. Jev did not resolve them. Darija naturalness still follows the owner's existing wording-review workflow; no new provenance forms are required.

## Cost, controls and cleanup

Cost is recorded alongside latency, with no further billing investigation blocking completion. The 44 classifier response costs total **$0.001723764**, with zero unknown classifier costs. SDK generation estimates total **$0.010690680**. The later shared-key increase is **$0.087088592**; it includes unattributed key traffic and is not an isolated invoice or a per-mode cost comparison. None of these figures settles the earlier, separately cancelled request.

The synthetic observer can finish a started classifier request under a separate five-second transport deadline after ordinary readiness wins. Billing waiting occurs outside reply timing; late classification cannot replace the reply or execute a read. Default behavior remains cancellation, and production/real-question eligibility remains off.

The earlier observer plan/preflight are retained as unexecuted preparation snapshots; v2 is the executed original plan. A final offline validation hardening additionally rejects missing/nonfinite generation estimates in continuation reports. That runner-only change happened after the paid continuation and did not alter any measured replies; spent frozen plans cannot be rerun against the changed source.

Mode is restored off, no classifier work remains pending, the fixture's saved key is verified absent, its AI settings are disabled, and port 3103 is stopped. The existing port-3102 app, primary School database and real env file were untouched. Najm remains on published `najm-chatbot@3.4.0`; no additional framework release was needed.

## Verification and what we can do next

The ten root test groups pass **1,893 test executions**, with zero failures in the final group results. Two subprocess tests timed out while the initial root run competed with lint/typecheck; the complete boundary group rerun passed 530 tests with unchanged assertions and default timeouts. Lint and full workspace typecheck pass. The production build passes using a separate Next output directory. The final continuation-cost validation also passes its focused tests and ESLint. No database migration/reset ran.

The next useful change is to expand narrowly guarded deterministic templates for the tested count/class/attendance paraphrases and greetings. That removes the classification race for clear questions and avoids the model's greeting defects. Keep filtered, arithmetic and ambiguous questions on their guarded fallback; improve their answer handling separately. Verify these templates unpaid, then compare a deliberately selected uncovered corpus if another Jev experiment is warranted. Do not enable Jev based on this run's average alone.

## Evidence

- [Final recomputed summary and answer findings](jev-full-chat-final-20261007.json).
- [Original frozen plan](jev-billing-observer-plan-v2-20261007.json) and [58-request raw report](jev-billing-observer-run-20261007.json). The original raw summary counted stream completion before excluding tool failures; the final summary corrects that without altering the raw evidence.
- [Frozen continuation](jev-billing-observer-continuation-plan-20261007.json) and [14-request raw report](jev-billing-observer-continuation-run-20261007.json).
- [Credential/mode cleanup verification](jev-billing-observer-cleanup-20261007.json).
- [Unpaid observer mock integration](jev-billing-observer-fixture-v2-20261007.json): 72 chats, mocked classifier/model, not live timing.
