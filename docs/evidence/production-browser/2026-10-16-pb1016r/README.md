# Demo release and targeted retest pb1016r

Target: `https://myscolai.com`. This follows the original
[pb1016 run](../2026-10-16-pb1016/README.md); it does not replace its results or
claim a new run of every production-browser case.

## Releases

| Revision | Result |
| --- | --- |
| `389a4ec6ae6635f9b073d9203b8c8796264dbeff` | Committed and pushed; CI, publication and demo deployment passed. App and worker healthy on the published digest. Thirty authenticated API/MCP checks passed. Browser testing found the remaining parent fee request described below. |
| `bc4e665ebff4714a7db68bc7cf085fa8aedea0c7` | Follow-up committed, pushed and deployed. CI passed; app and worker healthy on the published digest. Final acceptance: 30 API/MCP checks and 27 browser checks pass, zero uncaught browser errors and zero unexpected 403s. |

First release: [workflow 38935695207](https://github.com/hdevlop/school/actions/runs/38935695207),
image `ghcr.io/hdevlop/school@sha256:302760e099f5ab6cf9589459446899e2bb8f15820bed84d833381d84bfbf8118`.
Follow-up: [workflow 38938351061](https://github.com/hdevlop/school/actions/runs/38938351061).
Final image: `ghcr.io/hdevlop/school@sha256:052679e79b03ded2ee2d357c8f2c3de0e5ae3040e8abc44b2a1500814a6cb14f`.
Final container and public readiness verification: 2026-10-16 17:29:06 UTC.

The release process verifies the public full revision, apex and www `/login`,
and `/api/health/status`. Container inspection separately verifies the app and
notifications worker revision, digest, health and preserved storage mount
`/srv/school/storage-production:/srv/school/storage`. Customer promotion is a
separate operator action.

## Findings and fixes

The original changes were reviewed before publication. The money precision
review additionally found that `0.000000001` could pass the floating-point
tolerance and store as zero. Validation now rejects nonzero amounts that round
to zero; regression tests include that value and `Number.MIN_VALUE`.

The first deployed browser retest reproduced one incomplete original fix:
parent profiles still requested `/api/fees/student/:studentId`, which requires
a school-wide finance reader. Its 403 was swallowed and rendered as empty fee
data. The follow-up applies that existing role and permission policy before
requesting fees, keys the query by that access, and omits unavailable finance
statistics, attention rows and cards. It changes no backend access grants.

## Targeted acceptance

| Check | First release result |
| --- | --- |
| Payment amounts `0.001` and `0.000000001` | HTTP 400; receipt count and fee balance unchanged |
| Pending expense changed to paid through generic edit | HTTP 409; remains pending with no payer/date |
| Partial expense payment-date edit before the stored expense date | HTTP 400; stored payment date remains empty |
| Expense approve, pay and reject actions through MCP | PASS; approval/payment actors and payment date recorded |
| Paid payslip amount edit / generic edit to paid | HTTP 409 |
| Payslip deductions greater than gross | HTTP 400; net amount unchanged |
| Payroll pay and unpay | PASS on retained test staff only |
| Non-class announcement / vehicle without purchase date | Browser validation passes; separate MCP creates persist successfully |
| Teacher grade create, edit and reopen | PASS, 15 then 16 marks on a run-owned assessment |
| Parent A and B ownership after reconciliation | Own child readable; other family's child HTTP 404 |
| Default student, incident and reward dates | All display 30 June 2026, inside the selected teaching year |
| French dialog Cancel, favicon, removed visit-request link | PASS |
| Logout followed by browser Back | Returns to sign-in |
| Unauthorized teacher profile | Displays not found |
| Expense approve/reject/payment menu and form | Five UI checks pass; requests use the supported workflow routes |
| Arabic phone grading / disabled mobile public-page link | RTL, 390px document in a 390px viewport, no disabled link |
| Parent profile makes no forbidden requests | FAIL on first release; PASS for both parents on the follow-up |

All finance, persistence, grading and ownership checks were repeated on the
final revision. Its browser pass also confirms that the administrator retains
the finance section and both parent profiles omit it. The two 404 responses in
the final browser diagnostics are the intentionally inaccessible teacher
overview/profile, not unexpected application errors.

Sanitized machine records: [deployment proof](deployment-proof.json),
[final API checks](api-results.json), [final browser checks](browser-results.json),
and [expense menu checks on the first release](expense-ui-results.json).

UI form submissions and expense actions were intercepted before writes to
inspect validation and outgoing payloads. Actual persistence, authorization,
workflow transitions and cleanup were exercised separately through the running
app's authenticated internal REST/MCP. UI interception alone is not persistence
acceptance. Browser: Chrome 155.0.8059.80, desktop 1440 x 900 and phone 390 x 844.

## Role reconciliation

The owner explicitly approved adopting the demo teacher/parent defaults.
Teacher now has all 26 defaults and parent all 15; existing grants were
preserved. Fresh sign-ins were used after session invalidation. Other roles and
the active academic year were not changed.

Assignments used the normal permission API where possible. Several existing
permission IDs exceed the shared auth package's five-character assignment
parameter constraint; those remaining defaults were applied through the same
application permission service used by the additive seed, scoped to teacher
and parent. No direct SQL or password/account updates were used.

## Validation, attempts and cleanup

Before the first release: lint, typecheck, translation checks, the root test
suite (1,712 tests), finance tests (100 tests), migration consistency check and
production build passed. The follow-up passed lint, typecheck, translation
checks, configuration tests (477 tests) and production build locally. Both
release workflows execute the complete root verification contract.

Preserved runner attempts include a student-fee response-envelope mismatch
before any writes, date-picker selectors expecting inputs instead of buttons,
a race clicking Cancel as a successful intercepted form closed, a PowerShell
JSON BOM, and HTTP 429 after repeated test sign-ins. The rate-limit window was
allowed to expire. These attempts are not counted as product passes. The
remaining parent finance request was a product failure and prompted the
follow-up commit.

The API run removed its grade, assessment, announcement, vehicle, two expenses
and payslip, verifying HTTP 404 afterward. Two additional expense fixtures used
for menu inspection were also removed through MCP. Financial audit history is
retained. The original reusable accounts, students, section, teacher assignment,
staff, voided fee payments and attendance remain as documented in pb1016.
Browser contexts and test processes were closed. Credentials, raw fixture
details and runner logs stay in ignored `.cache/production-browser`; none are
part of this evidence.

## Remaining coverage and follow-ups

- Concurrent duplicate payments were not run on the shared demo. That regression
  requires the marked disposable database fixture. The subsequent
  [concurrency follow-up](../2026-10-16-finance-concurrency/README.md) runs that
  fixture and records the resulting correction.
- This is targeted acceptance, not a repeat of all feature, delivery and
  connected-browser matrices. No customer image was promoted.
- The active year is still 2025-2026. Cleaner/security staff zone setup,
  remaining feature-form/package localization, English seed fee names, payroll
  hire-date eligibility and payment confirmation remain separate work.
