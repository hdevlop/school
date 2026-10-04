# Cerebras tool-name truncation: prefix probe — 2026-10-04

The 2026-10-03 [full-50 `:nitro` run](model-nitro-full50-20261003.md) lost three
teacher-count answers because Cerebras returned `teachers_get_teacher_count`
calls as `teachers_get_teacher`, a real tool whose name starts the other one.
This probe tested whether removing the prefix relation fixes it.

## Method

Direct OpenRouter calls outside School: `openai/gpt-oss-120b`, provider pinned to
Cerebras (`order: ['cerebras'], allow_fallbacks: false`), one-line system prompt,
three tools (count, get-by-ID, list) and three count questions (en, es, Darija),
twice each per variant, the variant order alternating. 12 requests, all served
by Cerebras, HTTP 200.

| Variant | Get-by-ID tool name | Tool returned for "how many teachers" |
|---|---|---|
| Original | `teachers_get_teacher` | `teachers_get_teacher`, **6/6** (wrong) |
| Renamed | `teachers_get_teacher_by_id` | `teachers_get_teacher_count`, **6/6** (right) |

Each request took 0.27–0.45 s. Arguments were `{}`, `{"academicYear": null}`,
`{"academicYear": ""}` and once an invented `{"academicYear": "2023-2024"}`.

## Change

School renamed every tool whose name started another one: 54 controller
methods (`getTeacher` → `getTeacherById`, `delete` → `deleteById`, `getStaff` →
`listStaff`, ...). REST routes are unchanged; only MCP/chat tool names change.
`ChatReadOnlyTools.test.ts` now fails if any tool name starts another.

The year tool input also became `z.string().nullish()`: `najm-mcp` parses it
with `schema.parse`, and the previous `.optional()` threw on the `null` that
models send for unused optional arguments.

## Routing check after the rename

Routing-only preflight (no provider calls) on an isolated app: core 18/20 and
Darija/French 30/31, the same three failing cases as the recorded
[`routing-cap-*`](routing-cap-core-20261004.json) runs. No old tool name
appeared in any match. The tool index still held the 54 old names (485 indexed
for 431 registered): `najm-rag` indexing does not prune tools that no longer
exist.

## Full corpus, default vs `:nitro`, after the rename

`--compare-model=openai/gpt-oss-120b:nitro` on an isolated production build
(port 3105), admin, `2026-2027`, uncontrolled caches. The corpus in
`questions.json` held 30 cases (fr, ar, Darija) at run time, so 60 requests.
Declared budgeting prices: [prices](tool-rename-nitro-prices-20261004.json).
Raw data: [run](tool-rename-nitro-full50-20261004.json).

| | Default | `:nitro` |
|---|---|---|
| Completed | 30/30 | 30/30 |
| Automatic checks passed | 27/30 | 24/30 |
| First text p50 / p95 | 6.10 s / 32.0 s | **0.83 s / 3.06 s** |
| Complete p50 / p95 (max) | 8.18 s / 39.4 s (51.8 s) | **0.88 s / 3.15 s** (3.18 s) |
| Tokens in / out (reasoning) | 125,677 / 7,690 (5,764) | 127,916 / 7,778 (5,211) |
| Cost per 1,000 answers, listed rates | ≈ $0.20 (DeepInfra/AkashML) | ≈ $1.69 (Cerebras) |

- **The truncation is gone.** Every `:nitro` teacher-count and
  students-and-teachers request, in all three languages, called
  `teachers_get_teacher_count` and gave the right number. There were no empty
  answers and no repeated failing calls. The one `:nitro` tool error was
  `grades_get_student_report` refusing the deliberately missing student.
- **Failures were language and register flags, on both routes.** Both answered
  `student-count-fr` in Arabic and flagged `classes-ar`'s register. The default
  also answered `teacher-count-fr` in Arabic. `:nitro` answered three Darija
  questions in Modern Standard Arabic (`wrongRegister`) and mixed languages in
  `students-and-teachers-fr`. Answer text was not stored, so none of these
  flags has been reviewed by hand.

An earlier attempt on a dev server stopped after 43 samples: hot reload
re-initialized the server mid-run and Najm refused the duplicate decorator
metadata ("Duplicate transaction injection detected"). Its unknown-cost
request stopped scheduling as designed. Kept as
[interrupted run](tool-rename-nitro-full50-interrupted-20261004.json); the
saved model was left at `openai/gpt-oss-120b`.

## Limits

One repetition of 30 cases; no English or Spanish in this corpus. The probe
used three tools and a minimal prompt. Language and register checks are
heuristics, unreviewed here. Host behavior can change.
