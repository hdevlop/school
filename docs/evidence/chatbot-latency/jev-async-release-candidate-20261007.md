# Najm async reply preparation: release candidate

> Later status: the owner approved publication. This exact candidate is published and installed in School. See [publication and adoption](najm-chatbot-3.4.0-published-20261007.md). The candidate-stage manifest below remains preserved as historical preparation evidence.

The missing framework hook is implemented, tested and packed as **najm-chatbot 3.4.0**. Publication is the remaining B1 approval. School still pins 3.3.0; Jev is off. This stage used no paid classification requests and changed no School records.

## Implementation

`reply.template` stays synchronous. An explicitly enabled `reply.preparation` policy provides server-owned context resolution, eligibility, an asynchronous plan factory, an 800 ms default deadline, and separate selection/settlement observers. Unknown or invalid history stays unknown. Client assertions cannot establish first-turn eligibility.

Synchronous replies take precedence. On a miss, candidate preparation and routing/context start together. Ordinary readiness seals fallback immediately; there is no extra grace period for Jev. A validated earlier candidate wins, and only that winner invokes MCP. Invalid plans, declined results, errors, timeouts and late decisions cannot start a reply or execute a candidate.

The existing MCP builder retains route guards and request scope. Registered read-only tools can be used independently of a losing relevance router. Confirmation/destructive tools are refused; `tools: 'none'` blocks read plans. Selected read failures return unavailability rather than invented facts. Stream, text and debug paths share the selector and persist a winning answer once.

Signals cancel preparation logically and reach the factory and AI SDK. Router/context APIs and in-flight MCP reads may continue physically. They cannot replace the selected answer, run subsequent candidate reads or save another message. Selection diagnostics stay fixed, and the factory's actual late settlement remains observable. Factory costs are explicitly unreported in generation diagnostics: zero answer-generation cost must not be reported as zero total cost. The application adapter must own attempt IDs, actual/unknown costs and reconciliation.

## Verification and review

- **274 tests pass, zero failures; 771 assertions across 27 files.** Covers early/late/declined/malformed candidates, timeout, simultaneous readiness, routing failure, cancellation, synchronous precedence and one-time persistence.
- Real HTTP/MCP tests preserve denial by a route guard. Parallel winners preserve distinct authenticated actor and server-selected academic-year scopes. These test framework propagation; School repository adoption checks remain necessary after pinning.
- All 16 dependency/package build tasks pass, including declarations. Public API snapshot and whitespace checks pass. The repository's mandatory pack checks also pass.
- The compiled public entry passes synchronous-precedence and asynchronous-winner smoke checks. Every packed dist file matches the compiled source bytes; workspace dependencies are resolved in the packed manifest. The source worktree is clean.

Source branch: `feat/async-reply-preparation` in the isolated upstream clone:
`C:/Users/pc/AppData/Local/Temp/school-jev-najm-async-7e87beefa9664fc6a9ee0cba01bd699b`.

Source commit: `1d79369af3d0b912a7e59c7a3472259a8c5e2a63`.

The Desktop Najm reference remains untouched. Source, patch, logs, package hashes and checks are recorded in [the release manifest](jev-async-release-candidate-20261007.json). The review patch, logs, compiled smoke and tarball are in:
`C:/Users/pc/AppData/Local/Temp/school-jev-release-20261007-7e87beef`.

Tarball SHA-256:
`6c28898b5195d352edd839ca01deecff65f1bb7073e816f824455e21991a2b6f`.

The registry lookup for 3.4.0 returned 404 during preparation. No package was published, no upstream branch was pushed, and School does not consume this local tarball or clone.

## What we can do next

Approve the real publication of this exact tarball. [The plan's B1 release step](../../../CHATBOT-LATENCY-PLAN.md) explicitly requires "confirmation before the real publish". All authorized preparation is complete; this is a concrete release decision, not another request to continue implementation.

After publication, verify registry integrity, adopt the exact matching root pins/overrides with Bun, implement the School classifier adapter default off, and verify permissions, academic years, cancellation and cost accounting. Then prepare a bounded paired full-chat synthetic experiment with an explicit request/cost allowance. The consumed 304-classification allowance cannot pay for additional requests.

The current live classifier measurement remains **437 ms mean / 602 ms p95 / $0.01194 for 304 requests**. Guard5's 107 projected guarded choices and the failed qualification gates are unchanged. These framework tests do not prove full-chat speed, savings, wording approval or production acceptance.
