# Corrected exam recheck — 2026-10-04

All ten paid requests completed with verified fresh caches and correlated
diagnostics. Original automatic checks: **9/10**, no wrong-language result,
one inconclusive Arabic-language flag (`upcoming-exams-ar#1`). The scorer and
all queries/checks are unchanged; original failures are retained.

Direct agent review of all ten retained replies against
`reply-fixes-facts-20261004.json`: every reply lists exactly the first five real
exams, in order, with correct dates, start/end times, class and section. No
invented total or remaining count. The French statement that other exams run
until 2 November matches the last returned exam date. Titles/subjects match
stored values or their straightforward translations. Review by the coding
agent is not independent native-speaker acceptance.

The inconclusive reply uses Arabic wording and English stored titles. Its
Arabic-character share falls into the detector's inconclusive mixed-script
range; it is not an English-language reply. Four replies omit the optional
offer to show more (English repetition 2, Arabic repetition 1, both Spanish
repetitions); all label the displayed list as the next/closest five. This
format limitation remains documented rather than being declared a perfect
prompt compliance result. No factual regression was found in this recheck.

| Exam measure (ten samples each) | Original baseline | Corrected prompt |
|---|---:|---:|
| Completion p50 / maximum | 27.273 / 32.840 s | 15.128 / 29.816 s |
| First text p50 / maximum | 9.383 / 11.696 s | 11.294 / 19.837 s |
| Reported completion tokens | 6,234 | 6,068 |

Median completion improved 44.5%; first-text waiting did not improve. This
is sequential development-API evidence with uncontrolled provider routing,
queueing and prompt cache. It does not prove a causal gain or production SLA.
Pricing estimates: $0.003727 for ten requests, all usage priced. Proposed
latency gates and all-automatic-checks acceptance still fail. Proceed to the
requested candidate comparison as an evaluation, without adopting a model.

An initial recheck startup attempt sent zero paid requests and hit duplicate
transaction decorator metadata after dev hot reload. Restarting only the
isolated benchmark process resolved it; no framework source was changed.
The blocked attempt is retained in `reply-fixes-exam-recheck-blocked-20261004.json`.

Evidence: [raw recheck](reply-fixes-exam10-20261004.json),
[operating limits](reply-fixes-exam-recheck-plan-20261004.md).
