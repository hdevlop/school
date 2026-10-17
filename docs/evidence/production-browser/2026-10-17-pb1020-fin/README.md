# PB1020-FIN: Finance on the demo

Tested `https://myscolai.com` on 2026-10-17 between 14:00 and 17:25 UTC: the
Finance group of the production-browser checklist (expenses, payroll,
installments, student credits, aging, reports, financial operations; 26
cases). Final runs are on `b472ff2`, except financial operations, which stays
on `752e1bd` (see Notes). Tester: Claude Code. Chrome 155 through Playwright,
headless, French at 1440×900, with phone-width (390×844) checks. Zero
automatic retries: a failed attempt was diagnosed and the whole script rerun.
No screenshots, traces or raw response bodies were kept.

Every write went to an owned fixture: student-A's fees, a staff member and
expenses created for the run, and a check on student-A's retained Field Trip
fee. Each script asserts its exact list of writes, records page errors and
`/api/csp-report` as diagnostics, checks the served revision did not change,
and cleans up in `finally`.

## Releases under test

| Revision | Change | Deploy run |
| --- | --- | --- |
| `65664e2`, `3450994`, `3a9d055` | Finance forms validate in the page language; failed lists say so; collection column header; transfer labels; selected-fees total | 39043054729, 39043363777, 39043497574: **cancelled** by the next push |
| `752e1bd` | Fee preview in the viewed year; keyboard fee-type picker with a localized count | 39044197656 |
| `2e965f5` | French payment status capitalisation | 39046029911: cancelled by the next push |
| `a55dcd8` | Income and expenses chart shown; najm-kit 3.5.5 (calendar days named in the page language) | 39046275614 |
| `b43b39a` | Expense and payment phone cards | 39047755765 |
| `7c85a5a` | Billing date bounded by the enrollment (najm-kit 3.6.0); translated refusal | 39048907662: introduced the calendar crash below |
| `4b0c58a` | Rollback to najm-kit 3.5.5 by the parallel release agent | 39050464803: cancelled during image build |
| `a823e0f` | Bounds restored on najm-kit 3.6.1, which fixes the crash | 39051137075 |
| `b472ff2` | Fee success messages | 39052227814 |

Each successful workflow passed verify, publish and the Dokploy deploy, and the
served `/deployment-revision.txt` matched. A cancelled run's commits shipped in
the next successful one.

Najm releases: najm-kit 3.5.5, 3.6.0 and 3.6.1.

## Results

| Script | Result | Evidence |
| --- | --- | --- |
| Expenses: failed list, validation, create, edit, approve, pay, phone card, delete | **22 pass** | [expenses](expenses-results.json) |
| Payroll: owned staff, pay, repeat refused, undo, teacher refused | **16 pass** | [payroll](payroll-results.json) |
| Installments: picker, bounded billing date, preview vs saved, quarterly edit, delete | **19 pass**, 1 NOT RUN | [installments](installments-results.json) |
| Aging and reports | **19 pass**, export NOT EXPOSED | [aging-reports](aging-reports-results.json) |
| Financial operations: check deposit and bounce, audit, rollover dialog, teacher refused (`752e1bd`) | **16 pass** | [financial-operations](financial-operations-results.json) |
| Student credits | **7 pass** (API), 1 BLOCKED, 1 NOT RUN | [credits](credits-results.json) |
| Residue | **clean** | [residue-check](residue-check.json) |

- **Installments M02 closeout** (July 1–14 and later boundaries): NOT RUN.
  It needs a controlled clock, so it cannot run on production.
- **Student credits:**
  - BLOCKED in the browser. The credit panel and the overpayment option were
    removed from the dashboard in `4f2f9a4` (2026-10-07); the API remains.
  - M03 (credit creation and reversal) NOT RUN. It needs an overpayment,
    which is a database obligation, not a browser one.
- **Reports export:** NOT EXPOSED. The page has no export control.

## Defects found and fixed

1. **Finance forms refused input in English.** The expense, fee type, fee,
   payment and student-with-fees schemas held English literals. They are now
   factories that take `t`, with keys under `expenses.validation`,
   `fees.validation` and `payments.validation` in all four languages.
2. **A failed expense, fee type or payment list looked empty.** It offered
   the user to add a first record and the header said 0. The tables now show
   the error and keep the count unknown.
3. **The collection table's last column was untranslated**, and the Arabic
   and Spanish collection title and student count were wrong.
4. **The selected-fees total summed gross amounts with a "$".** It now sums
   net amounts in the school currency.
5. **The fee preview used today's school year**, not the year being viewed.
   The fee type picker could not be used from the keyboard, and its count was
   English. The cards are now checkboxes toggled with Space or Enter.
