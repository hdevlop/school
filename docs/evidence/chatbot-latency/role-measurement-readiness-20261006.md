# Role benchmark measurement readiness — 2026-10-06

The parent/teacher/student and admin follow-up runner previously had only a
request-count limit and combined both follow-up turns into one duration. It now
requires explicit request and client-estimate allowances, a per-request reserve
and dated declared OpenRouter model rates before authentication or chats.

Each dispatch reserves first. Correlated usage is priced with the declared
rates while SDK estimates remain separate. Unknown usage retains its reserve
and stops further dispatch; failed requests retain any measurable known cost.
The selected provider/model must remain unchanged, enabled and priced.

Every turn has a unique request ID and its own payload-free measurement record.
Diagnostics use admin authentication, match both chat and embedding correlation,
and must have complete embedding capture. Missing, malformed, partial or
mismatched capture stops the run. Chat durations exclude diagnostic polling;
follow-up results retain their combined duration alongside separate turn records.
Streams require both finish and DONE events.

The runner checkpoints reports after attempts/results, preserves earlier output
files and shares the local benchmark lock. Default reports omit fixture
identities, query/reply text, tool arguments/outputs and authentication tokens.
`--keep-text` is explicitly private evidence. The runner never changes settings
or resets caches. Stopped reports are incomplete, even when completed cases pass.

Verification:

- **17 focused tests, 127 assertions**, including a real CLI subprocess with
  every fetch replaced. Its mock completes ten cases/twelve turns, verifies
  separate follow-up IDs and admin-only diagnostic retrieval, and checks
  unknown costs, mismatched diagnostics, HTTP failure, pre-dispatch model drift,
  missing budgets, repeated options and refusal to overwrite an output.
- Helper tests cover transport failure, malformed/partial embedding capture,
  retained known failure costs, pending diagnostics and finish/DONE validation.
- **322 script tests passed, 0 failed, 1,438 assertions**; workspace boundaries
  passed for 1,275 files and 288 client entries. Lint and task-file whitespace
  checks passed.
- **Zero real authentication, provider, billing-ledger, School tool or database
  calls.** Mock fixtures, prices, records and responses are synthetic, not live
  acceptance evidence. Temporary files were removed.

[Machine-readable verification](role-measurement-verification-20261006.json)
records checks and source hashes. The [runner workflow](../../tests/chatbot-latency.md)
documents a future separately budgeted run; this change grants no paid allowance.

Live role login, ownership, language, billing and diagnostic completeness remain
unverified on the current configuration. Declared token costs are client
estimates, not invoices or provider-enforced ceilings. Captured diagnostics do
not establish deployment configuration or per-generation hosting. Application
caches and provider residency remain uncontrolled. Interrupted processes need
separate accounting before another run; automatic resume is unsupported.

School runtime configuration and published package pins are unchanged by this
work. Jev remains off, with native questions/review and its accuracy gate pending.
