# Moroccan Arabic register review — 2026-10-04

The default benchmark now contains all ten scenarios in Darija, formal Arabic
and French (30 cases). The saved model remains GPT-OSS 120B. Exam and class
fixtures use frozen internal school facts; exact stored names are exempt from
language checks, while surrounding prose is checked.

The register scorer previously detected formal Arabic replies to Darija queries
but accepted Darija replies to formal Arabic queries. It now checks both
directions. Distinctive Moroccan expressions such as `ديال`, `كاين`, `بغيتي`,
`هاد` and `نقدرش` flag a formal Arabic mismatch. Shared words such as `نقدر`
or `عندنا` alone do not. The prompt adds parallel formal Arabic and French
examples and explicitly distinguishes `كم عدد` / `اعرض` / `سجل غياب` from
`شحال` / `وريني` / `ديال` / `سجل بلي`.

An offline audit of retained replies found nine register failures in the initial
60-request report (eight formal Arabic questions answered partly in Darija and
one Darija question answered in formal Arabic). The first 30-request recheck
contains six formal Arabic replies with Darija expressions. Structured exam and
class facts pass this offline audit. The original reports and scores are
unchanged; [audit JSON](morocco-register-audit-20261004.json) records source and
corpus hashes and the affected samples.

The subsequent 30-request multi-count recheck completed every reply. Its raw
score is 22/30. Two register flags were detector gaps for the genuine Darija
negations `كاينش` and `نقدرش`; both are now covered by regression tests. With
those corrected and the original non-text checks retained, the offline score is
24/30. Six genuine failures remain: French count questions answered in Arabic
(two), an Arabic class question answered in Darija, Darija multi-count and
announcement questions answered in formal Arabic (two), and a Darija exam reply
listing 12 exams instead of the requested next five. The exam flag is excessive
rows, not proof that their underlying schedule facts are invented.

This latest run has completion p50/p95 11.847/33.433 seconds, first-text p50/p95
9.208/28.215 seconds, and embedding median 0.247 seconds. All 30 traces and fresh
application-cache conditions were verified. There are no write promises or false
write claims. These measurements do not support an overall speed or quality
improvement; changing provider conditions and prompt revisions prevent attributing
the slowdown to any single edit. Faster-route acceptance remains blocked on
quality.

The offline review retains the original tool, argument and write checks rather
than recomputing them: private tool arguments were omitted from saved samples.
The first recheck also contains an empty Darija multi-count response. A later
passing reply cannot erase that failure. Register heuristics do not prove native
fluency.

Verification: the focused suite passed 90 tests before the two-negation regression
was added; the updated language/regression subset passes 35 tests. All 20 backend
chat tests, `bun run lint` and `bun run build` pass. The
build used `.next-morocco-register-verify` to avoid changing development output.
No additional paid provider calls were sent by this review session.
Two read-only preflights encountered a development HTTP 500 during concurrent
server/source changes; they are not chatbot latency samples.

The current-model recheck must pass the stronger register checks before a faster
route can be accepted. Keep GPT-OSS and preserve all failures in the report.
