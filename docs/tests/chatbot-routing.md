# Routing-only chatbot diagnostics

This local diagnostic does not require an OpenRouter key. It authenticates using
the existing local admin environment, reads RAG status/settings/tool metadata, and
calls routing preview. It never invokes the selected school tools or `/api/chat`.
Authentication can create its normal session records. It does not index tools,
import examples, update settings, or alter school records.

## Run

From the repository root with Bun:

```powershell
bun scripts/chatbot-routing-preflight.mjs --validate
bun --env-file=apps/dashboard/.env.local scripts/chatbot-routing-preflight.mjs
```

The app URL comes from `NEXT_PUBLIC_APP_URL`, falling back to port 3102. Only
loopback destinations are accepted; redirects are refused. `ADMIN_EMAIL` and
`ADMIN_PASSWORD` are loaded from the existing environment, never stored in results.
No credentials should be passed in arguments or committed.

Optional arguments use `--name=value`:

```powershell
bun --env-file=apps/dashboard/.env.local scripts/chatbot-routing-preflight.mjs --base-url=http://127.0.0.1:3102 --limit=4 --timeout-ms=15000 --output=docs/evidence/chatbot-latency/routing-candidate.json
```

The default output is `docs/evidence/chatbot-latency/routing-preflight.json` and is
replaced on rerun. Use a different output path to preserve comparisons. Nonzero
exit means blocked prerequisites or observed routing misses; inspect `outcome`.
`--validate` checks fixture structure without making network requests.

## What is checked

1. App readiness and admin authentication.
2. Registered/indexed tool counts, semantic phrase count, and effective settings.
3. Whether fixture tool names exist in the running registry.
4. One embedding-backed preview, including its application status inside HTTP 200.
5. Only when prerequisites pass: one preview per selected fixture, up to 50.

Every group in `requiredToolGroups` needs at least one selected alternative.
These checks cover minimum candidate availability, not a complete executable
dependency graph. Names and class labels are synthetic and need not exist in the
database because no record lookup executes. Write-intent cases check selection
only; they do not prove chat blocking or approval behavior.

An empty tool index or an embedding failure stops the matrix. An empty semantic
phrase table alone does not block testing if tool-description embeddings exist.
Warmup/diagnostic preview is recorded separately from fixture samples. Application
caches are left alone, so no sample is labelled cold. All timings are HTTP preview
durations, not first-text latency or pure router time.

## Evidence limits

- This endpoint is an admin diagnostic. Teacher-authenticated access, ownership,
  selected academic year, and record-level authorization remain NOT RUN.
- Preview has its own selection implementation: transitive dependencies and error
  fallback differ from the chat router in the matching 2.0.3 sources. Do not use
  preview results as proof of the actual streaming route's behavior.
- Twenty cases with one observation each cannot establish production accuracy,
  p95 latency, cost, or multilingual reliability.
- Photo extraction, assistant clarification context, tool execution, and executable
  approval/resume need separate acceptance. Deferred cases are listed in the corpus.
- Corpus expectations should be reviewed as workflow tools evolve. Do not add these
  exact evaluation phrases to the semantic index and call the result held-out testing.

The published adapter has been adopted and all 428 tools were indexed against
[local llama.cpp](local-embeddings.md). The first full diagnostic passed 4/20
minimum selection checks with EmbeddingGemma; the final Qwen configuration passed
12/20. See [the routing trial](../evidence/chatbot-latency/routing-trial.md).
Review the model and intent separation before tuning a global threshold. A later
OpenRouter key enables the separate end-to-end chat benchmark in
`CHATBOT-LATENCY-PLAN.md`.
