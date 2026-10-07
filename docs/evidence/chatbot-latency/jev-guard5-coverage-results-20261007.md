# Jev guard coverage follow-up — 7 October 2026

The new **offline guard5 candidate restores all 19 extra guard4 fallbacks** in the completed 304-case development run. Projected accepted choices rise from 88 to 107 with zero accepted provisional-label disagreements. The measured guard4 code, raw decisions, labels, latency and costs remain unchanged. This step made no paid classifier or School tool calls; Jev remains off.

## Implemented repair

[Guard5](../../../scripts/chatbot-jev-query-guard-v5.mjs) applies bounded phrase aliases before the existing closed guard4 vocabulary check. Examples include “the whole school,” “without details,” “two separate numbers,” “each on a line,” “without other information,” and “thanks for your help” in their specific Arabic/Darija/Arabizi/French forms.

It checks the original query against guard3 before applying an alias. Actual arithmetic, named filters and explicit writes therefore keep their original veto. Exclusions are matched as complete terminal clauses; an appended class, subject, name or operation prevents the alias. Quoted/structured text is not transformed. In particular, adding “do not combine the two numbers” cannot rescue an earlier request to compute their sum. A bare word such as `Ster` is not converted into a generic line cue.

The aliases are internal to guard evaluation. Model requests, stored queries, names, IDs and tool inputs are not rewritten. Guard4 stays frozen as the implementation used for the live benchmark. Guard5 is not an installed School callback or a supported paid-probe mode.

## Replay results

[Replay evidence](jev-guard5-coverage-replay-20261007.json) reparses saved provider decisions and checks source/input hashes before projecting the candidate.

| Saved study | Guard4 accepted attempts | Guard5 accepted attempts | Accepted label disagreements |
| --- | --- | --- | --- |
| New development304 | 88 | 107 | 0 |
| Previous regression100 | 33 | 33 | 0 |
| Core exploration | 145 | 145 | 0 |
| Draft96, wording v3 | 53 | 53 | 0 |
| Draft96, wording v4 | 53 | 53 | 0 |

No older correct accepted choice is lost. The 107 projected choices in development304 comprise 64 read/small-talk candidates and 43 refusal candidates. Together with 59 baseline refusals, the hypothetical selection count is 166/304. These are not actual readiness wins, replies executed or model calls saved.

The four additional correct declines already shared by guard3 and guard4 remain conservative fallbacks; this repair addresses the 19 extra guard4 declines. The 17 language abstentions also remain unchanged.

The complete injected-fault matrices remain closed: **1,290 wrong-read checks in stress304, 4,813 in development960 and 501 in core104 — 6,604 total, with zero unblocked wrong reads**. These are correlated synthetic failure scenarios, not model predictions or a precision confidence bound. Tests also exercise appended qualifiers, contradictory arithmetic, quotes, unknown names and invalid numeric decision ranges.

Guard5 was tuned on these saved cases and assistant labels. Wording review remains pending. Its improved result is post-result development evidence, not independent held-out qualification or proof of semantic correctness for arbitrary input.

## What we can do next

The 19-fallback repair is complete. The next application step requires the [published async preparation contract](../../architecture/jev-async-reply-contract.md), then exact package pinning and a paired full-chat benchmark. The current package exposes only a synchronous hook and evaluates templates after routing/context preparation; a Promise cast in School would not implement the readiness race. No Desktop reference source or production module was changed.

The 17 language abstentions can be studied separately without new API spending, but they remain safe fallbacks in the measured profile. The 150-case/150-family qualification gate and classifier p95 target are still unmet. The live classifier figures remain **437 ms average / 602 ms p95 / $0.01194 total for 304 requests**; guard5 did not generate a new latency or price measurement. All those classification slots remain consumed.

Verification: focused tests passed, including all 19 restored cases, the three fault matrices and protected negative cases. Repository script-suite and lint results, unchanged measured-source hashes and preserved raw-input hashes are recorded in [the verification artifact](jev-guard5-coverage-verification-20261007.json). No production build was needed for new offline scripts/tests/docs.
