# Handoff: Communication production-browser run (PB1019-COMM)

For: the coding agent taking the Communication group. Claude Code is running
the Finance group (expenses, payroll, installments, student credits, aging,
reports, financial operations) at the same time on the same demo and branch.

## Scope

26 cases in five checklists. Run every case to PASS, FAIL, BLOCKED or NOT RUN.
Never tick boxes in the checklists; results go in evidence and the ledger.

| Checklist | Cases | Notes |
| --- | --- | --- |
| [announcements](../announcements.md) | R01–R02, M01–M04 | Publish/unpublish only to a controlled audience, never school-wide |
| [alerts](../alerts.md) | R01–R04, M01–M04 | Needs A/B identities; never use delete-all |
| [notifications](../notifications.md) | R01–R03, M01–M02 | Delivery only to test recipients |
| [reminders](../reminders.md) | R01–R02, M01 | Read fee data, write none: Finance owns fee/payment state |
| [push-preferences](../push-preferences.md) | R01, M01–M02 | Keep endpoint and subscription secrets out of evidence |

## Target and identities

- Demo: `https://myscolai.com`. Before and after each script, read
  `/deployment-revision.txt`; a mid-run change of revision invalidates that run.
- Accounts and fixtures: `.cache/production-browser/myscolai-accounts.json`
  (git-ignored; never commit or print passwords). Identities: `admin`,
  `teacher-a`, `parent-a` (child student-A), `parent-b` (child student-B).
  Owned section `PB1016` (class CM2) holds only student-A and student-B, and
  teacher-A teaches it: use it as the controlled audience.
- Gaps: there is no student login and no teacher-B. Create owned ones through
  the UI if a case needs them, and remove them at the end, or record the case
  BLOCKED with the reason. Never use real families or staff as recipients.

## Rules learned the hard way

- **Sign-in rate limit:** 8 attempts per 10 minutes per identity, failures
  included. Sign in once per account and reuse the session:
  `.cache/production-browser/pb1018/session.mjs` (`sessionFor`, `remember`).
  A context opened later in a run must take `storageState()` from a live
  context, not the state captured at start; the refresh token rotates.
- **Mail:** `@school.test` mail is readable through the mail-test gateway.
  The URL and token are `SCHOOL_E2E_MAILBOX_API_URL` and
  `SCHOOL_E2E_MAILBOX_TOKEN` in `apps/dashboard/.env.local`; never print the
  token. Routes: `GET /api/v1/search?query=to:<address>`,
  `GET /api/v1/message/<id>`, `DELETE /api/v1/messages` with `{"IDs":[...]}`.
  Delete the messages your run creates. The owner authorised this on
  2026-10-17; `.cache/production-browser/pb1018/recovery-delivery.mjs` is a
  working example.
- **Writes:** record every non-GET `/api/` request a script makes and assert
  the list is exactly the expected one. `POST /api/csp-report` is a finding (a
  blocked script), not noise.
- **Page errors:** listen for `pageerror`; an uncaught rejection after a
  refused save is a defect even when the toast is right.
- **Owned fixtures only:** create what you mutate, prove the starting state
  first (abort if it is not what you expect), and delete exactly what you
  created. End with a residue check script.
- **Zero automatic retries:** diagnose a failure, fix the script or the
  product, and rerun the whole script.
- **Clock:** server and browser disagree on the Casablanca offset after
  23:00 UTC; accepted by the owner (the school closes at 17:00). Run in the
  day.
- **Phone width:** some lists default to cards at 390 px; select by role and
  accessible name, not table rows only.

## Fixing defects

- Follow `CLAUDE.md` (framework contracts, catalogs in
  `packages/contracts/src/locales`, form schemas in the feature's `config/`).
- Gate before every commit: `bun run lint`, `bun run typecheck`,
  `bun run i18n:check`, `bun run test`, `bun run test:boundaries`.
- Locale JSON files are stored with LF line endings; check for `\r` before
  committing (Python text mode on Windows writes CRLF).
- A defect inside a Najm package is fixed in `C:\Users\hdevlop\Desktop\najm`
  and published with `bun scripts/publish-package.ts <pkg> --patch|--minor`,
  then a release commit and a second run without the flag. Update the API
  snapshot (`bun run api:snapshot`) when exports change. School pins the
  exact version in every workspace plus the root override.

## Sharing the branch

- Every push to `main` deploys the demo in about 12 minutes (a docs-only push
  skips the build).
- Commit only your own files; `git pull --rebase` before pushing. If the
  working tree holds someone else's unfinished changes, leave them unstaged.
- Do not change finance data or code (fees, payments, expenses, payroll,
  settings); tell the owner if a Communication defect needs it.
- If CI fails on a commit that is not yours, say so; do not fix it silently.

## Evidence

- Folder `docs/evidence/production-browser/2026-10-17-pb1019-comm/`: a README
  (releases under test, results per script, defects with fixes, notes,
  fixtures and cleanup) and one aliased results JSON per script. Alias every
  name, email, code and receipt; no tokens, cookies or raw bodies.
- Add one line to [evidence-ledger.md](../evidence-ledger.md).
- Model: [PB1018](../../../evidence/production-browser/2026-10-17-pb1018/README.md).
