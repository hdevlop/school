# School chat module

Start with `index.ts` for the classes Najm registers and
[`config/chatbotConfig.ts`](../../config/chatbotConfig.ts) for the reply pipeline.
Runtime `@sms/server/jev-*` exports keep their names; callers should use them rather
than reaching into another workspace's source files.

| Folder | Responsibility |
| --- | --- |
| `replies/` | Language detection and localized write refusals |
| `jev/` | Classifier, Decisions protocol, wording, guards and four result formatters |
| `routing/` | Query-only Darija discovery hints, routing phrases (`semantics.json`) and provider policy |
| `transport/` | Selected year/date metadata, release controls and response/failure handling |
| `diagnostics/` | Fixed diagnostic records and guarded read endpoints |

Normal flow: existing actor/year boundary → write refusal → eligible guarded Jev
candidate → router/OSS20B fallback → existing authorized MCP execution.
See [the archived implementation record](../../../../../docs/archive/plans/CHATBOT-JEV-ROUTER-PLAN.md) for enabled scope
and rollback.

Chat does not look up a parent's children or preload a student/teacher identity.
For personal requests, the existing `students`, `parents` and `teachers`
controllers expose `getMyIdentity`. It takes the user ID from `@User`, requires
the module's read permission and calls its existing owned repository. Only the
record ID and name are returned; null fields mean no matching identity. The router
offers these tools with the appropriate child/profile tools. Jev and the answer
model select reads; controllers and repositories authorize their execution.

`SchoolChatRequest` keeps only the already-validated selected year and school date,
and delegates existing knowledge. It performs no entity lookup or
role-based access decision. Jev results explicitly describe their accessible
scope so an owned subset does not appear to be a school-wide total. Personal
answers now use router/20B tool chaining instead of identity-dependent renderers.

Jev has nine runtime files, each with one main responsibility:

| File | Responsibility |
| --- | --- |
| `jevIntents.ts` | Intent definitions, protocol types and provider constants |
| `jevWording.ts` | The one provider request shape used for eligible reads |
| `jevDecision.ts` | Validate provider decisions and confidence/write agreement |
| `JevIntentClassifier.ts` | Eligibility, provider calls, cancellation and fallback |
| `JevToolReranker.ts` | Picks one of the router's candidate tools (najm-rag `rerankTools`) |
| `JevRequestContext.ts` | Request context and the framework preparation hooks |
| `jevReplyPlan.ts` | Supported read scope and authorized result formatting |
| `guards/countGuard.ts` | Count wording and explicit name/list exclusions |
| `guards/queryGuard.ts` | Semantic checks, aliases, vocabulary and guarded acceptance |

The historical wording builders and numbered profile selector are removed.
Only the four supported read intents reach the provider; their request wording is
preserved. Unsupported requests use the existing router/model path. The
`@sms/server/jev-intents`, `jev-wording` and `jev-query-guard` package paths remain
available without extra source facade files.

The `replies/` folder has three files: `schoolReplyLanguage.ts` detects the language
of refusals, `schoolReplyWrite.ts` recognizes writes and returns localized refusals,
and `schoolAnswerLanguage.ts` names the answer's language, which `SchoolChatRequest`
tells the model on every message (French, English, Spanish, Arabic or Darija in
Arabic script for Darija and Arabizi).
`jev/jevReplyPlan.ts` owns the four supported Jev result formatters and their
accessible-data scope notices. `transport/schoolChatControls.ts` owns the release
switch, Jev settings and first-turn parsing. The model configuration and transport
share the provider policy in `routing/schoolOpenRouterProvider.ts`. General and filtered read
questions use router/OSS20B. There is no local filtered phrase catalog, record
join/calculation layer or question-specific prompt-hint provider. Successful empty
reads remain distinct from failures.

