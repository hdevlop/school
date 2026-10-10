# School chat module

Start with `index.ts` for the classes Najm registers and
[`config/chatbotConfig.ts`](../../config/chatbotConfig.ts) for the reply pipeline.
Runtime `@sms/server/jev-*` exports keep their names; callers should use them rather
than reaching into another workspace's source files.

| Folder | Responsibility |
| --- | --- |
| `replies/` | Language detection and localized write refusals |
| `jev/` | Classifier, Decisions protocol, wording, guards and four result formatters |
| `routing/` | Query-only Darija discovery hints and provider policy |
| `transport/` | Selected year/date metadata, release controls and response/failure handling |
| `diagnostics/` | Fixed diagnostic records and guarded read endpoints |

Normal flow: existing actor/year boundary → write refusal → eligible guarded Jev
candidate → router/OSS20B fallback → existing authorized MCP execution.
See [the release plan](../../../../../docs/plans/CHATBOT-JEV-ROUTER-PLAN.md) for enabled scope
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

Jev has eight runtime files, each with one main responsibility:

| File | Responsibility |
| --- | --- |
| `jevIntents.ts` | Intent definitions, protocol types and provider constants |
| `jevWording.ts` | The one provider request shape used for eligible reads |
| `jevDecision.ts` | Validate provider decisions and confidence/write agreement |
| `JevIntentClassifier.ts` | Eligibility, provider calls, cancellation and fallback |
| `JevRequestContext.ts` | Request context and the framework preparation hooks |
| `jevReplyPlan.ts` | Supported read scope and authorized result formatting |
| `guards/countGuard.ts` | Count wording and explicit name/list exclusions |
| `guards/queryGuard.ts` | Semantic checks, aliases, vocabulary and guarded acceptance |

The historical wording builders and numbered profile selector are removed.
Only the four supported read intents reach the provider; their request wording is
preserved. Unsupported requests use the existing router/model path. The
`@sms/server/jev-intents`, `jev-wording` and `jev-query-guard` package paths remain
available without extra source facade files.

The `replies/` folder has two files: `schoolReplyLanguage.ts` detects language and
`schoolReplyWrite.ts` recognizes writes and returns localized refusals.
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

Reviewed questions and fake HTTP/MCP data live under
`packages/server/tests/chat/fixtures/`; they never run a paid benchmark.
Verification uses `bun run test:chat`, `test:academic-years`, `test:security`,
`test:boundaries`, `lint`, `typecheck` and `build`.

`transport/schoolProviderResponse.ts` adapts the OSS20B provider completion before
the SDK dispatches tools: only observed terminal channel suffixes on offered
names are normalized, and tool-step planning text is withheld. Arguments stay
unchanged and module validation/guards still run. It buffers one model completion
(at most 1 MiB), so answer text appears after that step finishes; it does not
buffer database reads or the entire multi-step chat. Attendance's MCP-only list
routes return module-owned evidence (`records`, `recordState`, `interpretation`)
so an empty read does not claim zero absentees. Dashboard list routes keep arrays.
Formatting also applies to OSS20B calls without a request-local policy frame;
other models and unrelated fetches keep their original behavior. Up to four
repeated observed suffixes are recognized, with the same offered-name requirement.
