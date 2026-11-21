# Chat routing: measured settings

The numbers behind School's tool-routing settings. The code keeps the value and
a one-line reason; the measurement that chose it is here. Add a dated entry when
a setting changes.

## Qwen3 embedding threshold: 0.68

`MODEL_PRESETS['qwen3-embedding'].similarityThreshold` in
`packages/server/src/modules/chat/routing/embedding.ts`.

Qwen scores unrelated tools around 0.6-0.7, so najm-rag's 0.45 default offered
tools to every greeting. Measured 2026-11-15 on 787 held-out School messages
(fr, ar, Darija, Arabizi):

| | 0.45 (najm-rag default) | 0.68 |
| --- | --- | --- |
| Small talk given tools | 84 of 84 | 18 of 84 |
| Right tool given | 91% | 92% |
| Requests given no tool | 0% | 2% |

EmbeddingGemma has no preset on purpose: with neither prefix set, najm-rag
applies its retrieval prompts and the 0.35 threshold measured with them.
Setting a prefix, even to `''`, keeps the 0.45 default, which is too strict for
prompted scores.

## Routing text: phrases and messages get the same rewrite

`rewriteRoutingQuery` in `packages/server/src/config/ragConfig.ts`.

Stored phrases go through the same Darija-to-MSA rewrite as messages, hint
lines included (no `rewriteRoutingPhrase`). Embedding phrases with the Darija
rewrite alone was measured 2026-11-16 on 120 fixture questions: the right tool
ranked first fell from 45 to 37 of 82, and none improved. Phrase and message
must carry the same hints to stay comparable.

## Jev rerank: promoteAt 0.3, minSimilarity 0.64, dropAt 0.9

`JEV_RERANK_THRESHOLDS` in `packages/server/src/modules/chat/jev/JevToolReranker.ts`,
on when `CHATBOT_JEV_RERANK=on`.

A pick at 0.85 leads with its dependencies and the router's next 3; at 0.3 it
moves to the top and the router's tools stay offered. "none", a failure or no
answer in 0.8 s keeps the router's order. Jev also sees tools down to 0.64
similarity, but one below the 0.68 threshold is used only at 0.85.

Measured 2026-11-16 on the router's candidates for 320 fixture questions,
against najm-rag's 0.7 promote and no near misses:

| | najm-rag 0.7, no near misses | School's thresholds |
| --- | --- | --- |
| Right tool first, 200 grades questions | 104-108 | 127-132 |
| Right tool first, 82 older questions | 54-55 | 56-57 |
| No-tool questions | unchanged | unchanged |

Promoting every pick gained 3 more grades but lost older ones.

`dropAt` 0.9 (najm-rag 3.8.0): on the router's candidates Jev said none at
0.91-1.0 for greetings, follow-ups and "how do I change my password", and below
0.85 for every question that needed a tool (2026-11-17): none were lost.

## Class tests are exams (2026-11-21)

`schoolRoutingContext.ts` (`classTests` vs `quizzes`), the exam, assessment and
grades tool descriptions, `semantics/grades.json`, `semantics.json` and
`toolDependencies.ts` (`exams_get_by_section` brings `grades_get_by_exam`).

The demo school records every contrôle as an exam of type test (222 exams, 0
assessments), but fard / contrôle wording routed to `grades_get_by_assessment`,
which answered "none found". 18 of the 21 grades fixtures that expected the
assessment read name a class test and now expect `grades_get_by_exam`; quizzes
stay assessments. Retired phrases are deleted by migration
`0137_retire_routing_phrases.sql` (the seed only adds). Qwen3 Embedding, Jev on,
320 fixture questions on the dev server:

| | Before (assessment read for tests) | After |
| --- | --- | --- |
| Test/exam results, the class's exam list or results read first, results offered | 31 of 40 led with the expected results read, 14 of them the (empty) assessment read | **32 of 37** |
| `grades_get_by_exam` itself first | 17 of 19 | 14 of 37 |
| Grades, right tool first (expected tool exactly) | 151-156 | 133 |
| Older questions, right tool first | 56 | 58 |
| Greetings and how-to given no tool | 12 of 14 | 12 of 14 |

Jev is asked which tool to call **first**, and for a class test that is the
class's exam list (the examId is there), so it promotes `exams_get_by_section`
for about half of these questions; the dependency keeps the results read
offered with it. "Right tool first" counts only the expected tool, so it fell
with them. Real chat, "وريني نتائج فرض الإملاء ديال CM1 A": sections → the
class's exams → `grades_get_by_exam`, each student's mark (OSS20B chose the
Orthographe test over the Arabic الإملاء one).

`academic-dashboard_get_kpis` returns marks recorded (`totalGrades`), not marks
pending; its description and four phrases said otherwise, and the chat reported
3,753 recorded marks as "tests still without marks". Both reworded; KPI fixtures
14-15 of 15 right first.

## Answers on OSS20B: flow, prompt and correction (2026-11-21)

`bun run eval:chat --runs 3`: 12 questions on the demo school (greetings, a
named student's marks, class tests, KPIs and counts), each asked 3 times as
the admin, OSS20B throughout. A pass needs the read called, the facts stated
and no failure text, leaked planning or stray-language words.

| Setup | Passed of 36 | Median |
| --- | --- | --- |
| `CHATBOT_FLOW` unset (default temperature, Cerebras first) | 18 (50%) | 2.9 s |
| `CHATBOT_FLOW=jev-router-20b` (temperature 0, CoreWeave, 4096 tokens) | 30 (83%) | 1.5 s |
| + system prompt: a named student is not personal; class tests are exams | 30 (83%), different failures | 1.6 s |
| + one corrective retry (`schoolCompletionCorrection.ts`) | **35 (97%)** | 1.8 s |

The flow alone removed every failure notice, leaked planning and stray
word. The prompt fixed the parent-account refusals for named students and the
class-test chain; the remaining two questions failed every run the same way
(temperature 0): an identity tool routing did not offer, and asking the user
for an exam ID. The correction fired 3 times (unoffered tool) and rescued 2.
Still wrong once: Rima's Arabic marks answered with her French ones.

For comparison, OSS120B on the default flow answered 12 of 15 of a smaller
set the same day; the qualified OSS20B flow with the correction does better.

## Phrases per tool: at most 12

`MAX_PER_TOOL` in `packages/server/tests/chat/RoutingSemantics.test.ts`. A tool
scores by its single best phrase. Measured 2026-11-16 on 200 grades questions:
10 phrases per tool tripled grades routing (12% to 33% right tool first) and
left 120 other questions almost unchanged (45 to 44 of 82); 20 or 60 per tool
pulled other features' questions (39 of 82).
