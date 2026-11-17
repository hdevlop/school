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

## Phrases per tool: at most 12

`MAX_PER_TOOL` in `packages/server/tests/chat/RoutingSemantics.test.ts`. A tool
scores by its single best phrase. Measured 2026-11-16 on 200 grades questions:
10 phrases per tool tripled grades routing (12% to 33% right tool first) and
left 120 other questions almost unchanged (45 to 44 of 82); 20 or 60 per tool
pulled other features' questions (39 of 82).
