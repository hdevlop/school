# Cerebras-first routing with low reasoning effort — 2026-10-04

School adopted `najm-chatbot` 3.2.0 and `najm-rag` 3.2.0 and configured
`chatbot({ openrouter })` in `packages/server/src/config/chatbotConfig.ts`:

```ts
openrouter: {
  provider: { order: ['cerebras'], allow_fallbacks: true, ignore: ['groq'] },
  reasoning: { effort: 'low' },
}
```

The saved model stays `openrouter / openai/gpt-oss-120b`; the routing now
comes from the config instead of a `:nitro` model id. 3.2.0 also answers
without tools after two identical tool-call steps, and RAG indexing removes
embeddings of tools that no longer exist: on boot it removed the 54 names
retired by the [tool rename](cerebras-tool-prefix-20261004.md)
(`indexed: 0, skipped: 431, removed: 54`).

## Run

30 cases of `questions.json` (fr, ar, Darija), once each, admin, `2026-2027`,
isolated production build on port 3105, uncontrolled caches. Raw data:
[run](step3-cerebras-low-20261004.json). Compared with the `:nitro` variant of
the [earlier run](tool-rename-nitro-full50-20261004.json) (same corpus, Cerebras,
default reasoning effort), run sequentially, not interleaved.

| | `:nitro`, default effort | Cerebras first, effort low |
|---|---|---|
| Completed | 30/30 | 30/30 |
| Automatic checks passed | 24/30 | **28/30** |
| First text p50 / p95 | 0.83 s / 3.06 s | 0.80 s / **1.21 s** |
| Complete p50 / p95 (max) | 0.88 s / 3.15 s (3.18 s) | 0.81 s / **1.26 s** (1.28 s) |
| Tokens in / out (reasoning) | 127,916 / 7,778 (5,211) | 115,428 / 3,157 (**625**) |
| Cost per 1,000 answers | ≈ $1.69 (list-price estimate) | **≈ $1.03 (measured)** |

Measured cost: the OpenRouter key's `usage` went from $0.562192 to $0.593101
over the run, $0.0309 for 30 answers; a later read was unchanged. That is below
Cerebras' list price for the reported tokens (≈ $0.043); prompt caching is the
likely reason but was not confirmed. The host of each request was not recorded;
the timings match Cerebras, not the 6–8 s p50 of the cheapest hosts.

Both remaining failures are `wrongRegister` on Darija questions
(`teacher-count-ary`, `students-and-teachers-ary`): the heuristic read Modern
Standard Arabic. The French wrong-language and mixed-language flags of the
earlier runs did not recur. Answer text was not stored; none of the flags has
been reviewed by hand.

## Limits

One repetition of 30 cases, sequential against the earlier run, admin only,
no English or Spanish. The repeated-tool-call guard did not trigger in this
run, so it is covered by `najm-chatbot`'s tests only. Fallback behavior when
Cerebras is unavailable was not exercised.
