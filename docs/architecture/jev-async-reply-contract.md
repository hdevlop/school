# Najm async reply preparation contract — historical checkpoint

This records the earlier publication/adoption sequence, including its parallel
strategy and measurements. Current strategy, release work and validation are in
the [Jev + router plan](../../CHATBOT-JEV-ROUTER-PLAN.md) and
[validation guide](../tests/jev-router-validation.md). Older linked reports are
recoverable through the [evidence index](../evidence/chatbot-latency/README.md#historical-recovery).

Status: the framework API is published as `najm-chatbot` 3.4.0 and installed in School through exact published pins. School's default-off adapter is implemented with server-issued synthetic sessions on the marked local history fixture. Production/real-question enablement remains off. A 72-chat mock integration passed; the live experiment stopped after two access-denied replies and one cancelled, unknown-cost classification. See [adapter/results](../evidence/chatbot-latency/jev-school-adapter-results-20261007.md) and [publication/adoption](../evidence/chatbot-latency/najm-chatbot-3.4.0-published-20261007.md).

Follow-up: [the unpaid fixture repair](../evidence/chatbot-latency/jev-fixture-read-repair-20261007.md) closes read access with four fixed read grants, eight scoped MCP checks and six successful existing-template replies. No new paid calls occurred. Request-level cancelled billing and paid Jev/full-chat acceptance remain open; the owner's daily totals do not settle an individual cancelled request.

The optional `reply.preparation` factory is separate from synchronous `reply.template`. It uses server-owned history/eligibility, an abort signal, a default 800 ms deadline, a zero-grace ordinary-readiness race, and separate selection/actual-settlement observers. Templates may include a diagnostic label. The [candidate report](../evidence/chatbot-latency/jev-async-release-candidate-20261007.md) records the implementation and 274 package tests.

The Desktop Najm checkout was fast-forwarded to the published source commit after the owner's explicit request to publish/push Najm and update School. School still uses the npm registry release; it does not consume the local checkout, a workspace link, copied source or a local tarball. The sequence below remains the School adapter/adoption acceptance contract.

## Required preparation sequence

1. Resolve authenticated request scope, enabled settings, selected academic year, complete history and latest user text before optional classification. Read mode/channel/admin status/first-turn status from server state. Never trust an HTTP/MCP caller's asserted eligibility.
2. Detect reply language and run the existing synchronous template selector once. If it selects a text refusal, return it without starting Jev, routing or model generation. For a read plan, validate and execute through the existing scoped framework executor; preserve its read-failure response. A regression test must confirm the existing tool-availability behavior when moving selection earlier.
3. If no synchronous template matched and the turn is eligible, start async candidate preparation alongside model-path preparation. Candidate preparation returns a plan or null; it must not execute tools, save messages or start model generation. Model-path preparation may route/build context but cannot execute a candidate or emit an answer before selection.
4. Use the zero-grace readiness selection in [the offline reference](../../scripts/chatbot-reply-readiness.mjs). Ready routing/model preparation seals fallback immediately. An earlier validated candidate can win. A deadline, decline or classifier failure leaves fallback progressing; ties go to fallback. Late completions cannot replace the sealed choice.
5. Execute the winner exactly once. A read candidate can name only registered, explicitly read-only tools and uses the existing authenticated, ownership/year-scoped executor. Registry membership and read-only metadata do not replace authorization. Do not restrict an async winner to a losing router's selected names or introduce a second executor.
6. Propagate disconnect/deadline signals to preparation work and suppress late output. Abort does not prove a provider request was not billed: retain terminal attempt and unknown-cost accounting for started classification requests, including losers. Clean up timers/listeners; observe late rejections.
7. Keep stream/text/session/debug paths consistent. Commit the winning answer once and log payload-free selection timing separately from classification completion and terminal costs. Preserve existing behavior when no async selector is configured.

The published `ReplyPreparationPolicy` supplies the async candidate factory and authoritative turn metadata separately from the existing synchronous `template` callback. School should use these exported types directly and implement its own trusted eligibility and terminal-cost ledger.

## Package acceptance and School adoption

Package tests must cover synchronous refusal precedence; cached routing; routing at 50 ms versus a classifier timeout at 800 ms; an earlier valid candidate; declined/malformed/errored/late candidates; simultaneous readiness; routing failure; disconnect; losing work that ignores abort; unauthorized or mutating tool plans; selected-year isolation; once-only execution/output/session persistence; terminal accounting and unchanged behavior without the hook. The existing offline selector tests cover only selection, not those integrated effects.

Publication, byte/integrity verification, exact matching pins/overrides and Bun installation are complete. School's adapter now supplies finite probability validation, guard5 query acceptance, bounded cost/unknown-cost handling and authoritative synthetic-session eligibility. It reuses the existing year scope and MCP executor. Broader real-question eligibility and runtime acceptance remain unqualified; they must not be inferred from fixture-mode success.

Then run paired full-chat experiments for off/shadow/on on approved synthetic cases and scoped reads, without changing real records. Capture routing-ready, classifier-ready, selected path, first text, final text, terminal classification cost and errors. Require zero accepted wrong/read-write results, the approved coverage gate and at most 100 ms fallback regression. The current 500 ms classifier p95 target remains separate. Shadow requests spend money without replying and need their own concrete allowance.

The virtual replay shows why paired timing matters: no Jev candidate wins against assumed 250 ms routing in the saved 100-case recheck; 16 win at 500 ms and 33 at 800 ms. These are hypothetical preparation selections, not measured chat savings.

## Synthetic billing observation experiment — 2026-10-07

The default transport still propagates candidate cancellation. A separately frozen synthetic experiment may opt into `CHATBOT_JEV_BILLING_MODE=observe`. This is an explicit exception for billing collection after ordinary-selection loss or the 800 ms candidate deadline, confined to the already-gated local marked fixture and server-issued synthetic sessions. It requires the actual HTTP request lifetime; caller eligibility claims cannot enable it.

Candidate cancellation still returns null immediately and prevents every late plan, tool read and answer change. Only the already-started transport may continue to obtain its response-reported cost, under a separate maximum 5,000 ms lifetime. Actual HTTP disconnect and the off switch abort that transport; a transport/body that ignores abort is bounded by the observer wrapper. Missing cost remains unknown and stops dispatch. This may bill losing requests that default abort would cancel; it is a measurement policy, not a cost optimization or production rollout.

The benchmark waits for terminal billing outside measured reply timing before dispatching its next request. It records that wait separately, retains pending reservations, preserves the cancelled candidate outcome alongside known costs, and keeps header request IDs distinct from response generation IDs. Existing stopped reports/allowances and the original unknown attempt are not rewritten or reset. The published framework API and zero-grace readiness selection remain unchanged.
