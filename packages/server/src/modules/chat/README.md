# School chat module

Start with `index.ts` for the classes Najm registers and
[`config/chatbotConfig.ts`](../../config/chatbotConfig.ts) for the reply pipeline.
Public `@sms/server/jev-*` exports keep their names; callers should use them rather
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
| `benchmark/` | Fixture endpoints, cases, experimental ledger, grants and scheduling arms |

Normal flow: existing actor/year boundary → local reply → eligible guarded Jev
candidate → qualified router/OSS20B fallback → existing authorized MCP execution.
See [the release plan](../../../../../CHATBOT-JEV-ROUTER-PLAN.md) for enabled scope,
allowance and rollback. This organization does not broaden that scope.

`jevIntents.ts` is a small stable API. `jevProtocol.ts` owns intent definitions and
types, `jevWording.ts` builds requests, and `jevDecision.ts` validates provider
decisions. `JevRequestContext.ts` owns the one request context; benchmark session
grants do not own a second context.

`replies/schoolFilteredReplies.ts` dispatches a recognized request. Its `filtered/`
helpers separately own the closed phrase catalog, record validation, counts,
class placement, academic results and attendance. They use the same matching,
validation and wording as before; successful empty reads stay distinct from errors.

The numbered files under `jev/guards/` are active layers, not unused copies:
query V6 builds on V5/V4/V3, and count V2 uses V1's checks. Offline studies also
replay those versions. Use `jevQueryGuard.ts` for the current runtime entry point;
do not delete or silently alter a lower layer. Historical evidence and ZIP snapshots
retain their original paths/hashes; new studies hash the reorganized source tree.

Verification uses the existing `bun run test:chat`, `test:academic-years`,
`test:security`, `test:boundaries`, `lint`, `typecheck` and `build` scripts.
An organization-only change needs no paid provider benchmark.

Organization verified on 2026-10-09: 614 chat tests, 365 academic-year tests,
48 security tests and 562 script/boundary tests passed, along with lint,
type checking and the production build. An ordinary Darija student-count request
on the running dashboard selected `students_get_student_count` with zero paid calls.
Source comparison confirmed the extracted function bodies and the other moved
modules' executable statements stayed identical.
