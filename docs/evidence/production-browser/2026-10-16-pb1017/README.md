# PB1017: staff, zones, grades, attendance and transport on the demo

Tested `https://myscolai.com`, 2026-10-16 22:00 – 23:20 UTC, with the grades and
attendance script rerun 2026-10-17 09:25 UTC.
Tester: Claude Code, continuing the
[extended read-only run](../2026-10-16-extended-readonly/README.md). Chrome
155 through Playwright, headless; French at 1440×900 unless stated, Arabic RTL
and French at 390×844 for the phone cases. Zero automatic retries: a failed
attempt was diagnosed and the whole script rerun. No mocks, screenshots,
traces or raw response bodies were recorded.

## Releases under test

The run found product defects, fixed them and redeployed five times. Every
result below is from the final revision, `9c9d77a`.

| Revision | Change | Deploy run |
| --- | --- | --- |
| `39b067b` | Staff wizard validation in the page language; zone and job title management opened from `/staff` | 38969418485 |
| `7c372ff` | Grade, transport-panel and assign-driver messages localized; zone/job-title refusals toasted once | 38971761684 |
| `7ca1cef` | Ending a student route posts a date inside the viewed year | 38974799519 |
| `b2199a9` | A driver without vehicle history can be deleted | 38977061112 |
| `9c9d77a` | A refused dialog save no longer raises an uncaught page error | 38978446169 |

Each workflow passed verify, publish and the Dokploy deploy step; the served
`/deployment-revision.txt` matched and `/api/health/status` returned 200. No
container inspection was done in this run.

## Results on `9c9d77a`

| Script | Result | Evidence |
| --- | --- | --- |
| Staff form, zones, job titles | **34 pass** | [staff-zones](staff-zones-results.json) |
| Grades and student attendance | **24 pass** (rerun 2026-10-17 09:25 UTC, see below) | [grades-attendance](grades-attendance-results.json) |
| Transport workspace (student routes) | **20 pass** | [transport](transport-results.json) |
| Driver-to-vehicle assignment | **14 pass** (M02 through the API) | [vehicle-assignments](vehicle-assignments-results.json) |
| Recovery request | **6 pass, 1 BLOCKED** | [recovery-request](recovery-request-results.json) |

Each run left zero fixtures behind and kept the serving revision unchanged.

### Cases

- **Staff validation (open finding, now PASS).** Empty first step in French
  shows the four French errors; no English. A cleaner with no zone is refused
  in French before any request.
- **staff-roles-zones R01/R02/M01/M02 — PASS.** Zones and Job titles buttons
  appear for the admin and not for teacher-A. Owned zone created, edited,
  persisted after reload; duplicate name refused (409, French, one toast);
  deletion while assigned refused (409, French, zone kept); deleted once
  unassigned (then 404). Owned job title created, edited, deleted. Arabic
  phone: both buttons named, RTL, no overflow, focus kept and restored.
- **Cleaner/security creation (previously BLOCKED) — PASS.** Both created
  through the three-step wizard in the owned zone; stored role and zone
  assignment confirmed after reload.
- **grades R01/R02/M01/M02/M03 — PASS** (teacher-A, owned assessments on the
  owned PB1016 section). Roster shows only the two owned students; a draft
  does not follow a switch of assessment; one save sends one POST, reload
  shows 15/20 at 75% with one stored grade; 25 is refused in French and sends
  nothing; a keyboard-only edit saves once as a PUT, 18/20 at 90%; the phone
  card shows 90% and fits. Parent-B cannot read student-A's grades (404).
- **student-attendance R01/R02/M01/M02 — PASS** on PB1016, whose roster is
  only owned students. The register opens on 2026-06-30, the viewed year's
  last teaching day. A draft is discarded on reload; one change saves as one
  PUT to the existing mark, one mark per student remains; phone card fits;
  parent-A is refused (403). The changed mark was restored afterwards.
- **student-routes M01/M02, transport R01/R02/R03/M01 — PASS.** Owned
  student-A assigned to an owned vehicle through the panel (French labels,
  start date chosen in the calendar), 1/3 after reload, exactly one transport
  fee generated, same vehicle on the profile's Transport tab; a second active
  route refused (409); unassign ends the route ("completed"), panel back to
  0/3, French toast. Phone layout fits; teacher-A refused (403).
