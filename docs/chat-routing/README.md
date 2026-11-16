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

Still weak: one student's marks, the report card and a section's marks are
confused with each other (about 10% right first each); 21 questions get no
tool; Darija scores 29% right first against 43% for the other languages.
