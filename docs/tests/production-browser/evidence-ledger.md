# Production browser evidence ledger

## Attempts

| Run | Target / serving SHA | Outcome | Record |
| --- | --- | --- | --- |
| pb1016, 2026-10-16 | myscolai.com / `7657cc0` | Partial: auth, ownership and most CRUD pass; finance regressions 1, 2, 4, 5 and two form defects fail on the serving release, fixed locally and not yet deployed | [pb1016](../../evidence/production-browser/2026-10-16-pb1016/README.md) |
| pb1016r, 2026-10-16 | myscolai.com / `389a4ec`, then `bc4e665` | Deployed and targeted retests pass: 30 API/MCP checks and 27 final browser checks; 5 expense-menu checks on the first release. Four finance regressions verified fixed, role defaults reconciled, remaining parent-profile 403 fixed in the follow-up. Concurrency and full matrix remain unrun. | [pb1016r](../../evidence/production-browser/2026-10-16-pb1016r/README.md) |
| Finance concurrency, 2026-10-16 | Local marked `school_history_test`; demo / `c554edb` | Duplicate-key retry returning 500 fixed and deployed. All 15 PostgreSQL lifecycle transport cases, 103 finance unit tests, CI and 30 deployed REST/MCP smoke checks pass. App and worker healthy; fixtures cleaned up. Simultaneous payment tests ran only on the local fixture. | [Concurrency follow-up](../../evidence/production-browser/2026-10-16-finance-concurrency/README.md) |
| Payroll eligibility, 2026-10-16 | Local marked `school_history_test`; demo / `7b5b8d5` | Pre-hire payroll blocked in generation/payment; desktop and phone single/bulk confirmation added. CI, 16 lifecycle plus 2 history database cases, 34 live REST/MCP checks, 23 payroll browser checks and 27 broader browser checks pass. App and worker healthy on the exact published image; temporary records removed. | [Payroll follow-up](../../evidence/production-browser/2026-10-16-payroll-eligibility/README.md) |
| Extended read-only testing, 2026-10-16 | myscolai.com / `0c24323` | 202 navigation assertions across 93 page visits and 45 API checks pass. Localized dialog keyboard checks pass after diagnosing an immediate focus assertion as test timing. French staff validation still shows four English errors; empty zones still block cleaner/security creation. No domain mutations or mocks; full acceptance remains incomplete. | [Extended read-only run](../../evidence/production-browser/2026-10-16-extended-readonly/README.md) |
| pb1017, 2026-10-16/17 | myscolai.com / `39b067b` … `65b15ec` | Eleven defects found and fixed across seven deploys, including both open findings (French staff validation; zone management, so cleaner/security creation now passes), drivers that could not be deleted, no way to end a driver assignment, and English icon-button names fixed in najm-kit 3.5.3. On `65b15ec`: staff/zones/job titles 34, grades/attendance 24, student routes 20, vehicle assignments 17, kit labels 12 and recovery request 6 pass, with owned fixtures removed. Recovery delivery and staff attendance saves BLOCKED; a server/browser Casablanca offset disagreement after 23:00 UTC is accepted (school closes at 17:00). | [pb1017](../../evidence/production-browser/2026-10-16-pb1017/README.md) |
| pb1018, 2026-10-17 | myscolai.com / `934118b` … `c241ed9` | Six defects found and fixed: settings selects announced as "Select" (najm-kit 3.5.4), English recovery and invitation emails (najm-email 3.2.0, najm-auth 6.5.0), sign-in pages sending no language (najm-auth 6.6.0), an uncaught error on a refused reset link, receipts whose print dialog the site CSP blocked, and a payment-history count that counted paid fees. The two PB1017 BLOCKED cases now pass with the owner's authorisation: AUTH-07 recovery delivery and link use 16, staff attendance save 12 (18 marks removed). Receipt language, receipts, fee names, filters and statistics 56; payment count 3. Residue clean. | [pb1018](../../evidence/production-browser/2026-10-17-pb1018/README.md) |
| PB1019-COMM, 2026-10-17 | myscolai.com / `041697a`; isolated local `school_history_test` | Partial Communication acceptance: 164 final live REST/MCP assertions and 14 final residue assertions pass; 37 source/unit and 12 local PostgreSQL transport tests pass. Five owned drafts/alerts created and removed across all attempts; no live finance writes or delivery. One preliminary TEST failure (teacher creation permission assumption) corrected with evidence retained. Browser unavailable: all 25 checklist cases BLOCKED; mixed class audience, empty controlled inboxes and disabled push leave lifecycle obligations open. | [PB1019-COMM](../../evidence/production-browser/2026-10-17-pb1019-comm/README.md) |
| PB1019-COMM continuation, 2026-10-17 | Isolated local `school_history_test`; prior demo evidence remains on `041697a` | One confirmed, unfixed PRODUCT defect: fresh notification mark-read and mark-all fail with PostgreSQL `23514` under Casablanca database timezone because app UTC read timestamps precede DB-local creation. Seven additional repository tests pass; 30 older-fixture notification/subscription assertions pass without clearing the defect. Local fixtures cleaned; no live writes or deployment. Browser still unavailable; 25 UI cases remain BLOCKED. | [Continuation and reproduction](../../evidence/production-browser/2026-10-17-pb1019-comm/README.md#continuation-fresh-notification-read-failure) |
| PB1019-COMM clock fix, 2026-10-17 | Local source and guarded `school_history_test`; deployment NOT RUN | Fixed both notification read methods to use database time. Two database regressions fail before and pass after the fix; existing notification transport also passes (4 combined tests), plus 30 fresh-fixture lifecycle assertions and exact cleanup. Lint, typecheck, root tests and isolated production build pass. No finance edits or live writes. Browser unavailable; 25 UI cases remain BLOCKED. | [Fix and retest](../../evidence/production-browser/2026-10-17-pb1019-comm/README.md#fix-and-continued-acceptance) |
| PB1019-COMM deployed + Playwright, 2026-10-17 | myscolai.com / `38997fe4c194ac66e9b88de17fbb068edfdd7ab8` | Full release gate and GitHub image/deploy pass; app and worker healthy on matching immutable digest. Standalone Chrome 155 Playwright: 111 final assertions PASS, 0 FAIL; four full checklist cases PASS, 21 BLOCKED by missing mandatory parts/prerequisites. French desktop and Arabic phone; no unexpected browser diagnostics. Exact owned cleanup passes; no Finance writes or delivery. Preliminary harness failures retained. Shared tree still contains other coder Finance/skill changes. | [Release and browser continuation](../../evidence/production-browser/2026-10-17-pb1019-comm/README.md#release-and-playwright-continuation) |
| PB1020-FIN, 2026-10-17 | myscolai.com / `65664e2` … `b472ff2` (financial operations on `752e1bd`) | Finance group, 26 cases. Eleven defects found and fixed across six deploys and najm-kit 3.5.5, 3.6.0 and 3.6.1: English validation in finance forms, failed lists shown as empty, a hidden income/expenses chart, English calendar day names, raw phone cards, a selected-fees total in "$", billing dates the server refuses (with an English refusal), and a wrong "fee completed" message. najm-kit 3.6.0 crashed empty date fields 16:31–17:01 UTC and 3.6.1 fixed it. Final: expenses 22, payroll 16, installments 19, aging/reports 19, financial operations 16, credits API 7 pass. Credit UI BLOCKED (removed in `4f2f9a4`); credit M03 and installment closeout NOT RUN; reports export NOT EXPOSED. Residue clean. | [PB1020-FIN](../../evidence/production-browser/2026-10-17-pb1020-fin/README.md) |

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