- **vehicle-assignments R01/M01 — PASS, M02 — PASS (API-only).** The owned
  driver is assigned to an owned vehicle from the Vehicles page with a start
  date of 15 June; the row and the stored assignment agree after reload. An
  earlier start for the same vehicle is refused (409, one French toast) and
  the assignment is unchanged. No browser control ends a driver assignment,
  so it was ended through the API on 20 June; the row then shows no driver
  and history keeps one completed record. Teacher-A is refused (403).
- **AUTH-07 request side — PASS.** Known and unknown addresses get the
  identical French confirmation and status; no session is created; a
  malformed address is refused in French without a request.

## Defects found and fixed in this run

1. Staff wizard Zod messages were English literals (`39b067b`).
2. Zone and job-title dialogs existed but nothing opened them, blocking
   cleaner/security staff (`39b067b`).
3. Grade cell refused out-of-range marks in English, "Max 20" (`7c372ff`).
4. Transport panel button, dialog title, submit label and unassign toast were
   English (`7c372ff`).
5. Assign-driver form validated in English (`7c372ff`).
6. Zone/job-title refusals were toasted twice (`7c372ff`).
7. Ending a student route always used today, which the server refuses once
   the viewed year's term has ended, so no route could be ended on the demo
   (`7ca1cef`).
8. No driver could be deleted: the drivers routes answer 410 and point to
   Staff, and Staff refused any staff member with a driver profile. A driver
   without vehicle history now deletes; one with history is refused, as it
   already is for a role change (`b2199a9`).
9. Twelve dialog forms do not await their submit, so every refused save also
   raised an uncaught page error (`9c9d77a`).

## Open findings (not fixed here)

- **Server and browser disagree on Casablanca's offset.** The server runtime
  (Bun 1.3.14, tzdata 2026b) puts Africa/Casablanca at GMT+1 on these dates;
  Chrome 155 puts it at GMT+0. Between 23:00 and 24:00 UTC the server's
  "today" is the next day while the browser's is not, so the student
  attendance register hydrates with a different date (React error #418) and
  then uses the browser's. The register here clamps to 30 June either way, so
  no mark was affected. The run at 23:06 UTC recorded four such errors; at
  09:25 UTC the same script and a probe in three browser time zones record
  none. Which tzdata is current must be settled before a fix: either a
  runtime tzdata update or one server-provided "today".
- **No browser control ends a driver assignment** (`unassignDriverApi` is not
  used), so vehicle-assignments M02 has only an API surface.
- Upstream in najm-kit (School pins the published package): the French
  location label reads "Selectionner sur la carte"; calendar month buttons
  are labelled "Go to the Previous/Next Month", the dialog close button
  "Close" and the mobile sidebar trigger "Open sidebar" in every language;
  the closed mobile sidebar stays in the accessibility tree and tab order.

## Blocked and not run

- **AUTH-07 delivery, link use and reuse refusal — BLOCKED.** Reading the
  demo mail-test hub was not permitted to this tester; only the request side
  ran.
- **Staff attendance saves — BLOCKED.** Saving creates a mark for every
  unrecorded staff member, and the demo roster includes real people.
- The rest of the shared matrix, financial posting and role mutations remain
  outside this selection. This is targeted acceptance, not full promotion.

## Fixtures and cleanup

Created and removed in each run: one zone; cleaner, security and driver staff
members; one job title; two assessments with their grades; three vehicles;
one student route and the transport fee it generated; one driver assignment.
The attendance mark changed on 2026-06-30 was restored. A driver created by
an earlier attempt could not be deleted until fix 8 deployed; it was then
removed. A final read ([residue check](residue-check.json)) finds no PB1017
zone, staff member, job title, vehicle, assessment or active route;
student-A keeps only the previously retained fee, and the PB1016 marks for
2026-06-30 are as before (A absent, B present).

The API was used only for setup, cleanup, the API-only M02 and to confirm
what the browser saved. Credentials, sessions and identities remain in
ignored local files; committed results use aliases.
