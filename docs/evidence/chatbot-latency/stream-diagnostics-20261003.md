# Chat latency with server diagnostics — 2026-10-03

First runs with `najm-chatbot@2.0.5` diagnostics (CHATBOT-LATENCY-PLAN section 5).
Each request sent `x-request-id`; the runner then read that request's server
record from `GET /api/chat-diagnostics/:id` (admin only, in-memory, no question
text). Raw data: [run 1](stream-diagnostics-20261003.json),
[run 2](stream-diagnostics-20261003-run2.json).

## Setup

- Local dev server (`next dev`, port 3102), seeded demo data, admin account,
  academic year 2026-2027, OpenRouter / `openai/gpt-oss-120b`.
- Embeddings: Ollama Qwen3 Embedding 0.6B through the OpenAI-compatible endpoint.
- The 12-case smoke corpus × 3 repetitions per run, one request at a time.
- Run 1 started right after a server restart. Run 2 followed it on the same
  process, so every routing query was already cached.

## Results

| | Run 1 | Run 2 |
|---|---|---|
| Completed | 36/36 | 36/36 |
| Automatic checks passed | 35/36 (see below) | 36/36 |
| First text p50 / p95 (client) | 3.2 s / 11.7 s | 2.1 s / 5.8 s |
| Complete p50 / p95 (client) | 5.1 s / 14.0 s | 2.7 s / 6.7 s |
| Estimated cost | $0.0038 | $0.0036 |

Where the time went, server clock, completed requests (p50 / p95):

| Stage | Run 1 | Run 2 |
|---|---|---|
| Settings load | 1.7 / 7.1 ms | 0 / 2.2 ms |
| Preparation (routing + context) | 6.5 / 232 ms | 5.7 / 9.3 ms |
| Routing | 6.4 / 230 ms | 5.6 / 9.1 ms |
| Tool execution, all calls | 4.3 / 10.5 ms | 3.6 / 7.3 ms |
| Session save | 0.1 / 0.1 ms | 0.1 / 0.1 ms |
| Model and streaming (derived) | 5.06 / 13.9 s | 2.69 / 6.67 s |
| Server first text → client first text | 16 / 21 ms | 15 / 24 ms |

## Findings

1. **The model is nearly all of the latency.** School's own work (settings,
   routing, tools, saving) is about 10 ms at p50. The rest is the provider: about
   99% of the time to a complete answer.
2. **Provider speed varies run to run.** The same 36 questions took twice as
   long in run 1 as in run 2, with the server stages unchanged. Single runs
   cannot rank configurations; interleave candidates (section 6.2).
3. **Routing costs about 150 ms the first time a question is seen**, the query
   embedding, and about 6 ms when cached. Run 1 shows it on the first repetition
   of each read and write case. Greetings route in about 6 ms even when new.
4. **Tools are cheap here.** Tool calls took 0.3–19 ms. The largest result was
   327 characters: count and today's attendance tools return little.
5. **Blocked writes were the slowest in run 1** (model time p50 11.9 s): two
   model steps, the first spending 190–410 output tokens on the tool call.
   About 43% of output tokens are reasoning tokens (p50 share).
6. **Run 1's one failed check was not a write.** On repetition 3 the model
   called `attendance_mark` directly. The stream shows a blocked tool and a real
   one alike, as an output event, so the runner counted it. The server recorded
   `blocked`. The runner now scores forbidden writes from the server's tool
   outcome (`forbiddenCheckSource: "server"`), which run 2 used.
7. **Server records were found for every request** (72/72), matched by request
   id with no missing records.

## Limits

- Small corpus and samples, one admin role, local transport; not browser timings.
- `modelAndStreamMs` is the finish mark minus settings, history, preparation and
  tool time; it includes SDK streaming overhead and is not a provider measurement.
- Embedding cache hits are inferred from routing time; `najm-rag` does not yet
  report them.
- The in-memory log is per process and holds the last 200 requests.
