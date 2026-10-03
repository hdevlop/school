# Fast, cheap model candidates vs gpt-oss-120b:nitro — 2026-10-03

## How the candidates were chosen

I scanned OpenRouter's live endpoint statistics (last 30 minutes) for every
paid model that:

- supports tools;
- costs at most $1 per million output tokens;
- has a context of at least 32k tokens.

That came to 101 models with stats for 341 hosts. For each model I estimated
an answer's time from its best host, using School's measured average answer:

- 2 model steps, each paying the host's latency;
- about 1,810 input and 180 output tokens, generated at the host's throughput.

Four candidates were estimated at about 1 s and were plausible for tool calling
and Arabic. Excluded:

- `gpt-oss-safeguard-20b`: a safety classifier;
- `llama-3.1-8b`: too small;
- `gpt-oss-20b`: rejected earlier
  ([review](model-20b-nitro-20261003.md)).

Each candidate ran as `<id>:nitro` against `openai/gpt-oss-120b:nitro`. Each of
the 12 smoke questions ran once on each model, alternating which went first,
with fresh sessions. AI settings were restored afterwards. I reviewed every
answer's language and facts outside the repository and removed the text from
the raw data.

## Results

Times are complete-answer p50 / p95. The 120b row is the median of its four
baseline runs.

| Model (`:nitro`) | Passed | Complete p50 / p95 | Tokens per answer (in / out) | Est. cost per 1,000 answers | Verdict |
|---|---|---|---|---|---|
| `openai/gpt-oss-120b` | 48/48 | 0.61 s / 1.07 s | 1,811 / 158 | ~$0.75 (Cerebras) | **Best** |
| `nvidia/nemotron-3.5-lightning` | 12/12 | 0.97 s / 1.56 s | 2,189 / 154 | ~$0.18 | **Viable, cheaper** |
| `google/gemini-2.5-flash-lite` | 11/12 | 0.93 s / 1.96 s | 1,662 / 68 | ~$0.10 | Rejected |
| `inception/mercury-2` | 10/12 | 1.03 s / 2.31 s | 1,616 / 131 | ~$0.50 | Rejected |
| `nvidia/nemotron-3-nano-30b-a3b` | 12/12 | 1.96 s / 78.1 s | 20,129 / 1,988 | ~$1.4 | Rejected |

Per-model data:
[lightning](model-nemotron-3.5-lightning-20261003.json),
[gemini-lite](model-gemini-2.5-flash-lite-20261003.json),
[mercury-2](model-mercury-2-20261003.json),
[nemotron-nano](model-nemotron-3-nano-30b-a3b-20261003.json).

## Findings

- **`nemotron-3.5-lightning`**: every answer was in the right language with the
  right facts. It used one search for each write request and asked for a
  correct name. It is about 0.35 s slower than 120b at p50 and about 4× cheaper.
  This is the cost-saving option.
- **`gemini-2.5-flash-lite`**: asked in Arabic for the student count, it answered
  **in English with a wrong number (58) and called no tool**. It also answered the
  French write request in English. A fast answer that is wrong fails (section
  6.1).
- **`mercury-2`**: one request failed inside the server
  (`TypeError: Cannot read properties of undefined (reading 'hasFinished')`,
  outcome `error` in its diagnostics). Another hung after a search until the
  runner's 120 s timeout (outcome `aborted`). A stream-format incompatibility
  between this provider and the AI SDK is likely; it was not investigated.
- **`nemotron-3-nano-30b-a3b`**: the French write request took **78 s** across
  9 steps and 8 tool calls. That one request drove its average to 20k input
  tokens. Its Arabic greeting contained a Malay word ("seperti").

## Gaps this exposed in the runner

- The runner does not check the language of each reply. Gemini's two
  wrong-language answers passed the automatic checks; only the wrong count
  failed. Add a language check before relying on automatic results for model
  choice.
- The write cases use a synthetic name, so no candidate reached a blocked
  write. Blocking with these models is untested.

## Limits

One repetition per model, admin role only, and OpenRouter host speeds change
over time. Costs are estimates from listed prices; OpenRouter's activity page
shows actual charges and hosts.
