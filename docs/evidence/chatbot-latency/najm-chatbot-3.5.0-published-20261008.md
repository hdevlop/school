# Bounded candidate-first preparation published and adopted

`najm-chatbot@3.5.0` is published. Source commit
[aa2dc95](https://github.com/hdevlop/najm/commit/aa2dc95a12e4224aa7de69c0dd6ed9d56128f50b)
is pushed to Najm `master`. The [registry verification](najm-chatbot-3.5.0-registry-20261008.json)
matches the reviewed tarball byte for byte, including integrity and SHA-1.
SHA-256: `14cad3cd7fcc20bf3c4c24f4a51193072505c663c0e9ab69a65094e519dff652`.

The existing selector now accepts `strategy: 'candidate-first'`. It waits for a
validated candidate, decline, error, or the bounded candidate deadline before
starting ordinary preparation. A winning candidate starts neither routing nor
generation. Synchronous templates retain precedence. Parallel remains the
default, with its existing immediate readiness race. Guards, request scope,
MCP execution, abort handling and late-settlement accounting keep one owner.

School pins the published version exactly in root/server/dashboard and the
matching Bun lockfile; the root override is preserved. CoreWeave routing and
candidate-first are opt-in experiment arms bound to one-use synthetic grants
on a marked local fixture. Normal chat uses the existing Cerebras preference
and parallel scheduling. Real-question Jev remains off.

Verification: 281 upstream tests, zero failures; 17 release tasks and the public
API snapshot pass. The compiled public entry selects a candidate without a
generation call. School's 78 focused checks, full 1,902 test executions,
typecheck, lint, workspace boundaries and isolated production build pass.
The later CLI-only retained-reservation continuation has separate focused tests
and ESLint checks; it does not change the production implementation.

The [adoption manifest](najm-chatbot-3.5.0-adoption-20261008.json) records paths
and checks. The read-only Desktop reference remains at 3.4.0, so it does not
match the new pin. The matching source is in the isolated release clone at
the published commit; School consumes no local source, link or tarball.

Live performance and quality are reported separately in
[the CoreWeave/Jev-first comparison](jev-coreweave-first-results-20261008.md).
