# Production browser evidence ledger

## Attempts

| Run | Target / serving SHA | Outcome | Record |
| --- | --- | --- | --- |
| pb1016, 2026-10-16 | myscolai.com / `7657cc0` | Partial: auth, ownership and most CRUD pass; finance regressions 1, 2, 4, 5 and two form defects fail on the serving release, fixed locally and not yet deployed | [pb1016](../../evidence/production-browser/2026-10-16-pb1016/README.md) |
| pb1016r, 2026-10-16 | myscolai.com / `389a4ec`, then `bc4e665` | Deployed and targeted retests pass: 30 API/MCP checks and 27 final browser checks; 5 expense-menu checks on the first release. Four finance regressions verified fixed, role defaults reconciled, remaining parent-profile 403 fixed in the follow-up. Concurrency and full matrix remain unrun. | [pb1016r](../../evidence/production-browser/2026-10-16-pb1016r/README.md) |
| Finance concurrency, 2026-10-16 | Local marked `school_history_test`; demo / `c554edb` | Duplicate-key retry returning 500 fixed and deployed. All 15 PostgreSQL lifecycle transport cases, 103 finance unit tests, CI and 30 deployed REST/MCP smoke checks pass. App and worker healthy; fixtures cleaned up. Simultaneous payment tests ran only on the local fixture. | [Concurrency follow-up](../../evidence/production-browser/2026-10-16-finance-concurrency/README.md) |
| Payroll eligibility, 2026-10-16 | Local marked `school_history_test`; demo / `7b5b8d5` | Pre-hire payroll blocked in generation/payment; desktop and phone single/bulk confirmation added. CI, 16 lifecycle plus 2 history database cases, 34 live REST/MCP checks, 23 payroll browser checks and 27 broader browser checks pass. App and worker healthy on the exact published image; temporary records removed. | [Payroll follow-up](../../evidence/production-browser/2026-10-16-payroll-eligibility/README.md) |
| Extended read-only testing, 2026-10-16 | myscolai.com / `0c24323` | 202 navigation assertions across 93 page visits and 45 API checks pass. Localized dialog keyboard checks pass after diagnosing an immediate focus assertion as test timing. French staff validation still shows four English errors; empty zones still block cleaner/security creation. No domain mutations or mocks; full acceptance remains incomplete. | [Extended read-only run](../../evidence/production-browser/2026-10-16-extended-readonly/README.md) |

Features not listed in that record remain **NOT RUN**.

Copy the following block for each attempt; keep earlier failures and partial results. Store sanitized run records under `docs/evidence/production-browser/` when execution occurs, and link them from here. Do not create a PASS row from a documentation review.

## Attempt template

| Field | Value |
| --- | --- |
| Run label / UTC time | NOT RUN |
| Source/test candidate SHA or worktree fingerprint | NOT RUN |
| Serving full SHA / exact origin | NOT RUN |
| Revision/readiness proof and replica limitation | NOT RUN |
| Coder / tester / handoff | NOT RUN |
| Browser version / locale / theme / viewport | NOT RUN |
| Feature and exact case IDs; selected / executed counts | NOT RUN |
| Fixture ownership and authorized write/delivery scope | NOT RUN |
| Auth/local promotion prerequisites | NOT RUN |
| Command and native exit code, or manual procedure | NOT RUN |
| Expected / observed / duration per case | NOT RUN |
| Command verdict / case verdict / group verdict | NOT RUN |
| Page / console / request / response error counts | NOT RUN |
| Failure fingerprint and TEST / PRODUCT / RUNNER / ENVIRONMENT | NOT RUN |
| Cleanup removed / remaining counts and retention outcome | NOT RUN |
| Local process teardown, or N/A for remote | NOT RUN |
| Redacted artifact links / secret scan | NOT RUN |
| Source / API / DB / production smoke / full promotion status | NOT RUN |
| Deployment NOT REQUIRED or exact healthy revision evidence | NOT RUN |
| Next owner and remaining cases | NOT RUN |

Allowed case outcomes: PASS, FAIL, BLOCKED, NOT RUN, EXCLUDED BY SELECTION (EXCLUDED BY GREP for automation). Explain missing UI surfaces and unavailable fixtures. A feature with skipped mandatory cases remains incomplete. Reconcile separate delivery evidence for email/push; a toast or simulated transport is not delivery.

Completion requires the [retained completion definition](reference/evidence-and-completion.md), including full auth/access-reset gates, all feature rows, shared matrix, separate real-database guarantees, exact cleanup and accepted-candidate checks. This production folder does not convert old source results into new runtime proof.
