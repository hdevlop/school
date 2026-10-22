# Finance consumer UI follow-up

October 22, 2026 (Africa/Casablanca). Source follow-up to the user's local
finance acceptance report. The reported payment, check, expense, payroll and
dashboard reconciliation results were supplied by the user; they were not
repeated against the development database in this follow-up.

## Changes

- The payment register shows Cash received and Give customer only for cash.
  Other methods show Amount to record, using the same selected-installment total
  the existing form submits. Underpayment remains refused by the existing form.
- Bounce and void reason validation uses the current language's required/length
  messages instead of Zod's default schema text.
- Check table and card avatars use at most two student initials, with the full
  name retained as alternative text and the avatar protected from flex shrinking.
- Accountants can be created without a cycle. Empty assignment rows are omitted
  from creation. An assignment containing dates or notes still needs its cycle;
  server authorization and assignment checks remain in force.
- The Payroll total tile explicitly includes paid and unpaid amounts. The count
  tile now reads Paid / Staff, matching the count it actually displays.
- All new labels are translated in English, French, Arabic and Spanish.

## Development startup

The local start script uses `next dev --turbo`, so a first visit may wait for
route compilation. No application performance defect was established from that
observation. Production page timings and a new browser acceptance run remain
unverified; the production build check is recorded separately below.

## Verification

- Focused staff, check-reason, payment and payroll schema checks: 27 passed.
- `bun run test:finance`: 152 passed.
- Isolated server-rendered register smoke checks passed for all seven supported
  methods; they verify labels, amounts and change visibility without live payments.
- `bun run i18n:check`: passed.
- Root lint: passed with the existing ParentsTable hook-dependency warning.
- Root type checking: passed.
- Isolated production build (`NAJM_NEXT_DIST_DIR=.next-finance-fixes`): passed.
  The existing Najm Chatbot RAG-import deprecation notice remains.
- `git diff --check`: passed.

The existing TEST001 student, test accountant, 5,000 dh salary and 250 dh TEST
Office supplies expense were left in place. No database records or finance
transactions were created, updated, reversed or deleted by this follow-up.

## Fee editing, discounts and duplicate checks follow-up

The owner's next report identified five additional issues. Read-only internal MCP
checks of TEST001 confirmed the saved fee was already correct: 1,100 dh monthly
base, 9,900 dh gross, 900 dh aggregate discount, 9,000 dh net, nine installments,
and an October 22 billing date. The discount was persisted; its display was wrong.

- The per-student fee response now retains `discountAmount`, `discountReason`,
  `effectiveDate` and `paymentType`, while retaining the existing `discount` alias.
- The edit dialog reads the discount as 100 dh per month and preserves the saved
  billing span in previews. An unchanged save omits financial fields; notes-only
  saves do not trigger schedule regeneration or round stored discounts.
- The Discounts tab compares aggregate gross, net and discount amounts, so the
  reported fee counts as discounted and shows its 900 dh total discount.
- Creating a check or changing its number now refuses an existing number for the
  same student, ignoring surrounding whitespace and letter case. Transaction
  locks serialize competing School writes. This identity check spans school
  years and receipt statuses. Idempotent replay and unchanged metadata edits
  remain supported. Existing duplicate receipts are preserved; no unique index
  or database rewrite was applied. Direct external database writers are outside
  this service-level guard.
- The Collection Rate label and explanatory text identify installments due to
  date and exclude prepaid installments. The calculation is unchanged.
- Student finance cards allow names and status badges to wrap, with space for
  the row menu.

Verification of this follow-up:

- Focused finance/year-scope/fee-preview tests: 59 passed.
- Finance suite: 154 passed.
- Live MCP read after the fix returned the original saved financial amounts,
  billing date and discount under their canonical fields. No live writes occurred.
- Real PostgreSQL HTTP/MCP acceptance verifies the October fee response,
  notes-only editing after payment, competing duplicate checks, idempotent replay
  and refusal to rename another check to the same number. The final lifecycle
  rerun passed 25 tests; the fee-history transport suite passed 2 tests. Older
  replacement test fixtures now use distinct check numbers per lifecycle case.
- Root typecheck and isolated production build (`.next-fee-review`): passed.
  The existing Najm Chatbot RAG-import deprecation notice remains.
- i18n scan and lint passed; lint retains the existing ParentsTable warning.
- Visual browser acceptance has not been repeated.
