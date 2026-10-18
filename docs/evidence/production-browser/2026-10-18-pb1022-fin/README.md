# PB1022-FIN: Finance recheck on the demo

Tested `https://myscolai.com` on 2026-10-18, 11:50 to 12:20 UTC. This run is
the production recheck of the finance cases that the
[PB1021-FIN dev batch](../../development-browser/2026-10-18-finance/README.md)
fixed and passed locally:
- fee types R01, M01 and M02
- fees R01 to M03
- payments R01, R02, M01, M02 and M03
- the batch's follow-up fixes and the najm-kit 3.6.2 controls

Tester: Claude Code. Chrome 155 through Playwright, headless, French at
1440×900, with checks at 390×844 and in Arabic right-to-left. No automatic
retries. Each script records:
- its exact writes
- page errors, `/api/csp-report` posts and 5xx responses
- native browser dialogs
- the served `/deployment-revision.txt`

## Releases under test

| Revision | Change | Deploy run |
| --- | --- | --- |
| `6a2284b` | PB1021-FIN fixes and follow-up; Payments coder's check-to-cash replacement and itemized receipts | 39115645438 |
| `bfaa158` | najm-kit 3.6.2 (localized control names, keyboard settings menu, calendar closes on pick) | 39122981372 |
| `4daea77` | zod's English default messages installed on the server (found by this run, see below) | 39125950267 |

Every run passed verify, image build and the Dokploy deploy, and the served
revision matched.

## Demo year

The demo's active year is **2025-2026**, which ended on 30 June 2026. Today
is past its end, so every installment of a new charge is overdue. The
dev scripts were written for 2026-2027 and were adapted:
- **Fixture dates.** Students are enrolled on 1 September 2025.
- **Fee start.** The billing start is 1 November 2025, reached with "Mois
  précédent".
- **Expected totals.** Each fee's amount due equals its full net amount.
- **payments-M01.** It picks tuition #1 and #2 and registration by their
  checkbox names (3.200,00 MAD) instead of "pay all overdue". Paying all 12.000
  would leave no installment for M02 and M03.

The demo also has a historical year (2024-2025), so **fees-R02 ran here**.
The local demo has only one year, so this case could not run there.

## Results

| Script | Result | Evidence |
| --- | --- | --- |
| Fee types: list, filters, validation, create/edit, referenced delete, teacher refused | **13 pass** (M01 API case after `4daea77`) | [fee-types](fee-types-results.json), [M01 rerun](fee-types-m01-rerun-results.json) |
| Fees: stat cards, class/section/status/schedule/search filters, historical year, create with billing date and discounts, edit, refusals, cleanup | **16 pass**, class bulk form NOT EXPOSED | [fees](fees-results.json) |
| Payments part 1: amounts due, selections, check requirements, invalid amounts, one payment across two fees | **6 pass** | [part 1](payments-1-results.json), [R02 rerun](payments-1-r02-results.json) |
| Payments part 2: over-tender, over-allocation, double-click, idempotent replay, check deposit/encash/bounce, void, totals | **11 pass** | [part 2](payments-2-results.json) |
| Follow-up fixes: `/fees` create feedback, reason forms, translated statuses, dialog names | **9 pass** | [follow-ups](followups-results.json) |
| Layout and language: register at 1440 and 390 px, fee type cards, Arabic RTL | **4 pass** | [visual](visual-results.json) |
| najm-kit 3.6.2: French checkbox names, keyboard settings menu, "Retirer", calendar closes | **2 pass** | [kit](kit362-results.json) |
| Audit append-only (API): PUT, PATCH and DELETE 404, entry unchanged, teacher 403 | **pass** | [audit](audit-append-only-results.json) |

All runs had:
- zero page errors
- zero CSP reports
- zero 5xx responses
- zero native browser dialogs

The void and bounce reasons now use the in-page form.

### Notes on the two first-attempt failures

- **payments-R02.** The French refusals were present. The script expected
  "d'échéance" with a straight apostrophe, but the catalog writes
  "d’échéance". After the assertion was corrected, this case was rerun alone;
  it sends no request.
- **fee-types-M01 (API).** This was a real defect. An invalid payment type
  was refused with the English "Invalid input". zod installs its English
  messages with a top-level `config(en())` in a package marked
  `"sideEffects": false`, and the production bundle drops that call. The
  dev server keeps it, which is why the dev batch passed. As a result:
  - every zod default message read "Invalid input"
  - that text matches no locale
  - so it reached French users untranslated

  `4daea77` installs the defaults in the server's validation formatter. The
  rerun on `4daea77` refuses in French ("Option invalide : une valeur parmi
  …"), Arabic and Spanish. Test: `ValidationMessages.test.ts`.

  The dashboard bundle may have the same gap for zod default messages in
  forms; most dashboard schemas pass their own catalog messages.

### Arabic register

The Arabic case asserts right-to-left layout, no overlap and no damaged text.
Its amount lookup matches no Arabic amounts ("د.م."), so that comparison
checks nothing; this was also true in the dev run. The screenshot was
reviewed instead: the three register amounts read 1.100,00 / 1.100,00 /
0,00 د.م. with no overlap. Screenshots are not kept.

## Writes and cleanup

Setup used the API (exact writes are in each file):
- section PB1021 in CM2 (2025-2026)
- students Pbtest Alpha (PB1021A) and Pbtest Beta (PB1021B)
- a teacher login for the refused-access checks
- student-A's Tuition (10 × 1.100) and Registration (1.000):
  [setup](setup-fees-results.json)

The cases created and then removed:
- one fee type
- student-B's charges
- student-A's extra Manuels and Cantine charges

The cases also recorded student-A's payments and checks. No pending check
remains.

[Cleanup](cleanup-results.json) removed student-B, the teacher login and the
fee types. Student-A and section PB1021 are **retained**. Student-A has
payment history (completed, bounced and voided), and the API refuses to
delete her ("Mettez fin à son inscription à la place"). The section still
holds her. This matches the dev batch. The earlier PB1016 fixtures (section
PB1016, students PB1016A/B) were already on the demo and were left
untouched.

## Not covered here

- **installments-M02 closeout.** This needs a controlled clock. The
  closeout date is stored but not enforced: an owner decision.
- **Credits and rollover commit** (financial-operations R01, M01).
  Unchanged from PB1020-FIN.
- **Notification generation and database-level audit immutability**
  (financial-operations M02).
