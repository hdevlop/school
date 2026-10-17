# PB1018: receipts, fees, recovery delivery and staff attendance on the demo

Tested `https://myscolai.com` on 2026-10-17 between 11:00 and 13:00 UTC. The
four main scripts' final runs are on `440c060`; the payment-count check is on
`c241ed9`, which changed only the student fee summary. Tester: Claude Code,
continuing [PB1017](../2026-10-16-pb1017/README.md). Chrome 155 through
Playwright, headless, French at 1440×900 (one Arabic context for fee type
names). Zero automatic retries: a failed attempt was diagnosed and the whole
script rerun. No screenshots, traces or raw response bodies were recorded.

The owner authorised the two cases PB1017 left BLOCKED: reading the demo
mail-test gateway for recovery delivery, and a staff attendance save, which
writes a mark for every unrecorded staff member and is removed afterwards.

## Releases under test

| Revision | Change | Deploy run |
| --- | --- | --- |
| `934118b` | School receipt language (migration `0070`), translated fee names, student photo fallback, year selector retry | 39026129089 — **failed** verify (seed tests committed ahead of their implementation) |
| `6534f79` | Seed teacher assignments completed; CI green again | 39026344251 |
| `a758a89`, `4c11365` | najm-kit 3.5.4 adopted (selects named and valued, localized country button); narrower fee filters | 39027818875 |
| `e8d1c1a` | najm-auth 6.5.0 and najm-email 3.2.0: recovery and invitation emails in the request's language; auth pages leave no unhandled rejection | 39030139658 |
| `7390cdb`, `e29ee12` | najm-auth 6.6.0: sign-in pages send the page language; fee collection statistics | 39031400082 |
| `440c060` | Receipt print dialog opens under the site CSP | 39032454750 |
| `c241ed9` | Payment history counts payments, not paid fees | 39033730784 |

Each workflow passed verify, publish and the Dokploy deploy step, except
`934118b`, and the served `/deployment-revision.txt` matched.

## Results

| Script | Result | Evidence |
| --- | --- | --- |
| Payment history count (`c241ed9`, read-only) | **3 pass** | [payment-count](payment-count-results.json) |
| Receipt language, receipts, fee names, fee filters and statistics, year selector | **56 pass**, two settings saves restored | [receipts-fees](receipts-fees-results.json) |
| AUTH-07 recovery delivery and link use (teacher-A) | **16 pass** | [recovery-delivery](recovery-delivery-results.json) |
| Staff attendance roster save | **12 pass**, 18 marks created and removed | [staff-attendance](staff-attendance-results.json) |
| Residue | **clean** | [residue-check](residue-check.json) |

Checklist cases covered: settings-R03, settings-M03, payments-R03, AUTH-07.

## Defects found and fixed

1. **Every settings select was announced as "Select"** (najm-kit). A
   `FormInput` select with a label and no placeholder fell back to the English
   generic name, and its transparent trigger held no text, so no value was
   announced. Fixed in najm-kit 3.5.4: the label names it, the trigger
   carries the chosen value, and the fallback and the phone country button
   ("Country selector" upstream) follow the page language.
2. **Recovery and invitation emails were English** whatever the interface
   language; only the subject went through the catalog, and the body was
   fixed English in najm-email. Fixed in najm-email 3.2.0 (localizable
   templates, `lang`/`dir`) and najm-auth 6.5.0 (text from `auth.emails.*`),
   with French, Arabic and Spanish added to School's catalogs.
3. **Sign-in pages sent no language with auth requests.** Forgot password,
   reset and register use najm-auth's own client, which carried no
   `X-Language`; a first-time visitor sees the school's French but has no
   language cookie, so the server answered in English even after fix 2.
   Fixed with `NajmAuthClient.setRequestHeaders` (najm-auth 6.6.0), which
   School registers in `AppProviders`.
4. **A refused reset link raised an uncaught page error** ("Invalid password
   reset token") although the French message showed. The reset, forgot
   password and register pages no longer leave the rejection unhandled.
5. **Printing a receipt never opened the print dialog.** The receipt window
   inherits the page's CSP, which allows only nonce-bearing scripts, so its
   inline `window.print()` was refused and reported to `/api/csp-report`. The
   opener now prints the window once its logo has loaded or failed. The script
   asserts one print call per receipt and no CSP report.
6. **"Nombre de paiements" counted paid fees.** A student's payment history
   card showed `paidCount`, the number of fully paid fees: 5 beside a table
   of 2 payments. The summary now returns `paymentCount`, the completed
   payments allocated to the student's fees, and the card shows it; both
   checked students now match their tables.

## Notes

- **Receipt logo.** Receipts print the bundled
  `school-logo-monochrome.png`, not the logo in the school settings. This is
  how `934118b` was written; the run checks it, it does not judge it.
- **Staff attendance stand-in.** Fixture staff-A was hired on 2026-10-16, so
  the 30 June roster (the viewing year's last day) correctly omits them. The
  first listed person was marked instead; 30 June had no staff mark before the
  run, so every mark on it afterwards was the run's own and all 18 were
  deleted.
- **teacher-A's password** was replaced by AUTH-07, as the case requires; the
  ignored accounts file holds the current one and the residue check signed in
  with it. Four older test emails to teacher-A (one PB1016 invitation, three
  PB1017 recovery requests) remain in the gateway; every PB1018 email was
  deleted.
- **Concurrent work.** Another contributor's uncommitted fee, receipt,
  settings and seed changes were committed at the owner's request in
  `934118b`, `6534f79`, `4c11365` and `e29ee12` after the full check suite
  passed.

## Fixtures and cleanup

Changed and restored: the school receipt language (Arabic, then French, both
through the UI; no other setting changed). Created and deleted: 18 staff
attendance marks on 2026-06-30 (in each of two runs) and four recovery
emails (one per AUTH-07 run). Kept by design:
teacher-A's new password.
