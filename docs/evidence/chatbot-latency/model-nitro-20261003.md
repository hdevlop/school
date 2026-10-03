# gpt-oss-120b: default routing vs `:nitro` — 2026-10-03

Interleaved comparison (CHATBOT-LATENCY-PLAN section 7, item 5) with
`--compare-model`. The model and the OpenRouter key are the same for both; only
OpenRouter's host choice differs. The default routes to the cheapest host.
`:nitro` routes to the fastest; going by OpenRouter's published throughput,
that is usually Cerebras. Each of the 12 smoke questions ran once on each
variant; the variant asked first alternated between questions, and each request
used a fresh session. AI settings were restored to `openai/gpt-oss-120b`
afterwards. Raw data: [model-nitro-20261003.json](model-nitro-20261003.json).

## Results

| | Default (`openai/gpt-oss-120b`) | `openai/gpt-oss-120b:nitro` |
|---|---|---|
| Completed / checks passed | 12/12 / 12/12 | 12/12 / 12/12 |
| First text p50 / p95 | 1.42 s / 6.56 s | **0.59 s / 1.03 s** |
| Complete p50 / p95 | 1.95 s / 6.64 s | **0.63 s / 1.07 s** |
| Model time p50 / p95 (server) | 1.93 s / 6.62 s | 0.60 s / 1.04 s |
| School's own work p50 (prepare + tools) | ~9 ms | ~9 ms |
| Tokens in / out (12 answers) | 21,719 / 2,249 | 21,735 / 1,925 |
| Cost for 12 | $0.0013 (estimate) | ~$0.009 if served by Cerebras (see note) |

- Every candidate request was confirmed by its server record to have run on
  `:nitro`: no model mismatches.
- The default's p95 came from one slow request (`student-count-es`, 6.6 s).
  `:nitro`'s slowest answer was 1.07 s.
- The default was faster in this run than in the morning runs (complete p50
  2.0 s, against 5.1 s and 2.7 s). The cheap hosts vary; `:nitro` did not.
- Answer lengths were similar. The `:nitro` answers spent more reasoning tokens
  (1,057 against 363 for 12 answers) and still finished sooner.
- The two write cases stopped at the student search on both variants, as the
  synthetic name allows. Blocking was not exercised in this run.

## Cost note

`najm-chatbot`'s price table has no entry for the `:nitro` id, so the runner
shows no estimate (`pricingFound: false`). At Cerebras' listed $0.35 / $0.75 per
million tokens, these 12 answers cost about $0.009, roughly $0.75 per 1,000
answers, against about $0.11 per 1,000 on the default. OpenRouter's activity page
shows the actual charge and the host that served each request.

## Limits

- 12 pairs: enough to show a large gap, not to estimate p95 precisely.
- Automatic checks only, with no human review of answer wording. The admin role
  only.
- OpenRouter host speeds change over time; recheck before relying on a number.
