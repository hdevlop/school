# Jev guard v4 coverage repair — 7 October 2026

The stricter offline guard now preserves every v3-accepted choice in the four saved studies while blocking every injected wrong-read check in the three corpora tested. This resolves the previously reported coverage regression on those development cases. It does not establish live accuracy or enable Jev.

## What changed

Restored ordinary French request words, greeting expressions, Darija spelling variants, Arabic conjunction/preposition forms and count/attendance synonyms. A missing count cue for `majmou3` and attendance cues for `assiduité`/`مواظبة` caused valid requests to fall through even when all words were recognized; those are corrected.

Closed terminal clauses such as “without a breakdown by class” are handled explicitly. A following named class, subject or operation prevents that exclusion from being removed. Collecting both totals with `jm3` requires the explicit “each separately” phrase. Unknown words, arbitrary names, quoted text, qualifiers and operations still decline. The offline diagnostic now exposes which unknown tokens caused a decline; production diagnostics must remain payload-free.

The broader fault matrix also found an ambiguity: “le total des inscrits et celui des enseignants” could pass as a teacher-only count because `inscrits` did not trigger v3's student-subject check. v4 rejects that ambiguous teacher-only decision. It does not invent a corrected classifier choice; a declined decision retains fallback.

## Saved decision replay

| Saved study | v3 accepted attempts | Earlier v4 prototype | Repaired v4 | Additional correct declines |
| --- | --- | --- | --- | --- |
| Latest 100-case regression | 33 | 33 | 33 | 0 |
| Core exploration | 145 | 116 | 145 | 0 |
| Draft96, wording v3 | 53 | 12 | 53 | 0 |
| Draft96, wording v4 | 53 | 12 | 53 | 0 |

All **284 previously accepted attempts** remain accepted, with zero accepted provisional-label disagreements in these current projections. Core repetitions count as attempts, not distinct independent questions. Every preserved decision was reparsed before replay; original choices, probabilities, costs, timings, labels and raw reports were retained. [Verified replay and fault evidence](jev-guard4-coverage-release-20261007.json).

## Injected-fault checks

| Synthetic corpus | Eligible questions under assumed admin first-turn context | Wrong case/choice checks | Wrong reads still allowed |
| --- | --- | --- | --- |
| New 304-question stress batch | 228 | 1,290 | 0 |
| Moroccan development960 | 902 | 4,813 | 0 |
| Core104 | 92 | 501 | 0 |

These **6,604 checks** force wrong choices at confidence 0.99 and write probability zero. They are artificial failure scenarios, not provider predictions, independent observations or an estimate of model error frequency. The development corpora overlap in themes and variants, and assistant labels remain provisional. The repairs were tuned against these questions and the saved results; no new held-out generalization claim is made. A finite lexical guard cannot prove semantic correctness for arbitrary text.

The 14 virtual readiness scenarios still add zero simulated fallback delay. Against assumed routing readiness at 250 ms, no classifier candidate wins; at 500 ms, 16 win; at 800 ms, 33 win. These remain hypothetical preparation selections using earlier durations, not real full-chat timing or model-call savings. The latest measured classifier average/p95 is still **511.4/729.7 ms**; this work made no new classification calls.

## Benchmark runner support

The real probe now accepts `--query-guard-version=4`. It records a separate v4 semantic projection without modifying raw classifier decisions, and freezes the v4/v3/v2/v1 guard sources for continuations. Changing the guard mode or any of those frozen sources invalidates continuation. Defaults and v3 behavior remain available; model request wording, transport selection, cost reservation/unknown-cost stopping and wording-review validation are unchanged.

Offline validation succeeds for the 304-case corpus with guard4. Mocked CLI tests verify guard selection/reporting and source hashes; pending wording still blocks dispatch before any fetch. No actual paid run was dispatched.

## What we can do next

The [updated concrete classification proposal](jev-stress304-guard4-proposal-20261007.json) selects guard4 for one pass of at most **304 requests / $0.05 client spending stop**, with $0.00015 reserved before each request, no retries and unchanged v3 request wording. It supersedes the earlier unrun guard3 proposal and is not a second allowance. It remains pending actual new-batch wording feedback and explicit spending authorization. No prior approval was transferred or fabricated.

That study can measure new raw Jev responses and compare v3/v4 projections on the same answers without extra requests. Because guard4 was developed on this corpus, report its guarded results as development stress evidence. The 61 linked groups still cannot satisfy the 150-family qualification gate.

The guard coverage repair is complete for the saved regressions. Runtime adoption still needs the [published async preparation contract](../../architecture/jev-async-reply-contract.md), exact package pinning and a paired full-chat check. School's installed `najm-chatbot` 3.3.0 exposes only the synchronous hook. Jev remains off; no Desktop reference source, production module, app settings or package pins were changed.

A public [npm latest-metadata check](https://registry.npmjs.org/najm-chatbot/latest)
also reported 3.3.0. This metadata GET made no classifier request and confirms that
the needed async release was not available through the latest tag at the time checked.

Verification: focused guard/readiness/continuation/CLI tests passed; the complete script suite and repository lint passed. The verification artifact records exact test totals and source/input hashes. Production build was not rerun because only offline scripts, tests and documentation changed.
