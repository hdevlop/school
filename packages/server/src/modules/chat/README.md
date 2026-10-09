# School chat module

Start with `index.ts` for the classes Najm registers and
[`config/chatbotConfig.ts`](../../config/chatbotConfig.ts) for the reply pipeline.
Runtime `@sms/server/jev-*` exports keep their names; callers should use them rather
than reaching into another workspace's source files.

| Folder | Responsibility |
| --- | --- |
| `context/` | Trusted actor/year snapshot and request middleware |
| `replies/` | Local wording, intent matching and validated result rendering |
| `jev/` | Classifier, Decisions protocol, wording, acceptance and preparation |
| `routing/` | Darija discovery hints, qualified fallback scope and provider policy |
| `budget/` | Durable shared allowance and paid transport accounting |
| `transport/` | Ordinary release controls and response/failure stream handling |
| `diagnostics/` | Fixed diagnostic records and guarded read endpoints |

Normal flow: existing actor/year boundary → local reply → eligible guarded Jev
candidate → qualified router/OSS20B fallback → existing authorized MCP execution.
See [the release plan](../../../../../CHATBOT-JEV-ROUTER-PLAN.md) for enabled scope,
allowance and rollback. This organization does not broaden that scope.

`jevIntents.ts` is a small stable API. `jevProtocol.ts` owns intent definitions and
types, `jevWording.ts` builds requests, and `jevDecision.ts` validates provider
decisions. `JevRequestContext.ts` owns the one ordinary request context.

`replies/schoolFilteredReplies.ts` dispatches a recognized request. Its `filtered/`
helpers separately own the closed phrase catalog, record validation, counts,
class placement, academic results and attendance. They use the same matching,
validation and wording as before; successful empty reads stay distinct from errors.

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
