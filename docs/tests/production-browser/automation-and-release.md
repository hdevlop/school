# Automation and release status

Repository inspection: 2026-09-25. Production was not probed.

The current root and dashboard package scripts contain no `test:e2e:*`, `test:dashboard`, `test:server` or `test:seed` commands. The proposed connected/remote Playwright configs, wrappers and suites were not found. Historical commands are retained in [the original runner contract](reference/runner-and-release-contract.md) for traceability; do not run or describe them as implemented.

The root manifest currently pins `najm-auth@4.0.9` and `najm-cache@2.2.0`; read the current manifest and overrides at execution. The older 4.0.2 baseline and September 6 counts in the reference are historical.

Manual browser execution uses the feature case IDs and [preflight](00-preflight.md). Before introducing automation, implement and verify the retained runner contracts: dedicated matches, exact discovery count, one worker, zero retries, immutable revision, passive diagnostics, exact cleanup, native exit status and no local server for remote runs. Full Gate A and A-R each retain ten tests in one dedicated file.

## Release boundary

[The deployment workflow](../../../.github/workflows/deploy-production.yml) contains a runtime-path classifier in source. Its current allowlist covers documentation paths and the retired root plan path; other paths fail closed as runtime changes. The broader historical test-file allowlist is a proposal, not the current workflow behavior. No workflow exercise or live deployment result is established by this document.

Retain the old root filename in the workflow allowlist for this deletion; changing workflow behavior is outside this documentation task. The workflow comment's old section 11 reference now means the retained runner/release reference linked above.

Do not deploy merely to publish these guides. Before a future push, inspect the entire intended commit and actual classifier behavior; unrelated runtime changes require their normal verification/deployment path. Documentation-only validation consists of link/coverage/preservation checks and `git diff --check`. No build, database command or browser run is required just to reorganize these documents.

For runtime changes, preserve the independent milestones: source checks, package publication if relevant, database/schema proof, Git publication, CI/image, deployment, exact live revision/readiness, API and browser acceptance. A successful image or webhook is not proof that the new revision is serving.

Current root verification scripts include `bun run lint`, `bun run typecheck`, `bun run i18n:check`, `bun run test`, `bun run build` and `bun run db:check`. Choose gates appropriate to an implementation change and the retained full acceptance contract; do not silently execute database generation/migration against production from a browser checklist.
