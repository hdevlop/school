# Jev guard fault checks and readiness replay — 7 October 2026

Later update: the [coverage repair report](jev-guard4-coverage-results-20261007.md)
records the resolved coverage loss and new probe support. The measurements below
describe the earlier prototype and remain preserved as experiment history.

This step found a weakness in the optional semantic guard, added a stricter **offline candidate**, and tested readiness without API spending. Jev remains off. No published package, production source/configuration, questions, labels, old raw classifier reports or request allowances changed.

## Guard fault injection

The new study takes the 228 classifier-eligible questions from the prepared 304-case stress corpus and deliberately assigns every wrong core read/small-talk choice a confidence of 0.99 and write probability of zero. There are 1,290 such case/choice pairs. These decisions are injected faults, not Jev predictions; their counts are not model accuracy or estimated risk rates.

| Guard | Injected wrong pairs vetoed | Wrong pairs still allowed | Write questions with an allowed wrong read |
| --- | --- | --- | --- |
| Existing optional v3 | 1,063 / 1,290 | 227 | 53 |
| New optional v4 candidate | 1,290 / 1,290 | 0 | 0 |

v3 often lets an unrelated request pass as `class_list` or `small_talk` because it checks exclusions without requiring positive evidence for those choices. v4 retains v3, requires a positive subject/count/attendance cue for the relevant reply and declines text outside a closed reply vocabulary. It supports Arabic conjunctions without dropping other unknown words. The candidate is [implemented here](../../../scripts/chatbot-jev-query-guard-v4.mjs), but is not wired to the application or the paid probe. A finite vocabulary and this fault matrix cannot prove semantic correctness for arbitrary new text.

## Coverage tradeoff on preserved decisions

Saved decisions were reparsed before projection. Eligibility uses the current language/refusal profile. The same raw choices, probabilities, durations and labels are preserved.

| Previously measured dataset | v3 accepted attempts | v4 accepted attempts | Correct attempts additionally declined |
| --- | --- | --- | --- |
| Latest 100-case regression | 33 | 33 | 0 |
| Core exploration, 312 attempts | 145 | 116 | 29 |
| Draft96, wording v3 | 53 | 12 | 41 |
| Draft96, wording v4 | 53 | 12 | 41 |

None of these current candidate projections has an accepted provisional-label disagreement. Repetitions remain attempts, not distinct questions. **v4 is not adopted:** keeping the latest 33 choices does not compensate for its substantial older-dataset coverage loss. The prototype's initial and refined studies are retained rather than overwritten; the final result is [here](jev-offline-guard4-verified-study-20261007.json). The first prototype lost more coverage; two ordinary French words were also missing in focused positive tests and were corrected before the final replay.

Guard4 was developed against this 304-question fault matrix and previously seen saved corpora. The 304 wording is still pending operator review, and its labels remain assistant-provisional. Its later classifier observations could be new, but guard4 performance on it is development evidence, not an untouched pipeline test. Its existing lexical-freshness record is historical and does not establish a new held-out qualification.

## Virtual readiness replay

For each of the 100 previously measured attempts, replay the recorded classifier duration through the existing executable readiness selector while assuming a fixed routing-ready time. Both v3 and final v4 produce the following preparation selections. The synchronous 18 write refusals are assumed selected at zero preparation time, with no classifier started; this is not their real answer-rendering latency.

| Assumed routing ready | Earlier guarded candidate wins | Model fallbacks | Extra fallback waiting |
| --- | --- | --- | --- |
| 0 / 50 / 100 / 250 ms | 0 | 82 | 0 ms |
| 500 ms | 16 | 66 | 0 ms |
| 800 / 1,200 ms | 33 | 49 | 0 ms |

All 14 replay scenarios (seven times, two guards) add zero virtual fallback delay. Failed attempts and late completions remain fallbacks; ties go to routing. Candidate deadline is 800 ms. The replay uses placeholders and an artificial clock, so it measures neither tool execution, actual cancellation billing nor first/final chat text. Classifier times came from an earlier serial probe with a ten-second request timeout, and the assumed routing times were not observed or paired with those calls. This is a contract check and a sensitivity analysis, not a speedup claim.

**Practical implication:** Jev's approximate half-second classifier time alone says little about whether it helps. Fast cached routing could win every race while Jev still starts requests. Before adoption, pair classifier readiness with actual fallback preparation timing and terminal cost accounting.

## Integration review and next work

School and the Desktop source both declare `najm-chatbot` 3.3.0. Its reply-template callback is synchronous, and source inspection shows it is invoked after routing/context preparation. The offline contract's early synchronous selection and async race are therefore not current application behavior. An async callback or cast in School would not implement the intended race.

The [concrete framework handoff](../../architecture/jev-async-reply-contract.md) now specifies selection order, authoritative eligibility, the single scoped executor, cancellation/cost handling, session/stream consistency and package acceptance tests. It is a proposal, not code pretending to expose a current package API. The Desktop checkout is a read-only reference under the [Najm skill](../../../.agents/skills/najm/SKILL.md), which says “Local source (read-only reference)” and permits School upgrades through published root pins. No Desktop source was changed or consumed locally.

Next, resolve the candidate's coverage loss using development cases and then freeze a separate evaluation. The existing 304-request/$0.05 classification proposal is still pending and remains classification-only with v3; neither this study nor “continue” is recorded as completion of the new wording review. A future paid report can compare v4 offline against the same raw decisions without extra requests. Do not claim v4 is already a supported `--query-guard-version` mode in the probe.

Runtime integration requires implementing and publishing the package contract, then pinning that compatible version in School and measuring full-chat on/off behavior. The authored stress corpus cannot meet the separate 150-family qualification gate. These remaining conditions are explicit; more request volume does not replace the missing package hook or actual paired latency evidence.

Verification: 82 focused tests passed, 370 assertions, covering v3, readiness and new guard/replay checks. The initial focused run caught the missing French vocabulary; final replay and focused tests were rerun after the fix. Repository lint passed. No production build was needed for new offline scripts/docs. No API calls, School tool calls or real-data operations were performed.
