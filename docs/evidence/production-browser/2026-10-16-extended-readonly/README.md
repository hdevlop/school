# Extended read-only demo testing

Tested `https://myscolai.com` on serving/source revision
`0c243238a73d0a784a18332d4a3065773f162bbd`, 2026-10-16, approximately
20:08–20:14 UTC (Africa/Casablanca display zone). Tester: Codex.
Chrome 155.0.8059.80 ran in isolated local browser contexts after the connected
Browser runtime reported no available browsers. No screenshots, traces, video
or raw response bodies were recorded in tracked evidence.

This expands the preceding payroll acceptance with real-response navigation,
restricted API reads and localized dialog checks. No application code was
changed. No mocks, data saves, financial postings, settings changes or
deployment mutations were performed during these attempts. Authentication and
normal session refresh requests occurred. All contexts were closed, and no
new domain fixtures or records required cleanup.

## Results

| Attempt | Result | Evidence |
| --- | --- | --- |
| Extended navigation | **202 assertions pass**, covering 93 page visits and five sign-ins; zero captured page/console/network diagnostics | [Browser results](browser-results.json) |
| Restricted API reads and MCP catalogs | **45 checks pass**; anonymous requests return 401, teacher and both parent accounts receive 403 for administrative, finance and staff-catalog reads | [API results](api-results.json) |
| Spanish staff dialog, initial timing check | Four checks pass; immediate focus assertion fails, stopping the attempt | [Initial dialog attempt](dialog-initial-results.json) |
| Spanish focus diagnostic, changed timing hypothesis | Eight checks pass with condition-based waiting for asynchronous dialog teardown | [Focus diagnostic](focus-diagnostic-results.json) |
| Arabic/French dialogs and French validation | Fourteen checks pass; **one known product failure**: four English validation errors on the French staff form | [Dialog continuation](dialog-continuation-results.json) |

Navigation covered 38 admin desktop routes, seven representative admin tablet
routes, 16 teacher routes, 11 routes for each parent, and ten admin Arabic
phone routes. The desktop baseline was 1440×900, tablet 1024×768 and phone
390×844. These were viewport tests with mouse/keyboard automation, not touch
device acceptance. The retired `/drivers` route correctly redirected to
`/staff`.

The expanded surfaces included reports, aging, reminders, financial operations,
transport, staff, attendance registers, timetable, grades, academic catalogs,
notifications, preferences and access management. Pages loaded without the
observed failure messages or captured unexpected HTTP errors. Page-level
horizontal overflow was absent in the selected viewports; Arabic pages used
RTL. These checks do not prove every chart total, filter, export, linked detail,
CRUD operation or accessibility requirement.

The API matrix covered `/users`, `/roles`, `/permissions`, `/fees`, `/payments`,
`/payroll`, `/expenses`, `/zones` and `/staff-roles` for anonymous, teacher-A,
parent-A and parent-B. All three signed-in restricted identities retained
access to public school preferences. The live MCP registry marked the zone
and staff-role catalog tools read-only; admin catalog reads succeeded.

## Confirmed open findings

- **Form validation localization — FAIL.** Opening the staff form in French
  and clicking Next with required fields empty shows four English errors for
  name, CIN, phone and address. No request saves a staff record. The failure
  fingerprint is `StaffForm.personal.schema.literal-English-errors`. This
  confirms a finding already left open by the original browser report; this
  run does not establish the total number of untranslated forms.
- **Cleaner/security staff creation — BLOCKED.** The live zone catalog has
  zero entries. These roles require a zone. The missing management workflow
  from the original report remains unresolved; no zone was seeded as a test
  workaround.

## Focus timing diagnosis

The initial Spanish dialog attempt checked focus immediately after the dialog
became hidden and failed. That result is retained. The follow-up used a new
diagnostic hypothesis: wait for the focus-restoration condition after teardown,
with a three-second deadline. It did not change the application or insert a
fixed sleep. Spanish passed; Arabic and French observations subsequently
captured focus moving from `BODY` immediately after close to the connected
opener `BUTTON` after teardown. The pinned Najm Kit source also defers its
focus repair. This supports classifying the original assertion as a test
timing failure; a persistent focus-restoration product defect was not confirmed.

The initial diagnostic log records two `/api/auth/refresh` requests under its
generic write observer. They are session maintenance, not domain writes. The
follow-ups exclude auth endpoints and record zero domain writes.

## Boundaries and deployment

The serving revision remained unchanged during the navigation/API attempts.
At 20:14:30 UTC, independent read-only container inspection confirmed the app
and notifications worker healthy on that same revision and the published
image `ghcr.io/hdevlop/school@sha256:8500fa0912cb53823986ffe638b78d613b3f824fc500a2fbb15a02cc914c171b`.
Apex/www login and readiness returned 200. Storage mounts and test mail routing
were preserved. See [deployment proof](deployment-proof.json).

This is extended smoke coverage, **not full feature promotion**. Attendance
saves remain blocked on the shared staff roster because it includes unrelated
people. Teacher grade entry/edit/save, transport assignments, financial
posting, role/zone mutations, recovery/delivery and the remaining full shared
matrix were not executed in this read-only selection. Prior persisted finance
and grading evidence remains separate. Customer deployment and active-year
rollover were not changed. Credentials and raw identity-bearing information
remain in ignored local files.
