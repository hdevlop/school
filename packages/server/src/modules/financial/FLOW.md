# Financial Module — Flow Reference

Authoritative reference for the school finance domain: data model, calculation rules, workflows, and lifecycle. Keep this in sync when changing `fees`, `feeTypes`, `fee_installments`, `payments`, or `allocations`.

---

## 1. Submodules

```
modules/financial/
├── feeTypes/       Catalog of chargeable items (Mensualité, Inscription, …)
├── fees/           Per-student fee assignment for a given academic year
├── installments/   Auto-generated due-date schedule for each fee
├── payments/       Money received from a payer
├── allocations/    Distribution of a payment across installments
├── expenses/       School outflows (unrelated to student billing)
└── utils/          Pure calculation helpers (calculations, scheduleBuilder, recalculations)
```

---

## 2. Data Model

```
FeeType (catalog)
   │
   │ referenced by
   ▼
Fee (student × feeType × academicYear)   ───┐
   │                                         │  recalculated
   │ 1:N                                     │  from children
   ▼                                         │
FeeInstallment (due date + amount)           │
   ▲                                         │
   │ N:1 (via Allocation)                    │
   │                                         │
Payment (money received) ── 1:N ── Allocation
```

### `fee_types`
| Field | Type | Notes |
|---|---|---|
| `id` | nanoid | |
| `name` | text | "Mensualité", "Inscription"… |
| `category` | text | reporting bucket |
| `amount` | money | **per-period base price** (per month if `recurring`, flat if `oneTime`) |
| `paymentType` | enum | `recurring` \| `oneTime` |
| `status` | enum | `active` \| `inactive` \| `archived` |

### `fees`
| Field | Type | Notes |
|---|---|---|
| `id` | nanoid | |
| `studentId` | fk → students | |
| `feeTypeId` | fk → fee_types | `restrict` on delete |
| `schedule` | enum | `monthly` \| `quarterly` \| `semester` \| `annually` \| `oneTime` |
| `academicYear` | text | e.g. `"2025-2026"` |
| `baseAmount` | money | per-period price at assignment time (decoupled from FeeType.amount so historical fees are stable) |
| `grossAmount` | money | = `baseAmount × monthsRemaining` (recurring) or `baseAmount` (oneTime) |
| `netAmount` | money | = `grossAmount − discountAmount` |
| `paidAmount` | money | rollup of all paid installments for this fee |
| `discountAmount` | money | total (not per-month) — for recurring = `perMonthDiscount × monthsRemaining` |
| `discountReason` | text | scholarship, sibling, staff child… |
| `status` | enum | `pending` \| `partiallyPaid` \| `paid` \| `overdue` |
| Unique | `(studentId, feeTypeId, academicYear)` | One fee row per student per type per year |

### `fee_installments`
| Field | Type | Notes |
|---|---|---|
| `id` | nanoid | |
| `feeId` | fk → fees | |
| `number` | int | 1…N sequential |
| `dueDate` | date | |
| `amount` | money | `netAmount / count`, last row absorbs rounding remainder |
| `paidAmount` | money | rollup from allocations |
| `status` | enum | `pending` \| `partiallyPaid` \| `paid` \| `overdue` |

### `payments` and `allocations`
- A `payment` is money received (method, date, payer, total).
- An `allocation` links a payment to one or more installments. Total allocated ≤ payment.amount.
- On allocation, the target installment's `paidAmount` is recalculated, its `status` updated, and the parent `fee.paidAmount` / `fee.status` rolled up ([recalculations.ts](./utils/recalculations.ts)).

---

## 3. Calculation Rules

All math lives in [`utils/calculations.ts`](./utils/calculations.ts) and [`utils/scheduleBuilder.ts`](./utils/scheduleBuilder.ts). Controllers and services must call these — never reimplement.

### 3.1 `monthsRemaining`

```
monthsRemaining = months from effectiveDate (or today) through end of academic year (default June)
```

| Enrollment | monthsRemaining |
|---|---|
| Sept 1 | 10 |
| Oct 15 | 9 |
| Feb 1 | 5 |
| June 1 | 1 |

Driven by [`calculateRemainingMonthsInYear()`](./utils/calculations.ts). `effectiveDate` defaults to the server business date if not passed — **always pass the student's enrollment date** for correctness on back-dated or mid-year enrollments.

### 3.2 Gross / Net

| Scenario | grossAmount | totalDiscount | netAmount |
|---|---|---|---|
| `oneTime` | `baseAmount` | `min(discount, baseAmount)` | `gross − totalDiscount` |
| `recurring` | `baseAmount × monthsRemaining` | `discountPerPeriod × monthsRemaining` | `gross − totalDiscount` |

Discount in the UI input field is **per-period** for recurring, **flat** for one-time. The helper multiplies it out.