`jev/guards/countGuard.ts` checks count wording and explicit name/list exclusions.
`jev/guards/queryGuard.ts` applies semantic checks, bounded phrase aliases and
positive vocabulary checks, including the supported exam wording. These checks
decline ambiguous or filtered shortcuts; module guards still authorize every read.
`queryGuard.ts` exports the runtime API (`queryVeto`, `explainQueryVeto`,
`acceptsWithQueryGuard`). Earlier numbered implementations remain in Git and
the existing evidence archive.

Benchmark controllers, session grants, experimental scheduling, process ledgers,
comparison CLIs and their tests have been removed. Shadow mode is retired;
`CHATBOT_JEV_MODE` accepts only `off` or `on`. Ordinary chat has no spending ledger,
monthly budget or price tracking. `transport/` keeps provider dispatch constraints
and removes SDK token/pricing metadata before the widget receives a reply.
Administrator diagnostics retain timings and outcomes without token or cost fields.

`routing/semantics.json` holds example phrases (Darija, Arabizi, French, Arabic,
English) for everyday read tools, and `routing/semantics/<feature>.json` one
feature's phrases each (written as `docs/chat-routing` describes, at most 12 per
tool). `routing/seedSemantics.ts` merges them; `ragConfig.ts` passes the result
as `seedSemantics`:
after boot tool indexing, najm-rag adds the phrases a database does not have
yet and leaves stored ones (and studio edits) alone, so a new phrase in the
file reaches every database on its next start. A phrase deleted or reworded in
the studio comes back while it is in the file; change it here instead.
Phrases were written from tool descriptions, not from the test fixtures; keep
it that way so the fixtures stay a fair test. With Qwen3 Embedding the routing
threshold is 0.68 (`ragConfig.ts`).

With `CHATBOT_JEV_RERANK=on`, Jev also judges every routed message: najm-rag
shows it the router's candidate tools with their descriptions, and a pick at
confidence 0.85 leads the list (with its dependencies and the router's next 3),
at 0.3 moves to the top. Jev also sees tools down to 0.64 similarity; one below
the 0.68 threshold is used only at 0.85. "None", a lower confidence, a malformed
answer or no answer in 0.8 s keeps the router's order; after three failures in a row Jev is
skipped for 30 s. It needs an OpenRouter key in the AI settings and najm-rag
3.7.0 or later. It only reorders the tools offered: the tools still check access when they run. The
studio's routing preview reports the pick as `rerank`.

Stored phrases are embedded through the same hints and Darija rewrite as a
message. After changing either, change `ROUTING_TEXT_VERSION` in
`routing/schoolRoutingContext.ts`; after the deploy, run "Reindex semantics" in
the RAG studio (`/rag-studio`), whose dashboard counts the stale phrases.

Reviewed questions and fake HTTP/MCP data live under
`packages/server/tests/chat/fixtures/`; they never run a paid benchmark.
Verification uses `bun run test:chat`, `test:academic-years`, `test:security`,
`test:boundaries`, `lint`, `typecheck` and `build`.

`transport/schoolProviderResponse.ts` adapts the OSS20B provider completion before
the SDK dispatches tools: only observed terminal channel suffixes on offered
names are normalized, and tool-step planning text is withheld. Arguments stay
unchanged and module validation/guards still run. In an answer-only step,
`schoolAnswerPlanning.ts` cuts English planning OSS20B glued before the answer;
an answer that is planning only fails like any failed generation. It buffers one model completion
(at most 1 MiB), so answer text appears after that step finishes; it does not
buffer database reads or the entire multi-step chat. Attendance's MCP-only list
routes return module-owned evidence (`records`, `recordState`, `interpretation`)
so an empty read does not claim zero absentees. Dashboard list routes keep arrays.
The grades reads of all marks, one class, subject, teacher, test or exam work the
same way (`POST /grades/mcp/...`): they answer with `grades/gradeChatSummary.ts`
(averages per class, subject and student; each mark when a class has at most
150) because a class's raw rows (about 450 KB) left OSS20B unable to reply.
Formatting also applies to OSS20B calls without a request-local policy frame;
other models and unrelated fetches keep their original behavior. Up to four
repeated observed suffixes are recognized, with the same offered-name requirement.
