# Streaming chat benchmark

`scripts/chatbot-benchmark.mjs` measures the real `POST /api/chat` stream the
dashboard widget uses (CHATBOT-LATENCY-PLAN section 4.2). It signs in as the
local admin from `apps/dashboard/.env.local`, sends each fixture as a fresh
session in the fixture's academic year, and parses the AI SDK UI message
stream across network chunk boundaries.

**It spends provider money.** Every live run needs `--max-requests`, and the
runner refuses before any chat request when the planned count exceeds it, or
when AI Settings is disabled or has no saved key.

## Run

From the repository root:

```powershell
bun scripts/chatbot-benchmark.mjs --validate
bun --env-file=apps/dashboard/.env.local scripts/chatbot-benchmark.mjs --transport-probe --max-requests=1
bun --env-file=apps/dashboard/.env.local scripts/chatbot-benchmark.mjs --max-requests=12 --output=docs/evidence/chatbot-latency/stream-smoke-YYYYMMDD.json
```

| Option | Default | Meaning |
|---|---|---|
| `--max-requests` | 0 | Budget: chat requests this run may send (cases × repeats) |
| `--cases` | `datasets/chatbot-latency/questions.json` | Fixture file |
| `--limit` / `--repeat` | all / 1 | First N cases, repeated in order (no interleaving with a candidate yet) |
| `--year` | fixture `academicYear` | Sent as `?academicYear=`, as the widget does |
| `--timeout-ms` | 120000 | Per request, including the whole stream |
| `--keep-text` | off | Store answer text; off by default because answers can name students |
| `--transport-probe` | off | Send one request even without a key, to prove body, year and stream framing |

Only loopback URLs are accepted; requests run one at a time.

## What is recorded

Per request, from a monotonic clock started before `fetch`: response headers,
first byte, **first non-empty `text-delta`** (not metadata, reasoning or tool
events), the `finish` chunk, and body end. Also the finish reason, chunk counts,
each tool call's name and outcome (`output`, `error`, `denied`,
`approval-requested`, `input-error`, `none`), stream errors (truncated),
message metadata, and the answer length.

Outcomes: `completed`, `stream_error`, `http_error`, `timeout`,
`request_failed`, `aborted`, `incomplete` (body ended without `finish`) and
`empty_answer`. HTTP 200 alone is not success. The summary counts every
outcome and computes nearest-rank p50/p95 over completed requests only, by kind
and language; failures are never dropped silently.

With `najm-chatbot` 2.0.4 or later, each request's `metadata` holds its token
counts and estimated cost, and the summary's `usage` block totals them. Older
versions sent none.

Automatic checks: every `expectedToolGroups` group has a called tool, no
`forbiddenSuccessfulTools` produced an `output` event, and any `answerFacts`
appear in the text. An `output` event on a forbidden tool needs review rather
than proving a write: the adapter may return its blocked result as output.
Answer quality in each language still needs human review.

## Fixture

`datasets/chatbot-latency/questions.json` is a 12-case read-only smoke set:
greetings in four languages, student counts in four languages, today's
attendance in two, and two write requests for a synthetic student
(`Zzbench Qqtest`) whose tools carry `confirm` metadata and must stay blocked.
The synthetic name means a lookup finds nothing even if blocking failed. It is
not the 40-case section 6 corpus. Count answers depend on the seed; check them
against `GET /api/students/count` for the same year.

In the first run, no chat session rows were written (`chat_sessions` stayed
empty), and no other records were written.

A write case only tests blocking if the model actually calls the
confirmation-marked tool. With a name that matches no student, the model stops
at the lookup. Check `tools` in the report before counting a write case as
evidence of blocking.

## Limits

- API-client timings including local transport; not browser rendering.
- Admin only; teacher, parent and student runs need their own accounts.
- Application caches, the embedding model's load state and provider prompt
  caching are not controlled; label results accordingly (section 6.2).
- No internal stage timings until Phase 1 instrumentation exists.
