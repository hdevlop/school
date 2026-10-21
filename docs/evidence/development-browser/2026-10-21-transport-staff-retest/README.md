# Transport and staff development retest

Follow-up: all four reported defects were fixed and retested in development.
See [fix acceptance](FIXES.md); the initial observations below remain intact.

Retested on 2026-10-21 at **http://localhost:3102**, selected year **2026-2027**,
with standalone Playwright and installed **Chrome 155.0.8059.86**. No browser
plugin was used. Base revision: `3aa3ca1693353387ba685e211e68fcdd86526527`, with
the existing uncommitted changes. [Source fingerprint](source-fingerprint.json)
identifies the relevant local files; [results](results.json) records outcomes
and exact cleanup checks. This batch changes evidence files only.

| Check | Development result |
| --- | --- |
| Create vehicle | PASS: real UI save returned HTTP 200 for a bus with capacity 30. |
| Transport capacity | PASS: the new bus showed `0/30`, then `1/30` after assigning a student and reloading. |
| Student assignment and automatic fee | PASS: real UI save returned HTTP 200. Supported MCP reads showed the student's total increase from **18,000 to 21,600 dh**. Transport Fee was **400 x 9 = 3,600 dh**, with nine installments from October 21, 2026 through June 21, 2027. Tuition was **2,000 x 9 = 18,000 dh**. |
| Staff roles and Driver fields | PASS: 13 staff roles were offered, including Driver. Selecting Driver displayed License Number, License Type and License Expiry. Teacher uses its separate workflow. |
| New school without vehicles | FAIL: with a browser-only empty vehicle response, step 3 offered zero vehicles and no setup guidance or create-vehicle action. Confirm showed only **Vehicle is required**. No staff was saved in this case. The same step had no horizontal page overflow at 390 x 844. |
| Expired driver license | FAIL: **October 5, 2026** was selectable and passed the employment step. A real staff save returned HTTP 200 with no observed expiry warning. A subsequent staff API read returned `licenseExpiry: 2026-10-05`. The driver was assigned to the disposable bus. |
| Validation timing | FAIL: entering `A` for Name and moving to CIN showed no invalid controls. Clicking Next displayed the name error and missing-field errors. This reproduces the reported first-attempt validation delay; it does not claim every staff field was tested on blur. |
| Assignment success message | FAIL: assignment succeeded, the dialog closed and the saved student appeared after reload, but no Sonner success toast appeared. A DOM MutationObserver recorded zero toast events during submission and until the subsequent reload. Source inspection corroborates this: assignment success invalidates queries, while unassignment explicitly calls `toast.success`. |
| Create Student tuition preview | PASS in the current development checkout: October 21 admission and **2,000/month** previewed **18,000 dh**. No student was saved from this preview. The earlier 10-month preview is no longer reproduced locally. |

The empty-school condition used an intercepted `GET /api/vehicles` response
with `data: []` in one local browser page, retaining the real response envelope.
No school reset was performed. Vehicle creation, driver creation and student
assignment used real development responses, without mocked mutation results.
Internal Najm MCP/REST supported fixture setup, persisted-value reads and cleanup.

English desktop was exercised at 1440 x 1000. The empty-vehicle step was also
inspected at 390 x 844. This is focused acceptance, not the complete language,
accessibility or responsive matrix. Non-local browser requests were blocked;
the location controls reported that map selection was unavailable. The saved
student address supplied the assignment pickup value. No map-provider
acceptance is claimed.

All seven owned records were removed through supported MCP operations: the
student route, both unpaid fees, student, driver assignment, staff member and
vehicle. Separate REST reads returned **404 for all seven**. Existing records
were not edited or deleted. The student and driver had no login accounts, and
no invitation delivery was exercised. Normal audit records may remain.

No application code was changed, so lint/build were not rerun for this report.
No production request, configuration change, commit, push or deployment was
performed. Production acceptance records remain unchanged.
