# School chat module

Start with `index.ts` for the classes Najm registers and
[`config/chatbotConfig.ts`](../../config/chatbotConfig.ts) for the reply pipeline.
Runtime `@sms/server/jev-*` exports keep their names; callers should use them rather
than reaching into another workspace's source files.

| Folder | Responsibility |
| --- | --- |
| `replies/` | Language, write refusals and four Jev result formatters |
| `jev/` | Classifier, Decisions protocol, wording, acceptance and preparation |
| `routing/` | Query-only Darija discovery hints and provider policy |
| `budget/` | Durable shared allowance and paid transport accounting |
| `transport/` | Selected year/date metadata, release controls and response/failure handling |
| `diagnostics/` | Fixed diagnostic records and guarded read endpoints |

Normal flow: existing actor/year boundary → write refusal → eligible guarded Jev
candidate → router/OSS20B fallback → existing authorized MCP execution.
See [the release plan](../../../../../CHATBOT-JEV-ROUTER-PLAN.md) for enabled scope,
allowance and rollback.

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

`jevIntents.ts` is a small stable API. `jevProtocol.ts` owns intent definitions and
types, `jevWording.ts` builds requests, and `jevDecision.ts` validates provider
decisions. `JevRequestContext.ts` owns the one ordinary request context.

The `replies/` folder has three files: language detection, write-request refusals
and formatting for the four supported Jev reads. General and filtered read
questions use router/OSS20B. There is no local filtered phrase catalog, record
join/calculation layer or question-specific prompt-hint provider. Successful empty
reads remain distinct from failures.

The numbered files under `jev/guards/` are active layers, not unused copies:
Query V6 builds on V5/V4/V3, and count V2 uses V1's checks.
Use `jevQueryGuard.ts` for the current runtime entry point;
do not delete or silently alter a lower layer. Historical evidence and ZIP snapshots
remain available in Git and the existing evidence archive.

Benchmark controllers, session grants, experimental scheduling, process ledgers,
comparison CLIs and their tests have been removed. Shadow mode is retired;
`CHATBOT_JEV_MODE` accepts only `off` or `on`. The monthly spending guard and
administrator diagnostics remain part of ordinary chat.

Reviewed questions and fake HTTP/MCP data live under
`packages/server/tests/chat/fixtures/`; they never run a paid benchmark.
Verification uses `bun run test:chat`, `test:academic-years`, `test:security`,
`test:boundaries`, `lint`, `typecheck` and `build`.
