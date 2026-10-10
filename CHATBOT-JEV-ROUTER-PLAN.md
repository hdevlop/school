# Jev + router release plan

Updated: 2026-10-10. **Jev + router + OSS20B enabled locally; authorization belongs to the existing modules.**

The chatbot uses write refusals, guarded Jev selection, the existing
router, and selective **GPT-OSS 20B** fallback. Saved OpenRouter settings now select
20B. Jev is enabled in the local environment and was verified on the running
dashboard at port 3102. Ordinary chat has no budget or spending ledger, and
replies and administrator diagnostics omit token and price metadata. Remote production
deployment is not claimed.

## Current implementation

- Jev: supported student count, teacher count, separate
  counts of both, and class lists. Only a new, single user text with no session key
  can establish complete first-turn history. Other turns retain routing.
- Minimal local replies: write refusals and result formatting for the four Jev
  reads above. No local matcher selects count/class/filtered read questions.
- Router/OSS20B: handles requests without an accepted Jev plan, including personal
  grades, placement, children and teaching assignments. Query-only discovery
  includes the required identity/child/profile tools. Personal IDs come from
  `students_get_my_identity`, `parents_get_my_identity` or `teachers_get_my_identity`,
  never an eager chat snapshot. These are read-only methods on existing controllers
  with their existing read permissions and owned repositories.
- Ambiguous requests ask for clarification; unknown IDs are never guessed.
  Writes, outsider data and disallowed years retain their existing restrictions.
  There is no automatic 120B escalation. The former role/phrase-based fallback
  gate is removed; selecting a tool grants no access to its data.

Admin, parent, student and teacher checks used populated demo accounts. Principal
authorization has regression coverage; no populated principal account was available
for this release check. Drafted Darija/Arabizi questions are assistant evidence,
not independent native-language acceptance.

## Request flow

1. Resolve actor and selected year through the existing shared boundaries.
2. Add only selected-year/date metadata; apply read-only write refusals. Do not preload private identities or children.
3. For eligible supported first turns, try Jev before routing.
   Require valid probabilities/confidence, read intent, positive query vocabulary
   and complete arguments. Execute accepted plans through the existing MCP path.
4. On decline/error, use the existing router for discovery and model fallback. Resolve personal IDs through module tools
   before profile reads. Controller permissions, repository ownership and the
   shared year boundary apply equally to Jev and model-selected calls.
5. Preserve failed tool calls and unavailable outcomes. Never invent zero results,
   silently retry a failed generation, or launch Jev and the answer model together.

## Completed work

These are the earlier release milestones. Identity-dependent local rendering,
filtered reply renderers and the role/phrase fallback gate are superseded by the
current implementation above.

- [x] P1: bypass provably unsupported classification while preserving supported plans.
- [x] P2: correct class/child identity, academic tool selection, malformed-call handling
      and personal ownership/year scope. Persisted M/F genders now resolve correctly.
- [x] P3: render qualified grades/attendance/placement locally; preserve facts,
      short Arabizi detection and selective fallback. Unknown filters remain explicit.
- [x] P4: ordinary-chat trusted context, candidate-first Jev, saved 20B/CoreWeave policy,
      durable shared allowance, cancellation, rollback and dashboard verification.

## Earlier release evidence

The first 20-question development run exposed real answer defects; it was not a
release pass. Targeted repairs corrected grade names/denominators, attendance wording,
comma-separated placement requests, class-name synonyms and stored child genders.
The separate eight-question wording holdout originally scored 3/8 under a strict
tool-order scorer and 5/8 after auditing two valid read plans. Its two ambiguous
requests clarified safely; its placement failure was corrected and rechecked.

Final targeted repairs pass **5/5**. Saved-configuration ordinary chats pass **6/6**,
averaging **0.83 seconds**, including router fallback with Jev off. Two dashboard
checks pass with actual allowance accounting for Jev and multi-turn router/20B.
These checks describe the earlier bounded release, which used identity-dependent
local renderers. They are historical evidence, not measurements of the new
context-free personal tool chaining. No new paid benchmark is requested. These earlier results also do not qualify
the newly simplified general read/model path.

