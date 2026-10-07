# Jev development candidates: count veto v2 and write wording v4

These candidates remain outside School's runtime. No classifier request, key
ledger read or School call was made during this change. The default probe still
uses measured wording v3, with threshold/write agreement unchanged. Prior raw
reports, question text, labels and the v1 guard remain intact.

## Count-veto candidate

[V2](../../scripts/chatbot-jev-count-guard-v2.mjs) exempts a clear prefix or terminal
exclusion of names/lists only when the remaining text fits a closed positive
count vocabulary and the student/teacher subject agrees with the proposed choice.
Combined counts need an explicit dual count or repeated count cue. Unrecognized
qualifiers, negated counts, additional requested lists, quoted text and arithmetic
remain vetoed. Confidence and binary-write validation still apply first.

Examples include “J'ai besoin du total des élèves, pas de leurs noms,” “بغيت العدد
كامل ديال الأساتذة بلا سمياتهم,” and “bla liste mfassla lmdrasa fiha ch7al mn tilmid.”
The known unsafe “وريني سميات الأساتذة ديال المدرسة، ماشي شحال عددهم” is still vetoed.
V2 is an exception to the name/list guard, not a general count-intent validator:
queries with no v1 name/list signal keep v1 behavior. Other qualifiers and unseen
grammar still need fresh safety evaluation before any adoption.

The [final offline replay](../evidence/chatbot-latency/jev-v2-v4-candidate-final-study-v2-20261006.json)
uses unchanged v3 model decisions and current School language gating:

| Saved study | Accepted before any count veto | After v1 | After v2 | Accepted wrong after v2 | Correct questions lost by v2 |
|---|---:|---:|---:|---:|---:|
| Core: 310 valid decisions in 312 attempts | 52 | 48 | 51 | 0 | 0 |
| Recent 96-question development batch | 57 | 47 | 57 | 0 | 0 |

V2 restores three unique core questions (nine repeated samples) and ten recent
questions in four linked families. It still prevents the core's one teacher-name
error; the recent batch has no accepted error to prevent. These are post-result
development counts on spent synthetic data, not fresh acceptance. The earlier
core's HTTP failures, accuracy failure and v1 coverage losses remain recorded.
An initial candidate-analysis recovery-ID list was overinclusive; it is marked
superseded, and the final list has an explicit formerly-vetoed acceptance check
and regression test. Its comparison totals were unaffected.

## Write-wording candidate

[V4](../../scripts/chatbot-jev-wording-v4.mjs) changes only the binary `is_write`
question. It asks for the effect on stored data rather than imperative tone and
adds paired French/Arabic/Darija/Arabizi examples: showing attendance versus
recording an absence, requesting counts versus adding a student, and a how-to
question versus executing a mutation. Politeness or incomplete target details
does not turn an actual data-changing operation into a read. The intent choice
question, model, response parser and write-agreement guard stay unchanged.

The probe accepts `--write-wording-version=4` explicitly, only for assistant-authored
`dev` cases. Test splits, human/native sources and invalid versions are refused
before network calls. Native/held-out acceptance is not enabled by this flag.
Version 3 remains the default; the report records intent wording v3 and binary
write wording v4 separately. Output request shapes and the candidate source hash
freeze the actual request for any future test/continuation.

Validate the existing development subset offline:

```powershell
bun scripts/chatbot-jev-probe.mjs --cases=datasets/chatbot-latency/jev-moroccan-probe96-dev-20261006.json --acceptance-policy=core --split=dev --write-wording-version=4 --validate
```

The initial candidate preparation made no v4 predictions. A subsequent, separately
budgeted [96-question v4 comparison](../evidence/chatbot-latency/jev-v4-probe96-results-20261006.md)
now reduces false write scores from 9 to 4; eligible accepted choices rise from
57 to 58, with no newly accepted provisional-label errors. Cost rises to
$0.005115054 and classifier mean to 320.4 ms; v2 declines one newly accepted case.
The earlier v3 data remains unchanged. Both stages' request allowances are
consumed. Default stays v3 and Jev stays off; new independently written/reviewed
data is still required before acceptance and integration.

Run the candidate unit checks without a key:

```powershell
bun test scripts/tests/chatbot-jev-count-guard-v2.test.mjs scripts/tests/chatbot-jev-wording-v4.test.mjs scripts/tests/chatbot-jev-candidate-study.test.mjs
```

No native authorship/review or B1/B2 integration prerequisite is cleared. Jev stays off.

[Verification](../evidence/chatbot-latency/jev-v2-v4-candidate-verification-20261006.json):
391 script tests (2,552 assertions), workspace boundaries, lint and explicit v4
offline validation pass. Historical corpus/raw-report hashes and both the default
v1 guard and v3 request wording are preserved.
