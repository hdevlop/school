# Prepared Jev development probe

The [frozen plan](../evidence/chatbot-latency/jev-draft-probe96-plan-20261006.json)
selects [96 synthetic questions](../../datasets/chatbot-latency/jev-moroccan-probe96-dev-20261006.json)
from the assistant draft: 24 linked families, four styles per family, all split
`dev`. Text, labels, IDs, family relationships and assistant provenance are kept;
only the exploratory corpus's split changes from `test` to `dev`. This subset
is derived from an already registered seen corpus and grants no fresh/native
acceptance. It is not a full 960-question study.

Coverage includes greetings, school-wide student/teacher/both counts, explicit
exclusion of names/lists, class lists, today's attendance, core-excluded exams,
writes, filtered counts, teacher-name lists, a follow-up and the corrected
context-free French totals case. Each style has only two write scenarios; this
small development subset does not satisfy the broader write/native coverage gate.

Offline validation and continuation preflight pass. The intended run freezes
Jev 1.13, wording v3, threshold 0.8, core acceptance, one repetition, 96 requests,
a $0.02 client budget, $0.00015 reservation per request, two-second minimum
dispatch spacing and ten-second timeout. Unknown cost retains its reservation
and stops, and HTTP 429 stops without retry. These estimates are not a hard
provider billing cap. Provider-reported request costs and key-ledger changes
must remain separate, especially if the key has other traffic.

The catalog lists $0.042 per million input tokens and zero completion pricing
for Jev 1.13 ([dated endpoint source](https://openrouter.ai/api/v1/models/typesafe/jev-1.13/endpoints),
checked 2026-10-06). Actual input lengths and billable costs are unmeasured for
this subset. Verify the current provider key limit and sufficient remaining
allowance before dispatch; no current limit or key identity is claimed here.

Execution is now complete: [results and limits](../evidence/chatbot-latency/jev-draft-probe96-results-20261006.md).
All 96 requests returned valid decisions/costs; mean classifier time was 288.8 ms,
and reported cost totaled $0.003764334. The 57 language-eligible accepted choices
match provisional labels at frozen 0.8/core, with no native acceptance or Jev
enablement. The stage's 96-request allowance is consumed.

Initial preparation paused after automatic approval review rejected a temporary
key-precheck command as “blocked by policy,” without a more specific reason.
That command did not execute. Following user confirmation, the existing runner's
new metadata-only `--key-precheck` verified sufficient key limits, with no question
sent. The rejection and original pending plan remain historical evidence.

Offline validation:

```powershell
bun scripts/chatbot-jev-probe.mjs --cases=datasets/chatbot-latency/jev-moroccan-probe96-dev-20261006.json --acceptance-policy=core --validate
```

The completed command was (preserve the existing output; do not rerun this stage):

```powershell
bun --env-file=apps/dashboard/.env.local scripts/chatbot-jev-probe.mjs `
  --cases=datasets/chatbot-latency/jev-moroccan-probe96-dev-20261006.json `
  --acceptance-policy=core --split=dev --gate-threshold=0.8 --repetitions=1 `
  --max-requests=96 --budget-usd=0.02 --request-reserve-usd=0.00015 `
  --interval-ms=2000 --timeout-ms=10000 `
  --output=docs/evidence/chatbot-latency/jev-draft-probe96-run-20261006.json
```

Report fixed-threshold classifier choices, actual language/regex eligibility,
errors, known costs and retained reservations. Replay the prototype count veto
separately, including correct-label losses. Dev threshold suggestions are
exploratory only; they do not replace the frozen 0.8 rule. Model classification
does not measure rendered-answer correctness or end-to-end chat speed. Human
authorship/review and the published async hook remain prerequisites for native
acceptance and integration, and Jev stays off.
