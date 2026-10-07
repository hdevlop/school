# Najm chatbot 3.4.0 published and adopted

**najm-chatbot 3.4.0 is published and installed in School.** The source commit is pushed to Najm `master`; the Desktop checkout matches the remote and is clean. The owner authorized committing/pushing all pending School work after this adoption. Jev's School classifier adapter and production enablement remain pending.

## Publication

The tested source commit is [1d79369](https://github.com/hdevlop/najm/commit/1d79369af3d0b912a7e59c7a3472259a8c5e2a63). The exact reviewed tarball was published through Najm's release script, after its mandatory build/test/API/clean-tree checks. The package has 274 passing tests and a compiled-public-entry smoke check.

npm initially reported that the package was being processed. Initial 404 checks were retained; after availability, registry metadata and the downloaded tarball were verified against the candidate. SHA-256 is `6c28898b5195d352edd839ca01deecff65f1bb7073e816f824455e21991a2b6f`; registry integrity and shasum also match. [Registry evidence](najm-chatbot-3.4.0-registry-20261007.json) records the hashes and verification time.

Najm source was pushed to `origin/master`, and the Desktop `master` checkout was fast-forwarded without discarding changes. Its worktree is clean. School consumes the registry package, with no local source link or tarball dependency.

## School adoption and verification

Root, server and dashboard declarations pin exactly `3.4.0`; the root override remains `$najm-chatbot`. `bun install` updated the lockfile and installed the public package. A smoke check imports School's installed `najm-chatbot` entry and verifies the asynchronous winner without a provider call or School data operation.

- `bun run test`: all ten groups pass, **1,825 passing test executions**, zero failures. Shared tests execute in multiple groups; this is not a unique-test count. Includes chat/year/ownership/security and workspace boundaries.
- `bun run typecheck`: passes against the installed 3.4.0 release.
- `bun run lint` and `bun run i18n:check`: pass.
- `bun run build`: passes, using isolated output `.next-release-jev-20261007` to preserve the running development output.
- Exact Najm pin checks: two tests, 45 assertions, zero failures.
- All 588 current School changes are staged. The 361 staged corpus/evidence files match their authored bytes exactly. `.gitattributes` preserves those bytes across checkouts, keeping recorded artifact hashes meaningful; staged whitespace checks pass.

The [adoption manifest](najm-chatbot-3.4.0-adoption-20261007.json) records versions, checks, source commit, artifact hashes and the intended all-current-work School commit scope. Logs remain outside the repository under `C:/Users/pc/AppData/Local/Temp/school-jev-release-20261007-7e87beef`.

## Separate existing failure

An additional check of pending seed-generator/timetable work passed ten tests and failed one before package adoption. `generator.test.ts:38` requires payroll below 70% of generated recurring fees: observed payroll was 114,073 against a limit of 111,160. Teacher/driver seniority and salary generation are random. Salary rules and the margin assertion were preserved; this report does not call that check passing. These pending changes are included in the owner's requested all-work commit.

## What we can do next

The package prerequisite and exact registry adoption are complete. Implement School's app-owned eligibility/history metadata, probability/query guards and terminal-cost ledger through the published preparation API, with the classifier default off. Then prepare a bounded paired synthetic full-chat measurement with its own approved spending allowance. Production enablement still requires correctness/permission/cost/fallback gates and the data decision.

The existing classifier result remains 437 ms mean / 602 ms p95 / $0.01194 for 304 requests. No new paid classifier calls or live School record changes occurred during publication/adoption. Resolve the demo payroll-budget mismatch separately without weakening the test to make it pass.
