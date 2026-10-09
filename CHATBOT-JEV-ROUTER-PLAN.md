# Jev + router release plan

Updated: 2026-10-09. **Qualified local release enabled; P1–P4 complete within the scope below.**

The chatbot uses validated local replies, guarded Jev selection, the existing
router, and selective **GPT-OSS 20B** fallback. Saved OpenRouter settings now select
20B. Jev and the shared monthly application allowance are enabled in the local
environment and verified on the running dashboard at port 3102. Remote production
deployment is not claimed.

## Supported scope

- Admin/principal Jev: unfiltered school student count, teacher count, separate
  counts of both, and class lists. Only a new, single user text with no session key
  can establish complete first-turn history. Other turns retain routing.
- Existing validated local reads: class identity/count variants, owned child and
  student grades, personal placement, attendance, and qualified teacher academic
  requests. Subject names, marks and denominators come directly from tool results.
- Selective OSS20B: qualified global count/class requests when Jev declines, and
  teacher-owned student counts or assessments with no recorded grades. Discovery
  uses the existing router; existing MCP guards authorize every execution.
- Unsupported names, filters, workflows and ambiguous requests ask for clarification.
  Writes, outsider data and disallowed years retain their existing restrictions.
  There is no automatic 120B escalation or general model replacement qualification.

Admin, parent, student and teacher checks used populated demo accounts. Principal
authorization has regression coverage; no populated principal account was available
for this release check. Drafted Darija/Arabizi questions are assistant evidence,
not independent native-language acceptance.

## Request flow

1. Resolve actor and selected year through the existing shared boundaries.
2. Apply write/year restrictions and recognized local replies or clarifications.
3. For eligible supported admin/principal first turns, try Jev before routing.
   Require valid probabilities/confidence, read intent, positive query vocabulary
   and complete arguments. Execute accepted plans through the existing MCP path.
4. On decline/error, use the existing router for discovery. Model fallback runs
   only inside its qualified scope and with sufficient remaining allowance.
5. Preserve failed tool calls and unavailable outcomes. Never invent zero results,
   silently retry a failed generation, or launch Jev and the answer model together.

## Completed work

- [x] P1: bypass provably unsupported classification while preserving supported plans.
- [x] P2: correct class/child identity, academic tool selection, malformed-call handling
      and personal ownership/year scope. Persisted M/F genders now resolve correctly.
- [x] P3: render qualified grades/attendance/placement locally; preserve facts,
      short Arabizi detection and selective fallback. Unknown filters remain explicit.
- [x] P4: ordinary-chat trusted context, candidate-first Jev, saved 20B/CoreWeave policy,
      durable shared allowance, cancellation, rollback and dashboard verification.

## Current verification

The first 20-question development run exposed real answer defects; it was not a
release pass. Targeted repairs corrected grade names/denominators, attendance wording,
comma-separated placement requests, class-name synonyms and stored child genders.
The separate eight-question wording holdout originally scored 3/8 under a strict
tool-order scorer and 5/8 after auditing two valid read plans. Its two ambiguous
requests clarified safely; its placement failure was corrected and rechecked.

Final targeted repairs pass **5/5**. Saved-configuration ordinary chats pass **6/6**,
averaging **0.83 seconds**, including router fallback with Jev off. Two dashboard
checks pass with actual allowance accounting for Jev and multi-turn router/20B.
These reused checks establish the bounded release, not broad user accuracy.

The full results, original failures, limitations and verification totals are in
[the release report](docs/tests/jev-router-validation.md#qualified-ordinary-release--2026-10-09).
[One compact release archive](docs/evidence/chatbot-latency/jev-router-release-20261009.zip)
preserves redacted evidence and reproducible harnesses.

## Allowance and rollback

```dotenv
CHATBOT_FLOW=jev-router-20b
CHATBOT_JEV_MODE=on
CHATBOT_MONTHLY_MICRO_USD=10000000
CHATBOT_JEV_OPERATING_TIMEOUT_MS=3000
```

The $10/month application allowance includes ordinary paid classification,
generation and routing embeddings for all roles using the School database.
Reservations are atomic and survive restarts. Unknown costs and cancellations
keep their debit; reported charges settle once. Exhaustion blocks new paid sends
and returns a localized notice; free local replies remain available. Provider
price ceilings bound 20B requests. This is not a promise of unlimited messages or
an exact provider invoice cap when costs are unknown or unexpectedly overrun.

The ledger lazily creates two operational tables, `school_chat_spend_month` and
`school_chat_spend_attempt`; the deployment DB account needs permission to create
them on first use. UTC month boundaries are deliberate. No question, actor ID or
credential is stored in those tables. Verified local embeddings are free in this
configuration; an arbitrary local model proxy cannot bypass the guard.

Set `CHATBOT_JEV_MODE=off` to keep the qualified router/20B path and allowance.
Full rollback is `CHATBOT_FLOW=legacy`, which also removes the ordinary allowance;
restore a historical model deliberately if wanted. Keep experimental fixture
controls separate. Reload the app after environment changes.

## Follow-up

The authorized release work is complete. Further expansion should qualify one
new workflow at a time with fresh Darija questions, expected authorized arguments
and actual facts. Useful next candidates are owned fee/payment summaries and
filtered grades. They remain outside the new selective model scope today.
No further provider/French benchmark or billing study is required to use this release.

Historical comparisons remain in [the evidence index](docs/evidence/chatbot-latency/README.md).
The old latency plan is recoverable with `git show 846a679:CHATBOT-LATENCY-PLAN.md`.

## Code organization

The [chat module guide](packages/server/src/modules/chat/README.md) maps the seven
runtime folders. The module root now contains only its registration
entry point and guide. Filtered replies use a small dispatcher with focused
renderers; Jev protocol, request wording and decision validation are separate.
Numbered guards remain active dependencies. This refactor preserves the released
flow and public exports; all relevant tests, lint, type checking and the production
build passed. No paid benchmark was needed.

## Benchmark retirement

The owner ended comparison work on 2026-10-09. Benchmark endpoints, scripts,
experimental grants/ledgers, scheduling arms and their environment switches are
removed. Ordinary chat retains Jev first, then the existing router with selective
OSS20B fallback, the shared monthly allowance and runtime diagnostics. Jev accepts
`on` or `off`; shadow mode is retired. Only offline regression inputs remain in
`packages/server/tests/chat/fixtures/`. Retired source is recoverable from published
commit `a75cd0f`; no additional benchmark or manual native collection is required.

Cleanup verification passed: 572 chat, 365 academic-year, 48 security and 28
script/boundary tests, lint, type checking and the production build. Retired
benchmark routes return 404 in local HTTP tests. No paid requests were made.
