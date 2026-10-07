# Count/list guard development replay — 2026-10-06

An offline guard prototype now declines `student_count`, `teacher_count` and
`student_and_teacher_count` decisions when the question includes a recognized
name/list token. It blocks the observed Darija teacher-name/count false
acceptance, but also declines three correctly accepted count questions.
**This is post-result development on spent synthetic data, not an accuracy pass.**
The guard is connected to neither the live probe nor the School app; Jev stays off.

## Replayed result

The study replayed all 310 normalized decisions from the original 312 attempts,
preserved the four raw-report hashes, matched the frozen v3 request and reproduced
the actual language/regex eligibility used in the completed core analysis.
Threshold 0.8, the core acceptance scope and write agreement stayed unchanged.

| Quantity | Original scorer | Offline guard projection |
|---|---:|---:|
| Eligible accepted samples across repetitions | 146 | 136 |
| Unique accepted questions | 50 | 46 |
| Wrong accepted samples / questions | 1 / 1 | 0 / 0 |
| Accepted families | 16 | 15 |

The wrong acceptance is `core3-ary-21#3`: a request for teachers' names became
`teacher_count`. The guard declines it rather than changing its label or score.

The coverage loss is **nine correct samples across three questions**:
`core3-ar-03`, `core3-ary-03` and `core3-ary-latn-03`. Each requests a number
while explicitly excluding names/lists. This guard also vetoes negated/quoted
signals, so those questions would use a fallback in a future integration.
No fallback was executed here. Additional model cost or reply latency has not
been measured, so zero replayed false acceptances does not justify deployment.

## Implementation and checks

- [Guard prototype](../../../scripts/chatbot-jev-count-guard.mjs): whole tokens,
  Unicode normalization, common French/English/Arabic/Arabizi forms, three count
  intents only. Class lists and guarded write refusals retain their original
  acceptance behavior. The finite token list does not validate every qualifier.
- [Development corpus](../../../datasets/chatbot-latency/jev-count-guard-dev.json):
  15 assistant-authored dev cases; proposed choices are simulated, not new Jev
  predictions. Expected guard behavior is separate from semantic ground truth.
  Known correct abstentions and a named-school qualifier outside this guard's
  scope remain explicit. No native-authored/reviewed cases are claimed.
- [Offline study CLI](../../../scripts/chatbot-jev-count-guard-study.mjs): saved
  decisions only, original eligibility recount, immutable historical reports
  and exclusive new output creation.
- The native freshness registry now includes this dev corpus alongside base,
  original Jev and core corpora. A held-out question already seen in these dev
  checks is rejected; dev reuse remains permitted for regression work.

`bun run test:boundaries`: **308 passed, 0 failed, 1,292 assertions**; workspace
boundaries passed. `bun run lint`: passed. Guard/native focused checks:
19 passed, 158 assertions. The real study CLI is tested with every fetch blocked
and without a provider key; output overwrite is refused. The native-intake check
still reports zero actual cases and blocks export.

[Replay data](jev-count-guard-dev-20261006.json),
[verification metadata](jev-count-guard-verification-20261006.json).

## Next use

Keep this guard in development. Before adding it to a new classifier study,
freeze its version/source and measure fresh independent/native accuracy,
abstentions, coverage and resulting fallback cost/latency. The old core/B0
failures remain failed. The native collection still needs actual human questions
and review records through the [intake workflow](../../tests/jev-native-validation.md).

This follow-up made zero live provider or School requests, changed no runtime
configuration, published no package and deployed nothing. No production build
was needed for these script/test/dataset/documentation changes.
