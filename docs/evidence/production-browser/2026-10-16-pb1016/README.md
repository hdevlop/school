# Production browser run pb1016 — myscolai.com demo

| Field | Value |
| --- | --- |
| Run label / UTC | pb1016 / 2026-10-16 14:19–17:30 UTC |
| Target | `https://myscolai.com` (demo installation) |
| Serving SHA | `7657cc0670e78ecea8feb3f54540e246d746183c` (image `school:demo` v1.3.14, app and notifications worker) |
| Source candidate | same SHA; fixes from this run are local and **not deployed** |
| Browser | Playwright Chromium; desktop 1440×900, phone 390×844; locale fr-FR, Arabic RTL spot check |
| Identities | admin (existing), teacher-A, parent-A, parent-B (created and activated in this run) |
| Mail | mail-test hub, School scope; invitations read through the gateway, nothing sent outside it |
| Scope | Read-only smoke on jhlschool.com (signed out only); full browser run with run-owned fixtures on the demo |
| Retries | zero; failures recorded, not retried as passes |

Evidence uses aliases only. Credentials and generated identities live in the
ignored `.cache/production-browser/myscolai-accounts.json`.

## Results

| Case | Result | Notes |
| --- | --- | --- |
| START-01 identity | PASS | TLS, `/`, `/login`, health 200; `/welcome` → `/`; revision matches source |
| AUTH-01 anonymous denial | PASS | 8 protected pages redirect to login; 8 data APIs 401 |
| AUTH-02 invalid login | PASS | Validation shown; wrong password generic, no enumeration |
| AUTH-03 session/logout | PASS | Second tab shares session; UI logout revokes both; cookies httpOnly/Secure/Lax |
| AUTH-05 roles | PASS | Admin 43 routes; teacher/parent menus, denied pages redirect, admin APIs 403, phone width all roles |
| AUTH-07 invitation | PASS | Invite delivered via hub; mismatch/short refused; activation 200; reused link 400 |
| AUTH-08 open redirect | PASS | External and protocol-relative `from` ignored |
| PEOPLE-01 create | PASS | Student-A with existing parent (reused by email, no duplicate); student-B with new nested parent (invited) |
| PEOPLE-02/03/04 update | PASS | Teacher phone and assignment, staff department: other fields unchanged |
| PEOPLE duplicates | PASS | Duplicate staff CIN 409, vehicle plate 409, no partial write |
| PEOPLE-05 delete | PASS | Disposable parent: cancel sends nothing, delete then 404 |
| Ownership (teacher, parent-A, parent-B) | PASS | Students, grades, profiles: own only; other family 404 + "introuvable"; teacher sees section only |
| Catalogs (subject, cycle, role) | PASS | Create, edit, reload, delete |
| Conduct (discipline, reward) | PASS | CRUD; teacher sees own reports only; parents refused (no grant) |
| Assessment / exam CRUD | PASS | |
| Grades | PASS (admin) / BLOCKED (teacher) | Demo teacher role lacks `read:assessments` (role drift, see below) |
| Attendance save | PASS | Run-owned 2-student roster only; exactly 2 marks written |
| Announcement create | FAIL | Fixed locally: hidden class field failed validation, Create did nothing |
| Vehicle create without purchase date | FAIL | Fixed locally: empty optional date rejected |
| Student create with default date | FAIL (environment) | Active year 2025-2026 ended 2026-08-31; default date refused (422). Fixed locally: default clamped |
| Staff create (cleaner/security) | BLOCKED | Zone required, no zones, no zone management screen |
| FIN-01 fee type and snapshot | PASS | Charges 300.00; catalog price edit kept existing fee at 100.00 |
| FIN-03 payment | PASS | 120.00, one receipt; due 180.00 |
| FIN-06 void | PASS | Debt restored to 200.00; reason kept |
| FIN-07 0.001 payment | FAIL | Server 500 (regression 5). Fixed locally: 400 |
| FIN-08 expense workflow | FAIL | Generic edit set `paid` with no approval (regression 1). Approve/pay via API work. Fixed locally |
| Regression 4 payment date edit | FAIL | Payment date before expense date accepted. Fixed locally |
| FIN-09 payroll pay/unpay | PASS | One payslip, no other staff affected |
| Regression 2 deductions > gross | FAIL | Net −50.00 accepted (restored). Fixed locally |
| Regression 3 idempotency concurrency | NOT RUN | Belongs on a disposable database, not the shared demo |
| FIN-10 reconciliation | PASS | Aging and reminders agree with fee summaries |
| Arabic RTL (phone) | PASS | `dir=rtl`, no horizontal scroll, back to French |

## Environment and decisions for the owner

- **Role drift:** the demo's teacher role has 17 grants against 26 in
  `rolePermissions.json` (missing `read:assessments`, `read:exams`, attendance
  create/read/update); parent has 5 against 15. `bun run seed:role-permissions`
  adopts the defaults once.
- **Active year:** 2025-2026 is still active although it ended 2026-08-31.
- **Mail route:** the hub's Mailpit was attached to the worker's network by hand;
  recreating that network breaks demo email.

## Cleanup

Removed: test fee type and its fee, two expenses, one payslip, assessment and
grades, exam, discipline incident, reward, vehicle, subject, cycle, role and a
disposable parent. Kept for reuse: the three test accounts, two students,
section, teacher assignment and staff member. Retained by design: each student's
200.00 fee with a voided payment (allocated fees cannot be deleted) and two
attendance marks.
