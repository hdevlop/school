# Where the input tokens go, and a shorter system prompt — 2026-10-04

Phase 2 item 6: measure the history, tool-schema, tool-result and system
tokens of each model step, and shorten what correctness allows.

## Method

A local proxy forwarded every chat request unchanged to OpenRouter
(`openai/gpt-oss-120b`, default route) and replayed it three times without
streaming, `max_tokens` 16: as sent, without the tools, and without the system
message. The `prompt_tokens` differences are the exact token counts of the tool
definitions and of the system message (School's prompt plus the year and
signed-in person context); the rest is the conversation: the question, tool
calls and tool results. The saved AI settings pointed at the proxy for the run
and were restored to `https://openrouter.ai/api/v1` afterwards. Per-request
counts, without bodies: [context-tokens-20261004.json](context-tokens-20261004.json).

## Before: the system message is more than half

All 50 questions, 99 model requests, 173,776 input tokens
([run](context-full50-before-20261004.json): 50/50 checks):

| Part | Tokens | Share |
|---|---|---|
| System message, 960 per request | 95,051 | 55% |
| Conversation (question, tool calls, results) | 45,616 | 26% |
| Tool definitions, 44 per tool, about 345 per request | 33,109 | 19% |
| Served from the provider's cache | 320 | 0% |

Every model step resends the system message and the tools; a two-step answer
pays for them twice. Tool results are the only part that grows: under 100
tokens on first steps, 4.3k at the 90th percentile on later steps. Prompt
caching does not happen on the default route, so the repeated prefix is paid
for in full each time.

## The change

The chat cannot write. najm-chatbot blocks every tool that carries a
confirmation, and najm-mcp gives one to every write: declared with `confirm`
on School's create and update tools, inferred from the name for delete and
refund. A third of the prompt was nevertheless recipes for creating records
("REQUIRED LOOKUPS BEFORE EACH CREATE", what to do when a create returns
not-found). These are removed. The prompt now says the chat cannot create,
update or delete and must never say a change was made. ID and name resolution
for reads, language and style rules are unchanged.

## After

| Run | Checks | Input tokens | Model requests | System message per request |
|---|---|---|---|---|
| 50 questions, before | 50/50 | 173,776 | 99 | 960 |
| 50 questions, after ([run](context-full50-after-20261004.json)) | 50/50 | 137,204 (-21%) | 94 | 644 |
| Language-risk set ×3, 2026-10-03 ([run](language-after-reminder-20261003.json)) | 36/36 | 148,352 | 72 | |
| Language-risk set ×3, after ([run](language-trimmed-prompt-20261004.json)) | 36/36 | 82,732 (-44%) | 59 | |

No wrong-language reply and no false write claim in either set after the
change. The steps saved are blocked writes: five of the ten in the 50
questions now refuse at once instead of first calling the write tool or
searching for a student the write could not use. Latency in these runs moved
with the host as before and is not attributed to the change.

The remaining parts are left as they are: tool definitions (19%) cannot shrink
without dropping tools the router needs ([tool cap](tool-cap-20261004.md)), and
the conversation is mostly the tool results the answer is built from.

## Limits

One run of each set. One Arabic attendance refusal asks for the student's ID
"so that I can record the absence", an offer the chat cannot keep; the same
kind of reply occurred before the change. If a future najm-chatbot can run
confirmed writes, the create recipes must come back with that change.
