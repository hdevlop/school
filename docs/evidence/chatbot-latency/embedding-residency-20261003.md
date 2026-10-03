# Embedding residency, timeouts and failure paths — 2026-10-03

Phase 2 items 1–3 of `CHATBOT-LATENCY-PLAN.md`, measured on the second
workstation: Ollama 0.35.0 on Windows, CPU only (Intel UHD graphics, no GPU
offload), 15.7 GB RAM with 6.4 GB free, serving `qwen3-embedding` (Qwen3
Embedding 0.6B Q8_0) through `http://127.0.0.1:11434/v1`. Ollama starts at
login from a Startup shortcut. `OLLAMA_KEEP_ALIVE` is not set, so a model
unloads after five idle minutes.

The scripts call Ollama directly, not through School, and write nothing.

## Query embeddings, cold and warm

Five rounds: unload the model (`keep_alive: 0` on `/api/embed`, confirmed by
an empty `/api/ps`), embed one query, then six warm queries in en/ar/Darija/fr/es
with School's Qwen query instruction.

| | Time |
|---|---|
| Cold (model loads first) | 1,601 / 1,668 / 1,580 / 1,640 / 1,879 ms |
| Warm, p50 (n = 30) | 137 ms |
| Warm, p95 (n = 30) | 244 ms |

The model file was in the OS file cache. A first load after a reboot reads it
from disk and is not measured here.

So the first chat message after five quiet minutes spends about 1.5 s more
before the model starts, against a 4.2 s p50 complete answer
([full50](full50-20261003.md)). Repeated questions avoid it through najm-rag's
query cache.

## Keeping the model loaded

- **`keep_alive` per request does not work on this path.** A `/v1/embeddings`
  request with `keep_alive: "2h"` still expired five minutes later. Only the
  native `/api/embed` honours it, and School uses the OpenAI-compatible one.
  The remaining switch is `OLLAMA_KEEP_ALIVE` in Ollama's environment, which
  applies to every model Ollama serves, not just this one.
- **Memory.** Loaded, the model takes 2,261 MB at its default 4,096-token
  context; 2,029 MB at 2,048 and 2,725 MB at 8,192. Shrinking the context
  saves little; most of it is the model.
- **Not applied.** Keeping it resident (`OLLAMA_KEEP_ALIVE=-1`, or a long
  duration) holds about 2.2 GB of a 15.7 GB machine permanently, and does
  the same for any chat model loaded in the same Ollama. That is the owner's
  call; the cost of not doing it is the 1.5 s above.

## Indexing versus queries

School sends indexing batches of 4 (`RAG_EMBEDDING_BATCH_SIZE`), najm-rag's
default is 16. Timed with the stored text of the 431 indexed tools (longest
1,110 characters, median 129):

| Request | Time |
|---|---|
| 16 longest texts, cold | 16,258 ms |
| 16 longest texts, warm | about 14,000 ms (three runs) |
| 16 texts of the middle length, warm | about 4,400 ms |
| All 431 tools, batches of 16, warm | 151 s |

An indexing request takes up to a hundred times longer than a query. najm-rag
2.1.4 gives both the same `timeoutMs`; School sets 60,000 ms
(`RAG_EMBEDDING_TIMEOUT_MS`). The package default of 8,000 ms would time out
the longest batches of 16 on this machine.

## Failure paths, read in najm-rag 2.1.4 and najm-chatbot 2.0.5 source

- Routing catches an embedding failure and falls back per
  `fallbackOnRouterError` (`all` in School).
- Knowledge search then embeds the message again. School has knowledge on
  (`knowledge: true`) with **no documents** (`chatbot_document_embeddings`
  is empty), so this call can only ever find nothing.
- Its failure was not caught: `KnowledgeContextProvider.getContext` threw,
  `prepare` threw, and the chat ended as `setup_error`. With the embedding
  server down, the `all` fallback never reached the model, and a hung server
  cost up to two 60 s waits before that error.
- Since najm-rag 2.1.3 routing embeds the Darija rewrite while knowledge
  embeds the original text, so a Darija message paid for two embedding
  calls (about 140 ms warm) instead of sharing one through the cache.

## The `all` fallback's size

From a snapshot of the running server's tool list taken that morning (430
routable tools; a few were added later in the day), the tool
definitions alone are about 180,000 characters, roughly 51,000 tokens, sent
again on every model step. A routed answer carries about 12 tools, roughly
900 tokens. The fallback therefore trades a failed answer for a much slower
and more expensive one; it was not run against the model.

## Changes made

- **najm-rag 2.2.0:** `embedding.queryTimeoutMs` bounds routing and knowledge
  queries while indexing keeps `timeoutMs`; `embedding.queryFailureCooldownMs`
  makes questions skip the provider for a window after a timeout or refused
  connection; knowledge search skips the embedding while no document is
  indexed; a failed knowledge search no longer fails the chat.
- **najm-chatbot 2.1.0, then 2.1.1:** with `fallbackOnRouterError: 'none'`, a
  routing failure appends a notice telling the model the data is unreachable.
  2.1.1 also puts it before the app's prompt and forbids tool calls in text.
- **School:** question timeout 5 s (`RAG_EMBEDDING_QUERY_TIMEOUT_MS`), window
  30 s (`RAG_EMBEDDING_QUERY_COOLDOWN_MS`), indexing still 60 s, and
  `fallbackOnRouterError: 'none'`.
- **This workstation:** `OLLAMA_KEEP_ALIVE=-1` for the Windows user; a
  restarted Ollama reported the loaded model expiring in the year 2319.

## Live outage check

Dev server, saved model `openai/gpt-oss-120b`, admin, questions from
[`outage-cases.json`](../../../datasets/chatbot-latency/outage-cases.json)
(student count en/fr/Darija, teacher count es, each with a short prefix so the
query cache cannot answer them). Ollama stopped for the outage runs.

| Run | Answers | Complete | Input tokens |
|---|---|---|---|
| Ollama up ([json](outage-ollama-up-20261003.json), original wording) | 4/4 correct, routed | 2.3-3.6 s | about 2,800 |
| Down, chatbot 2.1.0 ([json](outage-chatbot-2.1.0-20261003.json), [repeat](outage-chatbot-2.1.0-repeat-20261003.json)) | 4 of 10 said the data was unreachable; others wrote a tool call as text, said "We will call ...", "{}", or nothing | 1.5-7.7 s | about 1,050 |
| Down, chatbot 2.1.1 ([json](outage-chatbot-2.1.1-20261003.json)) | 12/12 said the data was unreachable, in the question's language | 0.8-6.6 s | about 1,200 |

Every outage request: `routingStatus` `router_error` after 1-7 ms (refused,
then the 30 s window), knowledge 1.5-2.6 ms, no tools, no failed chat. With najm-rag
2.1.4 the source shows the same outage ending each chat as `setup_error`
(read, not run live).

**Recovery** ([json](outage-recovered-20261003.json)). Restarting Ollama
first installed a pending Ollama update (0.35.0 to 0.35.1), which stopped
the server for about two minutes; two more runs during it failed fast the
same honest way. Once it answered, the same four questions routed and were
correct again: the first paid a 2.4 s model load inside the 5 s question
timeout, the next three routed in 211-257 ms. The updated Ollama kept the
model with `expires_at` in the year 2319.
