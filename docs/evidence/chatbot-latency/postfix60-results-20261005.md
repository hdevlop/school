# Full post-fix Moroccan repeat — 2026-10-05

**60/60 automatic checks and 60/60 assistant reviews passed; serial timing gates
passed. Overall acceptance remains open because the unchanged cost gate failed.**

The [recorded plan](postfix60-plan-20261005.md) ran once: 30 frozen Moroccan cases
twice, admin, selected year `2026-2027`, serial, fresh sessions, warm resident
Qwen embeddings and verified fresh application caches. GPT-OSS-120b,
Cerebras-first/fallbacks-allowed/Groq-excluded, low reasoning and the School
templates were retained. No model, provider/key, deployment or fixture mutation.

[Raw report](postfix60-run-20261005.json), run `f8ca5475`; [per-answer assistant
review and analysis](postfix60-analysis-20261005.json). Historical automatic
60/60 and assistant 59/60 results were not rewritten or pooled with this repeat.

## Correctness and diagnostics

- All 60 completed with non-empty answers, zero automatic factual, language,
  register, argument, review-required, correlation or cache-verification failures.
  Each language has 20 completed and reviewed replies.
- Every answer was reviewed against [fresh School facts](postfix60-facts-20261005.json):
  100 students, 50 teachers, nine classes/sections and the first five of 12
  upcoming exams. Search-not-found replies and write refusals were accurate.
- All six attendance replies explicitly reported no records, with six successful
  captured empty arrays and no outage/settings/retry advice or attendance-status
  inference. The previously observed Arabic defect did not recur.
- 30 replies used templates, 30 used the model. Diagnostics record 54 generation
  steps, 48 successful read-tool executions and no executed writes, write claims
  or promises. All sessions began with empty history.
- All 60 cache resets, completed routing embedding misses/attempts and
  request/embedding correlations were verified on the same app instance.

Assistant review accepts the factual/read-only behavior and requested languages;
it is not independent native-speaker certification. Two Darija replies have minor
editorial caveats retained per row: awkward `نتقدر` wording and a more formal
more-results notice. Held-out wording, populated/error attendance, broader roles,
year denials, knowledge and current English/Spanish coverage remain separate work.

## Descriptive timings

| Path | Replies | First-text p50/p95 | Completion p50/p95 |
|---|---:|---:|---:|
| Hybrid | 60 | 0.516 / 1.178 s | 0.566 / 1.235 s |
| Model | 30 | 0.857 / 1.266 s | 0.869 / 1.286 s |
| Template | 30 | 0.244 / 0.520 s | 0.244 / 0.520 s |

Maximum completion was 1.789 s. These are small serial development samples, not
production tail estimates or an interleaved proof of improvement. Provider prompt
caching was uncontrolled; no concurrent/cold-model/browser condition is inferred.

## Accounting and failed cost gate

The new [accounting implementation](cost-accounting-20261005.md) preserved raw
SDK metadata but settled the estimate stop from the [declared catalog maxima](postfix60-declared-prices-20261005.json):
$0.35 input/$0.95 output per million tokens across eligible listed hosts.
All 60 samples had valid matched usage, including 30 verified zero-usage templates.

| Measure | USD |
|---|---:|
| Raw SDK estimate | 0.006241680 |
| Declared estimate and operating settlement | 0.052940950 |
| Immediate selected-key ledger delta | 0.000000000 |
| Later selected-key ledger delta | 0.052126750 |
| Later delta per 1,000 attempts/assistant-accepted replies | 0.868779167 |
| Declared estimate per 1,000 accepted replies | 0.882349167 |
| Unchanged acceptance target per 1,000 correct replies | 0.250000000 |

All requests fit the new $0.50 estimated stop; there were no unknown costs,
unresolved reservations or extra paid retries/probes. That operating budget is
distinct from the failed acceptance-cost gate and was never a hard provider cap.

The selected School key was verified equal to the environment key at preflight,
run start/end and later reads. The ledger rose from $0.688389884 to $0.740516634.
Its immediate read was stale; [postflight](postfix60-postflight-20261005.json) and
a [later stable read](postfix60-settled-20261005.json) recorded the increase.
The zero immediate delta must not be interpreted as free generation.

The later increase exactly matches recorded usage at the current Cerebras catalog
rates: `(140,210 × $0.35 + 4,071 × $0.75) / 1,000,000 = $0.052126750`.
This is strong consistency evidence, not isolated per-generation invoice/host
attribution. Other key traffic, provider cache charges and local embedding
infrastructure costs remain unallocated. Declared estimates alone also exceed
the cost gate, so this run cannot establish cost acceptance.

## Next change and deferred work

Paid concurrency 2/4, broader model experiments and production rollout are deferred
under the plan's gate. Keep GPT-OSS and the target unchanged.

A concrete cost-reduction candidate is to extend the existing guarded School
reply templates to unqualified class lists, next-five exam lists and successful
empty attendance reads. Preserve Najm's single template executor, guards/year
scope and model fallback for qualified, unsupported or ambiguous requests.

At current Cerebras catalog rates those three scenarios account for $0.039480050
of the $0.052126750 token estimate. Removing their generation while holding the
rest fixed would imply about **$0.211/1,000 outer replies** on this corpus. This is
a counterfactual prioritization estimate, not implemented behavior, measured savings
or a cost-gate pass; local regressions and a separately budgeted live repeat must
validate any change. No template expansion was included in this run.

## Verification and cleanup

306 local benchmark/chat/read-only tests passed, zero failures, 903 assertions;
the independently installed [frozen checkout](postfix60-manifest-20261005.json)
passed the same suite. Source/test typechecks, root lint and an isolated production
build passed. [Readiness](postfix60-readiness-20261005.json) and
[preflight](postfix60-preflight-20261005.json) confirmed facts/model/cache/key
readiness before paid requests. [Post-run hashes](postfix60-source-after-20261005.json)
match the frozen manifest. [Final verification](postfix60-verification-20261005.json)
also confirms matching corpus hashes, valid document links and clean whitespace.

[Cleanup](postfix60-cleanup-20261005.json) verified task shutdown: launcher,
snapshot processes and port 3102 were gone. Ollama and the frozen checkout were
retained. No deployment or database migration was performed. The 60-request
allowance is consumed; further paid runs require new recorded limits.
