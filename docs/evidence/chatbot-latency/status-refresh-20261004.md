# Chatbot plan status refresh — 2026-10-04

This refresh reconciles `CHATBOT-LATENCY-PLAN.md` with current School source and
existing dated evidence. It changes documentation only. Existing raw benchmark
reports and failures remain unchanged; no paid chat, settings change, deployment
or database migration was performed.

## Source and evidence

Root pins are `najm-chatbot@3.3.0`, `najm-rag@3.2.0`, `najm-mcp@2.2.5`,
`najm-api@5.0.0`. Chatbot/RAG versions match the read-only reference at
`C:/Users/pc/Desktop/najm`. Published workspace pins/overrides are checked by the
script suite; no local package link or framework source edit was introduced.

`chatbotConfig.ts` supplies Cerebras-first routing with fallbacks, excludes Groq,
sets low reasoning effort and opts into Najm language policy plus School templates.
The runner defaults to the 30-case Moroccan corpus and separates template/model
reply sources. These source checks do not prove effective live host selection.

The latest [shared-policy report](najm-reply-results-20261004.md) remains the
authoritative record of the earlier reviewed 30/30 run. Its development timings
and SDK token estimates are not production acceptance or a provider invoice.
The earlier [Cerebras routing report](step3-cerebras-low-20261004.md) records an
account usage delta above the plan's cost gate; it is a different configuration
and must not be presented as current hybrid billing.

## Checks executed for this refresh

| Check | Result |
|---|---|
| `bun test scripts/tests packages/server/tests/chat packages/server/tests/security/ChatReadOnlyTools.test.ts` | 284 passed, zero failed, 808 assertions across 21 files |
| `bun scripts/chatbot-benchmark.mjs --validate` | Valid, 30 cases |
| Read-only benchmark `--preflight` using the existing local environment | Failed to reach `/api/health/status` at `http://localhost:3102`; zero planned/sent chat requests |
| Documentation validation | `git diff --check` passed for the plan; all local plan links resolve |

Raw preflight: [status-refresh-preflight-20261004.json](status-refresh-preflight-20261004.json).
It records current package/source/corpus hashes without storing provider keys.
Health failure occurred before login or AI-settings reads. No other app port was
tested and no app process was started or stopped.

The test run emitted an existing deprecation notice about RAG table imports from
`najm-chatbot/pg`; it did not fail any check. Lint, typecheck, full School tests
and build were not rerun for this documentation-only refresh. Their earlier
shared-policy release results remain dated evidence rather than new verification.

## Acceptance remains open

Repeat current-configuration measurements with declared budgets, separate
model/template paths and cache/load conditions, then extend role/year, held-out
language/fact and populated-knowledge coverage. Exercise live provider fallback,
cancellation, hangs and repeated-call termination. Reconcile current hybrid
billing before judging the unchanged cost gate. Production readiness and browser
submit-to-first-render measurements remain unrun.
