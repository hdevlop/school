# gpt-oss-120b default vs `:nitro`, all 50 questions — 2026-10-03

Interleaved run (`--compare-model=openai/gpt-oss-120b:nitro`): each of the 50
questions in `questions.json` (en, fr, es, ar, Darija) once on each variant, the
first variant alternating, fresh session each, admin, dev server, `najm-rag`
2.2.0 and `najm-chatbot` 2.1.1, Ollama embeddings warm. AI settings were restored
to `openai/gpt-oss-120b`. Raw data: [model-nitro-full50-20261003.json](model-nitro-full50-20261003.json).

## Results

| | Default (`openai/gpt-oss-120b`) | `:nitro` |
|---|---|---|
| Completed, checks passed | **50/50** | **47/50** (3 empty answers) |
| Wrong reply language | 0 | 0 |
| First text p50 / p95 | 2.76 s / 6.87 s | 0.90 s / 1.51 s |
| Complete p50 / p95 | 3.49 s / 12.33 s | 1.01 s / 1.54 s |
| Tokens in / out | 163,297 / 14,026 | 193,701 / 16,000 |
| Cost | ≈ $0.009 (najm-chatbot estimate) | ≈ $0.076–0.079 (measured, see below) |
| Per 1,000 answers | ≈ $0.18 | ≈ $1.5–1.6 |

**Cost, measured.** The OpenRouter key's `usage` (read-only `GET /api/v1/key`)
was $0.169082 before the run and $0.254018 right after it: $0.0849 for all 100
requests. A later read, after about $0.0016 of probes below, showed $0.259158,
so a little more settled late; the run cost $0.085–0.088. Subtracting the
default's estimate leaves $0.076–0.079 for `:nitro`'s 50 answers.

## The three empty answers

`teacher-count-en`, `-es` and `-ary` on `:nitro`. Each called
`teachers_get_teacher` (get one teacher by ID) with `{}` ten times, got the same
validation error each time, and reached the 10-step limit without an answer. The
default variant called `teachers_get_teacher_count` and answered 50 in all five
languages; `:nitro` did in French and Arabic.

A direct OpenRouter probe outside School (three tools: the count, get-by-ID and
list; a one-line system prompt; questions in en/es/Darija) shows the cause:

| Route | Host | Tool name returned | Arguments |
|---|---|---|---|
| `:nitro`, 12 requests | Cerebras, all 12 | `teachers_get_teacher`, 12/12 | `{"academicYear": null}` or `""` |
| default, 6 requests | AkashML, all 6 | `teachers_get_teacher_count`, 6/6 | `{"academicYear": null}` |
| Groq pinned, 6 requests | Groq | none: 502 | Groq rejected `academicYear: null` against the schema |

Cerebras returned the count tool's arguments under a name with `_count` cut off,
which is a different, real tool. The model did not choose wrongly; the host
reported the call wrongly. Groq, the other fast host, refuses School's optional
parameters when the model sends `null`.

## Decision

Not adopted. `:nitro` is three times faster at the median and eight times
faster at p95, but it lost 3 of 50 answers to a host bug that reproduces every
time, and costs about eight times more. The saved model stays
`openai/gpt-oss-120b`.

Ways back to a faster host, not done:

- Rename tools so no tool name is a prefix of another (`teachers_get_teacher`
  vs `teachers_get_teacher_count`), then re-test Cerebras.
- Pin a host that is both correct and fast through OpenRouter provider routing;
  `najm-chatbot` does not pass provider preferences today.
- Stop a run of identical failing tool calls early in `najm-chatbot`; here the
  same failing call ran ten times.

## Limits

One run of 50 pairs on a dev server. Host speeds and bugs change; recheck
before relying on either finding.