### 3.3 Installment Count

| Schedule | periods (recurring) | periods (oneTime) |
|---|---|---|
| `monthly` | `monthsRemaining` | 1 |
| `quarterly` | `ceil(monthsRemaining / 3)` | 1 |
| `semester` | `ceil(monthsRemaining / 6)` | 1 |
| `annually` | 1 | 1 |
| `oneTime` | 1 | 1 |

### 3.4 Installment Amounts & Due Dates

[`buildInstallments()`](./utils/scheduleBuilder.ts):

- Each installment = `netAmount / count`
- **Last installment absorbs the rounding remainder** — the sum of all installments always equals `netAmount` exactly.
- Due dates step from `start` by `interval` months (monthly→1, quarterly→3, semester→6, annually→12).
- Installments whose `dueDate < today` at generation time are marked `overdue` immediately.

---

## 4. Workflows

### 4.1 Student Creation (multi-step form, transactional)

Source UI: [`FullStudentForm.tsx`](../../../../../apps/dashboard/src/features/Students/components/FullStudentForm.tsx)

```
┌────────────────┐   ┌────────────────┐   ┌──────────────┐
│ Tab 1: Student │ → │ Tab 2: Parents │ → │ Tab 3: Fees  │ → SUBMIT
└────────────────┘   └────────────────┘   └──────────────┘
```

The form accumulates state client-side and posts **one payload** containing student, parents, and an array of fee assignments. The backend must execute the following inside **one DB transaction**:

1. Create `user` + `student` row
2. Create/link `parents` (by phone or email if they already exist)
3. Create `studentParents` junction rows
4. For each fee entry in the payload:
   - Compute `grossAmount`, `netAmount` via `calculateFeeAmounts()` with `effectiveDate = student.enrollmentDate`
   - Insert `fees` row
   - Call `buildInstallments()` and bulk-insert `fee_installments` rows
5. Handle any uploaded files (avatar, documents)
6. Commit

Any failure in steps 1–5 rolls everything back: **no orphan students with half-created fees**.

### 4.2 Fee Step Inputs (per row in Tab 3)

From [`BulkFeeForm.tsx`](../../../../../apps/dashboard/src/features/Financial/Fees/components/BulkFeeForm.tsx):

| Field | Source | Notes |
|---|---|---|
| `feeTypeId` | dropdown | required |
| `baseAmount` | auto-filled from `feeType.amount`, editable | per-period price |
| `schedule` | dropdown | **forced to `oneTime` when `feeType.paymentType === 'oneTime'`** |
| `discountAmount` | input | per-period for recurring, flat for oneTime |
| `discountReason` | text | optional |
| `notes` | text | optional |

The form previews `netAmount` live by calling `calculateFeeAmounts()` on every change ([BulkFeeForm.tsx line ~70](../../../../../apps/dashboard/src/features/Financial/Fees/components/BulkFeeForm.tsx)).

### 4.3 Standalone Fee Assignment (existing student)

Same logic, but no student/parent creation. `FeeService.create()` is called directly with `{ studentId, feeTypeId, schedule, baseAmount, discountAmount, … }` and the same calculation + installment generation runs.

### 4.4 Payment Recording

