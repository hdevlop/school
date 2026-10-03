# gpt-oss-120b:nitro vs gpt-oss-20b:nitro — 2026-10-03

Interleaved comparison with `--baseline-model=openai/gpt-oss-120b:nitro
--compare-model=openai/gpt-oss-20b:nitro`, 12 smoke questions × 2 = 24
requests. Each request used a fresh session, and every server record confirmed
the intended model. The saved model, `openai/gpt-oss-120b`, was restored
afterwards. Answer text was reviewed outside the repository and removed from
the raw data: [model-20b-nitro-20261003.json](model-20b-nitro-20261003.json).

## Results

| | `gpt-oss-120b:nitro` | `gpt-oss-20b:nitro` |
|---|---|---|
| Completed / checks passed | 12/12 / 12/12 | **10/12** / 10/12 |
| Complete p50 / p95 (completed only) | 0.62 s / 1.48 s | 0.75 s / 1.09 s |
| Input / output tokens (12 requests) | 21,735 / 1,942 | **83,600** / 3,931 |

## Findings

1. **20b failed both write requests with an empty answer.** It called
   `search_search_students` with input the tool rejected, ten times in a row. It
   then hit `maxSteps: 10` with no reply: 4.8 s and 9.2 s of retries. 120b
   searched once and answered that no student had that name.
2. **20b was not faster.** On the 10 questions it completed, its median was
   0.13 s slower than 120b's. Its p95 was lower only because 120b had one slow
   Spanish count.
3. **The failed retries also used 4× the input tokens.** Each retry resends the
   prompt, so 20b's low per-token price does not carry through to a lower cost
   per answer.
4. **Language and facts:** both replied in the question's language and gave the
   correct count (100). 20b added greetings and follow-up offers to plain
   Arabic and Spanish count answers, against the system prompt's style rule.

Do not use `gpt-oss-20b` for the assistant. Among the hosts and models checked
so far, `gpt-oss-120b:nitro` remains the best option.

## Limits

- One repetition: the failure is what decides this, not the timings.
- Admin role only; human review here covered language and facts only, not
  wording quality in depth.
