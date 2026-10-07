# Jev fixture read repair and unpaid chat acceptance — 2026-10-07

The fixture permission prerequisite is now complete. Eight scoped MCP reads passed, followed by six successful count replies in French, Arabic and Darija across 2025-2026 and 2026-2027. **No new paid classifier or model-generation request was made.** Jev remains off for real questions and production; the earlier cancelled classification still has unknown terminal cost.

## Fix

The fixture administrator's token had no permission claims. Its existing role ID, `history-role-admin`, is longer than the standard auth permission-assignment DTO's five-character constraint. School now exposes a narrowly scoped `POST /api/chat-benchmark/jev/fixture-reads` helper with the fixed body `{ "action": "prepare" }`.

The helper requires the existing admin guard, `history-admin` actor, off mode, enabled nonproduction benchmark controls, the local `school_history_test` URL and the exact database marker. It confirms the expected admin role identity and delegates to the published Najm `RoleService`/`PermissionService` validators and session invalidation. It adds only `read:students`, `read:teachers`, `read:classes` and `read:attendance`. No arbitrary target, wildcard, write permission, raw SQL mutation or MCP exposure is added. Existing unrelated grants are preserved; repeated preparation is idempotent.

[Live repair evidence](jev-fixture-read-repair-20261007.json) records all four additions, the previous token's **401**, a successful fresh login, **8/8** student-count/teacher-count/class-list/attendance MCP reads across the two years, and an idempotent repeat adding nothing. The fixture's domain data and the main School database were not changed.

## Successful replies and timing

The reproducible [unpaid checker](../../../scripts/chatbot-jev-fixture-reads.mjs) requires the marked fixture in off mode with a zero classification allowance and local embeddings. It uses the existing count questions from `morocco.json`, reads expected counts through REST in each selected year, and verifies the streamed scoped MCP arguments, tool success, count and template source. The fixture currently returns **8 students in each tested year**; identical counts alone do not establish isolation, so the selected-year tool arguments are also checked.

During this check, the saved fixture provider temporarily points at a loopback server that rejects and counts every model request. No model request reached it, and the classifier ledger stayed at zero. The previous disabled, keyless OpenRouter selection was restored afterward. Cache reset affects only this isolated fixture process.

[Release checker results](jev-unpaid-scoped-replies-release-20261007.json):

| Reply completion | Samples | Mean |
|---|---:|---:|
| All successful template replies | 6 | 117.17 ms |
| Query-embedding cache misses | 3 | 201.03 ms |
| Query-embedding cache hits | 3 | 33.31 ms |

These are local development HTTP **existing-template** timings, measured when the response stream finishes and excluding the later diagnostics lookup. They are not Jev speed, an LLM comparison, independent accuracy qualification or browser render timing. Cache state and selected-year order are recorded, rather than treated as a randomized causal comparison.

Earlier unpaid snapshots are preserved. The first check returned the correct count but failed an incorrect harness assertion expecting the literal year in the existing template text; the corrected check inspects the scoped MCP input instead. Another snapshot included diagnostics lookup in completion timing. The later corrected timing snapshot and release checker separate that lookup. No production renderer was changed to satisfy these assertions.

## Owner's daily cost screenshots

[Recorded observations](jev-owner-daily-totals-20261007.json) show **504 requests on October 7: 499 Jev and 5 GPT-OSS**, with total spend rounded to **$0.02**, Jev rounded to $0.02 and GPT-OSS rounded to $0.00. These are useful daily totals. The rounded $0.00 does not establish free GPT-OSS generation, and the cancelled classification is not individually identified or reconciled by these charts. The earlier shared-key increase and unknown-cost stop remain unchanged. No management key is required to ship this unpaid permission repair.

## Verification and cleanup

The final root test run passed **1,882 test executions** with zero failures. Lint, full workspace typecheck and the isolated-output production build passed. The live route-security inventory passed all **9** tests; concurrent-refresh acceptance passed **3/3** with a separate in-memory test cache. Its initial run hit the shared Redis login-rate limit (429); no production rate limit was weakened or Redis bucket reset to obtain the passing run. The mock transport fixture now also installs the real validation plugin and tests malformed bodies, principal/other-role denial, wrong actor, production, nonfixture URL, missing marker, on mode and idempotence.

The first root run correctly caught the newly added route missing from the guard inventory expectation. The inventory now includes it and verifies the stricter admin-only guard. These harness corrections and failed attempts are retained in the verification ledger.

The isolated fixture app was stopped after checks. The main app on port 3102 remains running. The fixture retains the four read grants and its disabled, keyless settings; no real env file or production setting was edited. Najm package pins and the already-published framework source are unchanged.

## Next work

Keep the existing template path: this small fixture check demonstrates successful answers without classifier/model charges. Before another paid Jev comparison, obtain request-level cancellation billing or design a separately frozen experiment with auditable terminal costs that preserves immediate fallback. The stopped experiment must not be resumed by treating unknown billing as zero or resetting its ledger. A future comparison still needs successful answers, Jev readiness wins, useful coverage and the existing accuracy/latency gates; the present fix does not qualify real-question enablement.