6. **"Virement international"** replaced the wrong wire-transfer label in
   fr, ar and es. French payment statuses are now capitalised like the rest
   of the interface.
7. **The income and expenses chart did not show.** Its container had no
   height in the reports column, so only one of the two charts drew. It now
   has a fixed height.
8. **Calendar days were announced in English** ("Monday, June 1st, 2026")
   under a French caption. Fixed in najm-kit 3.5.5: day buttons, grid and
   weekdays are named through `Intl` in the page language.
9. **The expense phone card showed raw data.** The amount was "1234.50", the
   method was the enum ("Check") and there was no status; the payment card
   showed the method enum too. Both cards now format and translate these.
10. **A fee's billing date could be one the server refuses.**
    - **Symptom:** for student-A (enrolled 2026-06-01), the form offered
      September 2025 and previewed ten instalments. The server then refused
      with an English message, because the validator forwarded the date
      utility's own text.
    - **Server fix:** the refusal now names a catalog key for each reason;
      the rollover preview's per-student error does too.
    - **Regression guard:** `test:server-i18n` now fails on any refusal that
      forwards another error's `.message`.
    - **Calendar fix:** the date picker offers only the billable days, using
      najm-kit's new `min`/`max`.
    - **Placeholder:** the date field shows the enrollment date in the
      school's format instead of ISO text.
11. **Fee creation answered "Frais terminé avec succès"** ("fee completed").
    Arabic and Spanish had the same meaning, and two read messages reused the
    sentence. They now say fees were created and that payments and revenue
    were retrieved.

### Regression introduced and fixed during the run

- **What broke:** najm-kit 3.6.0 crashed any empty date field when its
  calendar opened. The page showed "This page couldn't load", with
  `RangeError: Invalid time value`.
- **Cause:** a form passes an empty date as `""`, and 3.6.0 opened the
  calendar on it as an Invalid Date.
- **Exposure:** production served it from the `7c85a5a` deploy (16:31 UTC)
  until `a823e0f` (17:01 UTC).
- **Detection:** the installments script and the parallel release agent both
  caught it. That agent's rollback (`4b0c58a`) was cancelled during its image
  build before it deployed.
- **Fix:** najm-kit 3.6.1 reads empty and unparseable values, bounds
  included, as no date. Tests cover empty and unparseable values with and
  without `min`/`max`.
- **Verified:** on `b472ff2` the installments script opens the empty billing
  date. The calendar shows June 2026, the previous-month button is disabled,
  and no page error occurs.

## Notes

- **Installments coverage.** Both owned students were enrolled on
  2026-06-01, so 2025-2026 bills only June 2026: one monthly and one
  quarterly instalment. Splitting a fee over several months is not exercised
  on production. The fee utility and server history tests cover it.
- **Financial operations on `752e1bd`.** Each run records a check on
  student-A's retained Field Trip fee and bounces it. A bounced check is
  payment history and cannot be deleted, so the script was not rerun on
  later revisions: nothing it exercises changed after `752e1bd`. The fee is
  fully due again (200.00), as the residue check confirms. Two bounced checks
  are now in its history: one from an earlier attempt, one from the final
  run.
- **Aging and reports agree with the fees list.**
  - Aging total: 887,051.00 MAD, over 59 students. Each student's total
    equals their overdue balance on the fees list.
  - Year income: 869,133.00 MAD. The trend, the per-class collection and the
    KPI card all agree.
- **Payroll undo keeps the payslip.** "Annuler" returns the June payslip to
  pending; cleanup deletes it through the API.

## Open findings (not fixed)

- **Product decisions:**
  - **Student credits:** restore a credit panel, or retire the remaining
    credit API.
  - **Paid expenses:** a paid expense can still be deleted.
  - **Payroll undo:** "Annuler" (undo a payment) asks for no confirmation.
- **Interface:**
  - The expense table shows a raw ID column.
  - The fee dialog says "Étudiant" where the rest of the interface says
    "Élève".
  - Plural agreement: "1 Versements", "{{count}} chèques".
- **Server validation:** DTO messages are English literals ("Amount must be
  greater than 0" with `X-Language: fr`). The forms catch these first, but
  API and MCP callers see English.
- **Other features:** about 19 form schema files outside Finance still hold
  English validation messages. Reminders has no failed-list state; it belongs
  to the Communication run.

## Cleanup

The [residue check](residue-check.json) on `b472ff2` finds:
- no PB1020 expense;
- no PB1020 staff or roster row;
- no Technologie fee on student-A;
- no pending PB1020 check;
- student-A's Field Trip fee fully due (200.00).

Payroll deleted its payslip and staff record, and installments and expenses
deleted their own records.
