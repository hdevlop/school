# Chat routing: phrases and tests per feature

Each feature gets routing phrases and routing tests, written by **two separate
LLM sessions that never see each other's work**. If one head writes both, the
tests only check that the phrases agree with themselves.

| Who | Reads | Writes |
| --- | --- | --- |
| You | everything | `features/<feature>.md` (the brief) |
| Phrase writer (LLM A) | `prompts/phrase-writer.md` and the brief | `packages/server/src/modules/chat/routing/semantics/<feature>.json` |
| Test writer (LLM B) | `prompts/test-writer.md` and the brief | `packages/server/tests/chat/fixtures/routing/<feature>.json` |

People's questions stay in `packages/server/tests/chat/fixtures/human/` and are
never shown to either LLM.

## One feature, step by step

1. Write the brief: tools from the real `@McpTool` descriptions, who can read it,
   neighbours, tricky words. See `features/grades.md`.
2. LLM A: paste `prompts/phrase-writer.md` and the brief, then save the JSON.
3. LLM B: new session, paste `prompts/test-writer.md` and the brief, then save the JSON.
4. Read both files yourself. Delete phrases that are too general and tests that are
   not realistic.
5. Try it in the RAG studio (dev server running):
   `node scripts/chat-routing-to-studio.mjs <feature>` writes
   `out/chat-routing/<feature>.semantics.studio.json` (Semantics → Import JSON)
   and `out/chat-routing/<feature>.tests.studio.json` (Routing tests → Import →
   Run all). Studio imports go into the database; studio edits are not files.
6. When a test fails, tell LLM A the **kind** of failure ("Darija questions about
   one exam's results go to the exam calendar"), never the failing question.
7. Keep about 10 phrases per tool: a tool scores by its single best phrase, so
   more phrases pull other features' questions (see the grades numbers below).
   `tests/chat/RoutingSemantics.test.ts` refuses more than 12.
8. Add the file to `FEATURES` in `routing/seedSemantics.ts`; the next server start
   adds its phrases to the database. Run every earlier feature's tests again,
   then commit the feature.

## Status

| Feature | Audience | Brief | Phrases | Tests |
| --- | --- | --- | --- | --- |
| grades | staff, teachers | done | `semantics/grades.json`: 110 (10 per tool), loaded | `fixtures/routing/grades.json`: 200 (70% Darija) |

### Grades, measured 2026-11-16 (Qwen3 Embedding, 200 test questions)

| Phrases per tool | Right tool first | Right tool offered | Other features (82 older questions) |
| --- | --- | --- | --- |
| none | 12% | 51% | 45 right first |
| **10 (kept)** | **33%** | **74%** | **44** |
| 15, most different Darija | 33% | 75% | 40 |
| 20 | 36% | 76% | 39 |
| 60 (all written) | 39% | 78% | 39 |

Two follow-ups, same questions:

- New phrases for 4 weak tools with invented student names in them: 32% right
  first, no better. The names matched "a question naming a person": 12 of 20
  questions about a teacher's marks went to one student's marks. **Keep names
  out of phrases.**
- A report-card hint in `schoolRoutingContext.ts` (bulletin, كشف النقط, kachf
  nno9at...): every other grades question carried the one-student hint, and a
  bulletin alone carried none. **37% right first** (66 -> 74), Darija 29% -> 32%,
  other features unchanged (44 of 82). Kept.

Still weak: a section's marks (2 of 22), one test's results (3 of 21) and the
report card (6 of 24); 19 questions get no tool.

### Jev as a second judge, measured 2026-11-16

The router's candidates for the 200 grades questions and 120 older fixture
questions, judged by Jev through najm-rag's `rerankTools` rules
(`JevToolReranker.ts`, about $0.00003 and 0.25 s per message):

| | Router alone | With Jev | Right before, wrong after |
| --- | --- | --- | --- |
| Grades, right tool first | 74 (37%) | **94 (47%)** | 0 |
| Grades, Darija only | 45 of 140 | 53 of 140 | |
| Older questions | 44 of 82 | **52 of 82** | 2 |

The right tool is among the router's 8 candidates for 83% of grades questions:
Jev can only choose among them, so phrases, hints and tool descriptions still
decide the rest. Showing Jev near misses below the threshold rescued none of the
19 grades questions that get no tool. Lower confidence cuts (0.5 to 0.6) gained
2 more and lost 3 to 7. Jev did worse than the router on a teacher's marks and
school KPIs: their descriptions were too thin. Reworded, and measured
on the running dev server with Jev on: **94 of 200** right first (Darija 54 of
140), a teacher's marks 7 of 20 (4 with the old wording), KPIs 12 of 15 (9), older
questions 52 of 82. Jev answered all 181 questions it was asked.


Then the five thin grades descriptions (all marks, one test, one exam, one
class, one subject) were reworded to say what each read covers and which
narrower read answers a named class, test or exam, and Jev reads the message
followed by the router's Arabic rewrite of its Darija words
(`withArabicRewrite`). Measured on the dev server:

| Grades, right tool first | Router alone | With Jev |
| --- | --- | --- |
| All 200 | 73 (37%) | **109 (55%)** |
| Darija only, of 140 | 45 | 67 |
| One class, of 22 | 2 | 11 |
| One subject, of 18 | 6 | 12 |
| One test, of 21 | 3 | 8 |
| One exam, of 19 | 7 | 11 |
| Older questions, of 82 | 44 | 53 |

The router alone did not change (72 to 74 before), so the gain is Jev's. A
Darija word list in Jev's instructions gained 6 more grades questions but lost
3 to 4 older ones, so it was left out. Still open: 19 grades questions get no
tool, and greetings get a tool (11 of 38 no-tool questions right).