1. `Payment` row created: `{ studentId, amount, method, paidAt, notes }`
2. Allocation strategy (default: **oldest-installment-first** across this student's unpaid installments):
   - Walk student's installments ordered by `dueDate ASC`
   - For each, allocate `min(remainingPayment, installment.amount − installment.paidAmount)`
   - Create an `allocation` row, bump `installment.paidAmount`, recompute `installment.status`
   - Stop when payment is fully allocated
3. For each touched fee, recompute `fee.paidAmount` and `fee.status` via `recalculations.ts`.
4. Refund of an over-allocation is handled by creating a negative allocation or leaving residual on the payment (TBD per policy).

### 4.5 Status Lifecycle

```
Installment:
  pending ──(partial payment)──▶ partiallyPaid ──(full payment)──▶ paid
     │                                 │
     └──(dueDate < today)──────────────┴──▶ overdue (if unpaid portion remains)

Fee (rolled up from its installments):
  pending:        no installment paid
  partiallyPaid:  ≥1 installment paid or partiallyPaid, not all paid
  paid:           all installments paid
  overdue:        any installment is overdue
```

`overdue` is computed on read for the dashboard (so it updates without a cron job). Stored status is a best-effort snapshot.

---

## 5. Worked Examples (Moroccan mensualité — Sept→June)

### A. Full year, monthly
- FeeType: Mensualité, base 1500 MAD, `recurring`
- effectiveDate: Sept 1, 2025. schedule: `monthly`. discount: 0
- `monthsRemaining = 10`
- `gross = 15 000`, `net = 15 000`
- 10 installments × 1 500 MAD, due Sept 1 → Jun 1

### B. Mid-year transfer
- Same FeeType. effectiveDate: Feb 15, 2026
- `monthsRemaining = 5`
- `gross = 7 500`, `net = 7 500`
- 5 installments × 1 500 MAD, due Feb 15 → Jun 15 (parent not charged Sept–Jan) ✅

### C. Sibling discount
- Mensualité 1500, discount 200 MAD/month, Sept start
- `gross = 15 000`, `totalDiscount = 2 000`, `net = 13 000`
- 10 installments × 1 300 MAD

### D. Inscription (one-time)
- FeeType: Inscription, 2000 MAD, `oneTime`
- schedule forced to `oneTime`
- 1 installment of 2 000 MAD, due effectiveDate

### E. Quarterly payer
- Mensualité 1500, schedule: `quarterly`, Sept start
- `gross = 15 000`, periods = `ceil(10/3) = 4`
- 4 installments ≈ 3 750 MAD, due Sept, Dec, Mar, Jun (last row adjusts for rounding)

### F. Annual upfront
- Mensualité 1500, schedule: `annually`
- `gross = 15 000`, periods = 1
- 1 installment of 15 000 MAD, due Sept 1

---

## 6. Dashboard Read-Model

Finance dashboard queries (under `modules/dashboard/finance` — not inside this module) always aggregate from `fee_installments`, **never** from `fees.netAmount`. This keeps mid-year students, discounts, and partial payments reflected naturally.

- **Income (month)** = `SUM(allocations.amount)` joined to `payments` where `paidAt BETWEEN monthStart AND monthEnd`
- **Expenses (month)** = `SUM(expenses.amount)` where `date BETWEEN monthStart AND monthEnd`
- **Net Balance** = income − expenses
- **Collection Rate YTD** = `SUM(fee_installments.paidAmount) / SUM(fee_installments.amount)` where `dueDate ≤ today AND fee.academicYear = current`
- **Aging Balance** = `SUM(amount − paidAmount)` of unpaid installments, bucketed by `today − dueDate`: `current (not yet due)`, `1–30`, `31–60`, `60+`
- **Overdue Fees list** = installments where `dueDate < today AND paidAmount < amount`, grouped by student, sorted by oldest `dueDate`
- **Recent Payments** = last N payments joined to student name

---

## 7. Conventions & Gotchas

- **Always pass `effectiveDate`** when creating recurring fees. Defaulting to the server business date silently under-bills back-dated enrollments.
- **`baseAmount` on a `Fee` row is a snapshot** of the FeeType's amount at assignment time. Changing `feeType.amount` later does not retroactively change existing fees. Correct behavior — historical records must be stable.
- **One fee row per `(student, feeType, academicYear)`** is enforced by a unique index. Re-running creation for the same tuple raises a constraint error; services should catch and return a friendly 409.
- **Installment amounts sum exactly to `netAmount`** by construction (last row absorbs remainder). Never re-round installments after generation.
- **Payment → allocation is N:M via `allocations`**. A single payment can cover multiple installments; a single installment can be covered by multiple payments over time.
- **Schedule is forced to `oneTime`** in the UI when the FeeType is `oneTime`. Backend validators should also enforce this — don't trust the client.
- **Dashboard `overdue`** is computed on read. Stored `overdue` status on installments is a best-effort snapshot that may lag until a write touches the row.
- **Currency** is MAD only for MVP. All amounts are stored as `moneyField` (decimal). Never do money math in floating-point JS — use the helpers or strings.
- **Academic year** is `"YYYY-YYYY"` text, driven by a Sept 1 boundary via `getCurrentAcademicYear()`. Don't parse calendar year from it.

---

## 8. Files to Look At

- [fees/feeSchema.ts](./fees/feeSchema.ts) — `fees` and `fee_installments` table definitions
- [feeTypes/feeTypeSchema.ts](./feeTypes/feeTypeSchema.ts) — `fee_types` table
- [utils/calculations.ts](./utils/calculations.ts) — `calculateFeeAmounts`, `calculateRemainingMonthsInYear`
- [utils/scheduleBuilder.ts](./utils/scheduleBuilder.ts) — `getScheduleConfig`, `buildInstallments`
- [utils/recalculations.ts](./utils/recalculations.ts) — fee and installment status rollup
- [fees/FeeService.ts](./fees/FeeService.ts) — orchestration
- [payments/PaymentValidator.ts](./payments/PaymentValidator.ts) — payment input checks
- [allocations/AllocationService.ts](./allocations/AllocationService.ts) — payment distribution

---

## 9. Related Docs

- MVP dashboard plan: [`PLAN.md`](../../../../../PLAN.md)
- Project instructions: [`CLAUDE.md`](../../../../../CLAUDE.md)