The full results, original failures, limitations and verification totals are in
[the release report](docs/tests/jev-router-validation.md#qualified-ordinary-release--2026-10-09).
[One compact release archive](docs/evidence/chatbot-latency/jev-router-release-20261009.zip)
preserves redacted evidence and reproducible harnesses.

## Controls and rollback

```dotenv
CHATBOT_FLOW=jev-router-20b
CHATBOT_JEV_MODE=on
CHATBOT_JEV_OPERATING_TIMEOUT_MS=3000
```

Ordinary chat has no monthly allowance, spending tables, price ceilings or usage
tracking. The former `budget/` folder and `CHATBOT_MONTHLY_MICRO_USD` control are
removed. Provider constraints remain in `transport/`: OSS20B/CoreWeave, no provider
fallbacks, bounded requests and output, and no automatic failed-generation retry.
Provider responses pass through without cost inspection. School removes SDK usage
and pricing metadata before sending replies to the widget, and administrator
diagnostics keep timings and outcomes without token or cost fields.

Set `CHATBOT_JEV_MODE=off` to keep the router/20B path. Full rollback is
`CHATBOT_FLOW=legacy`; restore a historical model deliberately if wanted.
Reload the app after environment changes. Existing spend tables are left unused;
this code cleanup does not delete live database data.

## Follow-up

Use the selected combination. Review ordinary Darija answers and fix concrete
tool-selection mistakes through router descriptions/dependencies. Personal reads
now require router/20B tool steps instead of the retired local renderers. No further provider/French benchmark or billing
study is required. Do not restore a second authorization flow inside chat.

Historical comparisons remain in [the evidence index](docs/evidence/chatbot-latency/README.md).
The old latency plan is recoverable with `git show 846a679:CHATBOT-LATENCY-PLAN.md`.

The current reply cleanup passes 946 chat/year/security/ownership tests and 28
script/boundary tests, lint, root type checking and an isolated production build.
No paid requests were made. [Current details](docs/tests/jev-router-validation.md#minimal-replies-and-routeross20b-answers--2026-10-09)
distinguish offline pipeline checks from the earlier live benchmark results.

Darija discovery hints now distinguish general class/attendance questions from
personal profiles and require possessive wording for a parent's own children.
Teaching and pending-grading requests retain teacher identity tools. Exact word
matching avoids names, quoted text and Darija negation creating unrelated hints.
These are discovery fixes; the router still selects tools and modules authorize
each call. No new paid model or embedding benchmark was run.
Verification now passes 967 chat/year/security/ownership tests, 28 script/boundary
tests, lint, root type checking and an isolated production build.

## Code organization

The [chat module guide](packages/server/src/modules/chat/README.md) maps the five
runtime folders. The module root now contains only its registration
entry point and guide. `replies/` now contains two files: language detection and
localized write refusals. Jev result formatters live with `jevReplyPlan.ts`, chat
controls have one source in `transport/schoolChatControls.ts`, and model
configuration and transport share the CoreWeave provider policy. General read answers are written
by OSS20B from authorized tool results. `jevIntents.ts` owns intent definitions
and protocol types; `jevWording.ts` builds the one live provider request shape,
and `jevDecision.ts` validates responses. Historical wording profiles are removed.
Supported read scope lives with the reply plans, and preparation hooks live with
the request context. Jev now has eight runtime files instead of extra source facades.
The numbered guard chain is consolidated into `countGuard.ts` and `queryGuard.ts`,
with the existing semantic, phrase-alias and positive-vocabulary checks preserved.
The `context/` folder and its eager
identity lookups are removed. Identity/role-dependent reply helpers and
the role-based fallback gate are retired. Date/year request metadata stays in
`transport/` because selecting a correct tool also requires correct arguments.

## Benchmark retirement

The owner ended comparison work on 2026-10-09. Benchmark endpoints, scripts,
experimental grants/ledgers, scheduling arms and their environment switches are
removed. Ordinary chat retains Jev first, then the existing router with
OSS20B fallback and runtime diagnostics. The monthly allowance was subsequently
removed at the owner's request; historical benchmark accounting below does not
describe current chat behavior. Jev accepts
`on` or `off`; shadow mode is retired. Only offline regression inputs remain in
`packages/server/tests/chat/fixtures/`. Retired source is recoverable from published
commit `a75cd0f`; no additional benchmark or manual native collection is required.

Cleanup verification passed: 572 chat, 365 academic-year, 48 security and 28
script/boundary tests, lint, type checking and the production build. Retired
benchmark routes return 404 in local HTTP tests. No paid requests were made.

After removing chat identity/authorization context, **1,073 chat/year/security/
ownership tests**, **28 script/boundary tests**, lint, root type checks and an
isolated production build pass. The identity tests invoke actual existing
controllers over REST and MCP with fake repository data; no paid model or live
database operation was needed. See the [current verification](docs/tests/jev-router-validation.md#module-owned-authorization-and-routing--2026-10-09).

## Ordinary live checks — 2026-10-09

Jev correctly answered the current 103-student/13-teacher count question.
The native grade tool now accepts sectionId plus optional subjectId; all 14
SVT scores in CP/A matched the final live answer. Response normalization runs
once, and native “شكون” questions select Darija. OSS20B still produced malformed
tool names and planning text before recovering, and its empty-attendance Darija
answer made an unsupported claim that nobody was absent. These are unresolved
answer-quality limits, not a reason to restore chat-side data/filter catalogs.
See the [ordinary live report](docs/tests/jev-router-validation.md#ordinary-live-darija-checks--2026-10-09)
for the results, fixes, verification and next concrete work.

## Provider formatting and attendance evidence — 2026-10-10

The OSS20B provider adapter now repairs only observed suffixes on offered tool
names, suppresses tool-step planning text and survives hot reload. Inputs still
pass through existing module validation/guards. MCP-only attendance list routes
explicitly distinguish no recorded attendance from zero absentees. Live checks
show 14/14 correct grade scores without tool errors/planning leaks, and a correct
Darija unknown-attendance answer. A subsequent authenticated check verified all
14 scores and all 14 denominators, with no tool errors or planning text. The
adapter also handles up to four repeated observed suffixes and formats OSS20B
responses even when the request-local policy frame is absent. See the
[current report](docs/tests/jev-router-validation.md#provider-tool-formatting-and-attendance-evidence--2026-10-10)
for the verification, buffering tradeoff and next concrete checks.
