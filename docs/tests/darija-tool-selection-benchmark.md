# Darija tool-selection comparison

Owner direction, 2026-10-08: prioritize correct tool selection. An average complete
response below two seconds is sufficient; do not optimize millisecond differences
or repeat French evaluation for this comparison.

## Scope and scoring

Use the existing [100 reviewed questions](../../datasets/chatbot-latency/jev-operator-darija-review.json):
50 Darija questions in Arabic script and 50 in Arabizi, representing 50 linked
families. Preserve spelling and code switching. Wording was reviewed by the owner;
intent labels remain assistant-authored. This is a regression comparison, not new
independent native evidence. Report both scripts separately and count each family
once in family-level results. No additional writing or reviewer paperwork is needed.

Compare these paths with the same actor, year, fixture, question and fallback
model/provider:

| Path | Selection and execution | Status |
|---|---|---|
| Existing router | Router shortlist, then LLM tool calls | Implemented |
| Jev first | Supported validated action, otherwise existing router and LLM | Fixture experiment implemented |
| Router then Jev | Router shortlist, then Jev action; LLM if unsupported | Published in Najm 3.6.0; fixture comparison complete |

Parallel Jev from the previous experiment is a different path. Do not rename its
results as router-then-Jev. Keep 120B as a separate reference; use the same 20B
fallback on the three paths to compare selectors without changing models.

Evaluate the shortlist and the executed plan separately. A shortlist containing
the right tool does not prove the correct call was made. For each question record:

- The required tool or semantically equivalent tools, with required lookup
  dependencies and ordering. Record extra tools separately.
- Arguments: resolved IDs rather than names; retained class/gender/date filters;
  correct year and actor scope. Missing argument evidence is unverified.
- Correct action or refusal. A write request must not become a read; ambiguous
  requests and follow-ups should clarify rather than invent a target.
- Final result against fixture data. No tool exception does not prove correctness;
  no tool calls on a data question do not count as success.
- Jev direct coverage, declined requests, wrong accepted actions and successful
  fallbacks. Keep unsupported complex questions in the denominator.

Freeze expected tool plans before new dispatch. The nine current Jev intent
labels alone are insufficient for filtered, named, payment and grade questions;
those cases need a specific tool/argument expectation or an explicit clarification
expectation. Do not score `needs_llm` as a correct final answer by itself.

Report correctness first, then observed cost and direct-answer coverage. Require
zero accepted wrong Jev actions and zero unauthorized or unintended writes before
considering enablement; compare the complete path's correctness with the existing
router baseline. This comparison does not itself enable real-user Jev.

## Time and budget

Show average POST-to-stream-close time in seconds. Under two seconds passes the
owner's time criterion; faster passing paths get no correctness advantage. Include
all completed replies, even those with semantic/tool errors, and report failed or
missing streams separately. A run with missing streams cannot claim an unconditional
time pass. Keep timeouts and cancellation to bound work; do not remove them.

This criterion replaces the +100 ms fallback regression and classifier p95 timing
gates as decision criteria for this owner-directed comparison. Preserve historical
reports and their original pass/fail outcomes. Other safety, permissions and evidence
requirements remain. The monthly target remains $10; keep observed costs visible
without making fine-grained billing work the focus.

The fresh bounded three-path run is complete: 300 chats, no repeated jobs, fixture
cleaned up. Historical request allowances are consumed and must not be replayed.
Any quality-fix rerun needs a fresh reduced scope and frozen allowance.

## Completed comparison

The [three-path report](../evidence/chatbot-latency/darija-selection-results-20261008.md)
records 57/100 tool checks for the existing router, 66/100 for Jev-first and 59/100
for router-then-Jev. Mean complete responses are 1.28, 1.06 and 1.68 seconds;
all meet the owner's time criterion. All 57 selected Jev replies pass recorded
tool checks with no frozen-label disagreement. Full answer accuracy remains
unqualified, especially clarification and nonempty filters. Jev-first with the
existing router as fallback is the development recommendation; production
defaults remain unchanged. The report names concrete quality fixes to do next.

The [fresh router + 20B repeat](../evidence/chatbot-latency/darija-router20-repeat-results-20261008.md)
adds 100 completed chats with Jev off and zero classifier allowance: 58/100 tool
checks, 38/50 Arabic script, 20/50 Arabizi and 1.13 seconds mean. Forty-one
questions fail both router runs; 97/100 check outcomes agree. Saved Jev-first
remains 66/100. Processes/order differ; this is not a controlled new Jev effect.
The quality-fix recommendation is unchanged.

## 120B tool-only follow-up, owner direction

For the [100-chat 120B check](../evidence/chatbot-latency/darija-router120-check-results-20261008.md),
timing is observational only: no two-second cutoff or average-time pass/fail gate.
Jev is off. Actual model-visible tool names are captured, separating required tools
absent from the offered set from failed plans when those tools are available.

The original check scores 61/100. A secondary audit accepting the shared academic
KPI count source consistently across all saved runs scores 120B 71/100, versus
20B repeat 58/100 and saved Jev-first 66/100. Frozen scores are retained. Of 29
remaining 120B failures, 23 lack a required offered tool and six fail with the
needed tools offered. Improve availability/dependencies and planning before a
fresh small 20B quality rerun. This is not a production-enablement decision.

## Earlier saved-call evidence

The [Darija-only reanalysis](../evidence/chatbot-latency/darija-selection-reanalysis-20261008.md)
uses saved calls only. It separates required-tool observations from unverified
arguments and highlights missing class discovery. It does not measure the proposed
third path or establish full tool-selection accuracy.
