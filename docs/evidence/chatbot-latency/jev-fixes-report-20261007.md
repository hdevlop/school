# Jev fixes, benchmark and next actions

The language and deterministic-write fixes are implemented in School source. A new semantic query veto is available to the benchmark as an explicit candidate; runtime Jev remains off. The separately authorized 100-slot/$0.02 regression recheck completed with **99 valid responses and one preserved socket failure**, with no question retried. It did **not** fix API latency or fully establish transport reliability.

## What changed and why

- Nine operator spelling variants now resolve to a supported language: unknown cases **9 → 0**. Distinct anchored signals remain required; names, quotes and unsupported languages still abstain.
- All 18 reviewed write questions now receive deterministic refusals with **no tool plan**, up from two. This covers the missed `mse7` deletion, `sejjel` attendance writes and other clear record changes. Read/how-to/negated/quoted requests remain separate. This is source behavior, not deployed response-time evidence.
- Arithmetic, filtered counts, subject substitutions and explicit writes veto read shortcuts independently of the classifier's binary write score. The dangerous computed-sum q30 is blocked even in a read-score unit fixture; a false write score no longer has to protect it. Separate totals and closed exclusions of names remain allowed.
- Regression rechecks have their own declared corpus purpose, preserve the exact reviewed cases and never claim fresh held-out acceptance. Continuations now freeze the shared write helper and semantic-veto inputs as well as the original classifier inputs.

## Measured recheck

| Metric | Original study | New recheck | Meaning |
|---|---:|---:|---|
| Valid / attempted | 96 / 100 | 99 / 100 | Failures remain visible |
| Successful classifier mean | 433.6 ms | 511.4 ms | Higher in this sequential recheck |
| Successful classifier p95 | 663.1 ms | 729.7 ms | Still above 500 ms |
| Successful maximum | 5334.9 ms | 1183.9 ms | No causal improvement claim |
| Language skips | 9 | 0 | Operator spelling coverage fixed |
| Deterministic refusals | 2 | 18 | No model/classifier needed for those source matches |
| Eligible Jev decisions after the current veto | Not measured with this profile | 33 / 25 families | Zero frozen-label disagreements |
| Combined eligible shortcut projection | 40 | 51 | Includes refusals; not actual readiness wins |
| Known provider-reported cost | $0.003770844 | $0.003887352 | Different numbers of valid responses |
| New retained unknown-cost reserve | — | $0.000150000 | Unknown is not zero |

The later shared-key increase equals $0.003887352, matching the new known-cost sum in aggregate. Total new client-accounted amount is $0.004037352. This is not per-request invoice evidence. Both 100-request stages have exhausted their slots; remaining dollars grant no further classification requests. The probe sent all 100 questions for comparison, including writes that the future source pipeline would refuse before classification. No actual model-call savings or full-chat latency were measured.

Connection reuse stayed disabled throughout the recheck, and builds/tests completed before live dispatch. The socket failure at q68 still occurred. Fewer errors and a lower maximum in this sequential run do not prove the transport option cured the network. The mean and p95 actually increased.

## All saved benchmark replays

The offline study reparsed **598 valid decisions** across **604 preserved attempts**, without altering raw reports, labels or probabilities. Comparisons below use current language/refusal eligibility on both sides.

| Saved corpus | Accepted before veto | Accepted after veto | Wrong acceptances after | Correct declines |
|---|---:|---:|---:|---:|
| core | 50 | 49 | 0 | 0 |
| v3Draft96 | 55 | 53 | 0 | 2 |
| v4Draft96 | 56 | 53 | 0 | 3 |
| operator100 | 33 | 33 | 0 | 0 |

The core replay blocks the old teacher-name/count error and retains all 49 correct accepted questions. The earlier 96-case datasets retain small conservative declines, which remain in the evidence. This is post-result development on spent data, not independent accuracy validation.

## Verification and scope

Build, typecheck and lint pass. The full root test chain passed before the last small read-exclusion change, including 447 script tests / 2,745 assertions and workspace boundaries. Final focused language/write/template/semantic tests pass **266 / 0**, including the added Arabic and Arabizi `dir` read cases; the production build and lint were repeated afterward.

A final read-exclusion change was made after the live recheck to avoid treating `dir/دير` lists and totals as mutations. A recorded before/after comparison proves all 100 measured refusal classifications remain identical. Those extra read cases were validated offline rather than falsely described as live benchmarked. The [analysis](jev-fixes-regression100-analysis-20261007.json) records both helper hashes and this limit. The classifier request and semantic-veto source were not altered after dispatch.

No School records were mutated, no School tool ran in the classifier benchmark, no package pin changed, and no runtime Jev switch was enabled. Wording approval applies to the reviewed cases; labels remain assistant-provisional. No native precision bound or deployment acceptance is claimed.

## What we should do next

1. **Diagnose transport and tail latency before scaling.** Add a controlled, same-query client/connection comparison with recorded DNS/TCP/TLS timing and separate failed-call durations. Keep request shape, pacing and cohort fixed. This recheck does not justify lowering the 500 ms target or switching model/provider on latency claims alone.
2. **Author a fresh, larger evaluation.** Use at least 200 eligible supported request families, plus writing/qualified/arithmetic/negation/quote negatives. Keep translations and known paraphrases linked; repeated or decorated questions do not create independent families. The reviewed 100-case cohort stays spent. The [larger-study specification](jev-fixes-next-study-spec-20261007.json) is design-only until real cases are authored, reviewed and frozen.
3. **Then validate integration.** Once classification evidence qualifies, use a supported published async hook and exercise the zero-grace readiness race, authenticated read-only execution, role/year denials, actual template wins, fallback regression and cost per correct full reply. These steps remain unrun.

Recommendation: keep the source refusals/language fixes, keep semantic veto v3 as a measured development candidate, and leave Jev off. Solve reliability/latency and fresh sample coverage before runtime adoption.
