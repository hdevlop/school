# GPT-OSS-20B versus 120B, with Jev off/on — 2026-10-07

**The cheaper combination is possible and was tested.** Under School's current provider and parallel Jev policy, GPT-OSS-20B costs much less, but its replies take about ten times longer. Jev supplied no templates in this run, so adding it did not remove LLM calls.

## Measured results

All **96 planned chats** were dispatched once: the same 24 assistant-authored French, Arabic and Darija questions across four combinations. All streams completed; three retained model tool-call failures leave 93 replies without tool errors. This is an integration sample, not an independent language/accuracy qualification.

| Combination | Without tool failure / attempted | Mean completion | Completion p95 | Response-reported cost, 24 attempts | Projected cost / 1,000 similar attempts |
|---|---:|---:|---:|---:|---:|
| 120B, Jev off | 24 / 24 | 0.915 s | 2.308 s | $0.028825460 | $1.201 |
| 120B, Jev on | 24 / 24 | 1.182 s | 4.243 s | $0.032138132 | $1.339 |
| 20B, Jev off | 23 / 24 | 9.465 s | 21.178 s | $0.001694681 | $0.071 |
| 20B, Jev on | 22 / 24 | 9.485 s | 15.976 s | $0.002481000 | $0.103 |

Timing means/p95 exclude tool-failed replies. Costs include every started model/classifier call, including the failed replies. Projections use all 24 attempts per arm and this observed mix; they are not guaranteed prices for real traffic. Neither browser rendering nor production latency was measured.

**20B + Jev was about 91% cheaper than 120B alone**, but averaged about 9.5 seconds rather than 0.9 seconds. Within 20B, the observed on-mode bill was higher than off-mode. Different outputs/tool steps also affect those totals; zero Jev-selected answers means this run establishes no generation savings from Jev.

## Prices and provider attribution

The cost table uses **OpenRouter response `usage.cost`**, not Najm's static SDK pricing estimates. A benchmark-only Node preload forwards the original stream and separately records generation ID, model, provider and usage. It never records request bodies, credentials or generated text. The analyzer matches each sequential chat's generation-start window and expected diagnostic step count; **169 generation calls** are accounted for once, with zero unmatched IDs and no missing generation charges.

The **44 Jev classifications** have known response costs totaling **$0.001723764**. Combined response-reported charges total **$0.065139273**, below the original $0.25 stop. The later shared-key delta is retained separately because reporting lag and other traffic prevent assigning it to individual arms. There is no further billing investigation pending for this comparison.

The [public endpoint/pricing snapshot](jev-model-pricing-20261007.json) was captured before dispatch from OpenRouter's [120B endpoints](https://openrouter.ai/api/v1/models/openai/gpt-oss-120b/endpoints) and [20B endpoints](https://openrouter.ai/api/v1/models/openai/gpt-oss-20b/endpoints). The listed minimum 20B rates were $0.018 input/$0.09 output per million tokens; Cerebras 120B listed $0.35/$0.75. Those listings do not replace the measured response costs above.

School's preference stayed Cerebras-first, with fallbacks enabled and Groq excluded. The snapshot lists no Cerebras 20B endpoint. Returned generation providers were **80 Cerebras and one CoreWeave call for 120B**, and **86 Darkbloom and two DekaLLM calls for 20B**. Therefore this compares practical model/provider configurations, not two models on an identical host. The result does not establish that 20B would take nine seconds on every provider.

## Answer quality and Jev behavior

All 36 student/teacher/dual-count replies agree with the fixture's eight students and zero teachers. The three tool failures are all on 20B filtered-count requests: `fr-filter/on`, `ar-filter/on` and `ar-filter/off`. The model supplied the name `CE2` as `sections_get_students.id` without resolving the actual section ID. It then described an unavailable section. A failed lookup by an invented ID does not prove that a section with that name is absent. The repeated invalid model tool calls in the Arabic replies are recorded and charged; no benchmark request was retried.

No mutating tool executed. Greetings remained in the requested language in the reviewed sample, but this is not a complete native Darija quality score. The owner's existing wording review remains the relevant language feedback; no extra reviewer/provenance forms are introduced.

Jev's provisional intent agreement is **42/44**; zero incorrect templates were accepted because **zero Jev templates were selected**. The two label disagreements remain in raw evidence. Classification elapsed p95 is about **445 ms** in this batch, separate from full-chat time. Ordinary preparation was generally ready before classification. Slow model generation happens after that selection, so a slower fallback model does not make the existing parallel Jev race more likely to win.

## Execution, limits and cleanup

The owner requested the cheaper-model comparison. A new frozen plan declared **96 chats, at most 48 classifications, a $0.25 combined estimate/key-delta stop, concurrency one, two-second start spacing and no benchmark retries**. The first segment stopped after 29 requests on the French 20B tool error. That request stays failed.

Only the **67 never-dispatched jobs** continued. The new protocol carries the original spending forward, using the higher of the observed shared-key delta and generation costs plus known classifier costs; generation costs use the higher of SDK estimates and response-reported charges. Its classifier count/cost ceilings are reduced. Subsequent model tool errors are retained answer-quality outcomes; HTTP/stream failures, unknown costs, changed sources/process and accepted wrong Jev choices still stop dispatch. The continuation used a fresh process, resetting routing caches; source fingerprints and this policy change are explicit. No fixture records, IDs or permissions were altered to make the failed question pass.

Jev is restored off; the fixture model is restored to 120B, its saved API key is verified absent, its AI settings are disabled, and port 3103 is stopped. Port 3102, the primary School database, real env file and normal chatbot configuration were untouched. The fixture retains the tested model choice in its disabled settings row; no direct database cleanup was used.

All scripts pass ESLint. The full script-test and workspace-boundary command passes **534 tests**, with zero failures; the focused comparison/observer/report checks also pass. Production modules and package pins were unchanged; no new framework publication or production build was needed for these CLI-only changes.

## What we can do next

Keep 120B for the current interactive chatbot when roughly one-second replies matter. Consider 20B for cost-first work that tolerates the measured delay, after addressing its ID-resolution failures and testing representative complex questions.

For a cheaper interactive configuration, the next useful comparison is an explicitly pinned, faster 20B host against the current baseline. Public price alone cannot identify that host's full-chat speed. A separate **Jev-first** experiment could give validated templates time to replace generation before fallback begins; this run tested only the current parallel policy. Both experiments require their own frozen protocol and measurements. Real-question/production Jev remains off.

## Evidence and reproduction

- [Computed cost/timing report, per-chat output and provider usage](jev-model-comparison-results-20261007.json).
- [First frozen plan](jev-model-comparison-plan-20261007.json), [29-request report](jev-model-comparison-run-20261007.json) and [first-segment generation usage](jev-model-comparison-generation-first-20261007.jsonl).
- [Reduced continuation plan](jev-model-comparison-continuation-plan-20261007.json), [67-request report](jev-model-comparison-continuation-run-20261007.json) and [continuation generation usage](jev-model-comparison-generation-continuation-20261007.jsonl).
- [Cleanup verification](jev-model-comparison-cleanup-20261007.json).

`scripts/chatbot-jev-full-chat.mjs --model-comparison` prepares a new frozen plan without dispatching paid requests. Execution requires its exact limits/fingerprint and marked local fixture controls. `scripts/chatbot-jev-model-report.mjs` accepts comma-separated run paths, comma-separated captured usage paths, and a new output path to recompute the table offline. Spent plans and evidence are preserved; never overwrite them or treat them as another allowance.
