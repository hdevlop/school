# Full post-fix Moroccan acceptance repeat — 2026-10-05

User instruction: `do it` after cost-accounting work, the full 30-case/two-repeat
acceptance run, conditional load/failure checks and production measurements were
proposed. Execute this dev acceptance repeat first; do not deploy or initiate
additional paid load/model experiments unless the unchanged acceptance gates pass.

## New execution contract

Maximum **60 outer chat requests**, all 30 Moroccan cases twice, admin, selected
year `2026-2027`, serial, new sessions, warm resident Qwen embeddings and verified
fresh application caches. No paid probes, warmups, comparisons or retries beyond
those 60 requests. Failures count; internal generation steps can exceed 60.

New **$0.50 estimated stop**, **$0.01 reserved per in-flight request**. Use
`--pricing-mode=declared` with the [frozen declared prices](postfix60-declared-prices-20261005.json),
so stale SDK rates cannot determine the stop. Current independent catalog maxima
across listed eligible endpoints (Groq excluded) are **$0.35 input/$0.95 output
per million tokens**. These are conservative assumptions from a dated catalog,
not verified hosts, a guaranteed request bound or actual invoice charges.

The previously disclosed existing key has a $50 total cap, **not a hard $0.50
cap**. Check the live selected-key ledger through the new dev/admin-only route,
including environment-key equality, before execution. Stop before chats if the
expected $50 cap, sufficient remaining limit, provider/model or key identity
cannot be confirmed. Keep per-generation host and other-account-traffic caveats
with the usage delta. No settings/key mutation or new provider credential.

## Frozen product and preparation

- [Independent School snapshot](postfix60-manifest-20261005.json), published
  dependencies installed with `bun install --frozen-lockfile`; source and test
  typechecks, lint, build and local regression checks must pass before paid work.
- Keep GPT-OSS-120b, Cerebras first/fallbacks allowed/Groq excluded, low reasoning,
  the existing templates and new empty-read guidance fixed.
- Isolated dev app on port 3102 with `CHATBOT_BENCHMARK_CONTROLS=true`; no other
  app may already own that port. Never unload Ollama or delete a shared cache.
- Refresh authoritative School facts via internal MCP/REST and freeze a new
  30-case corpus with its timestamp/hash; preserve historical fixtures/results.
- Verify saved GPT-OSS readiness, cache controls, successful-empty attendance
  reads, selected-key usage and model residency. Preflight sends no paid chats.
- Record pre/post source, context, scorer, budget and corpus hashes; hold the
  cooperative machine-wide runner lock and check model before every chat.

## Review and decisions

Review all 60 answers for facts, language/register, empty results, denied reads,
unsupported attendance assumptions, write claims/promises and executed writes.
Preserve failed rows. Report hybrid/model/template latency separately; retain
all outcomes and complete request/embedding correlation. Automatic checks do not
certify native fluency, broader role correctness or production reliability.

Report SDK and declared estimates separately from the actual selected-key ledger
window. Reconcile billed cost per attempted and assistant-accepted reply,
including failed-attempt spend. Keep the **$0.25/1,000 correct answers** gate;
absolute spend below the operating budget is not an acceptance pass.

If cost/correctness acceptance remains open or fails, stop paid expansion after
this run and document the blocker and concrete next change. Concurrency 2/4,
role/year, failure and production/browser conditions cannot be inferred from
this serial dev repeat. Do not pool their future timing samples.

## Command

Run from the frozen snapshot after local checks and preflight succeed:

```powershell
bun --env-file=apps/dashboard/.env.local scripts/chatbot-benchmark.mjs --base-url=http://localhost:3102 --cases=C:/Users/pc/Desktop/school/docs/evidence/chatbot-latency/postfix60-corpus-20261005.json --repeat=2 --max-requests=60 --max-estimated-usd=0.50 --request-reserve-usd=0.01 --pricing-mode=declared --pricing-file=C:/Users/pc/Desktop/school/docs/evidence/chatbot-latency/postfix60-declared-prices-20261005.json --capture-provider-usage --concurrency=1 --cache-mode=fresh --keep-text --output=C:/Users/pc/Desktop/school/docs/evidence/chatbot-latency/postfix60-run-20261005.json
```

Executed once: [full results](postfix60-results-20261005.md), 60/60 automatic and
assistant checks; cost gate failed. The 60-request allowance is consumed.
Conditional paid expansion and rollout did not proceed.
