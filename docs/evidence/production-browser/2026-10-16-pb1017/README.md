# PB1017: staff, zones, grades, attendance and transport on the demo

Tested `https://myscolai.com` from 2026-10-16 22:00 UTC; the final set of
runs is from 2026-10-17 on `65b15ec`.
Tester: Claude Code, continuing the
[extended read-only run](../2026-10-16-extended-readonly/README.md). Chrome
155 through Playwright, headless; French at 1440×900 unless stated, Arabic RTL
and French at 390×844 for the phone cases. Zero automatic retries: a failed
attempt was diagnosed and the whole script rerun. No mocks, screenshots,
traces or raw response bodies were recorded.

## Releases under test

The run found product defects, fixed them and redeployed seven times. Every
result below is from the final revision, `65b15ec`.

| Revision | Change | Deploy run |
| --- | --- | --- |
| `39b067b` | Staff wizard validation in the page language; zone and job title management opened from `/staff` | 38969418485 |
| `7c372ff` | Grade, transport-panel and assign-driver messages localized; zone/job-title refusals toasted once | 38971761684 |
| `7ca1cef` | Ending a student route posts a date inside the viewed year | 38974799519 |
| `b2199a9` | A driver without vehicle history can be deleted | 38977061112 |
| `9c9d77a` | A refused dialog save no longer raises an uncaught page error | 38978446169 |
| `9d8976e`, `439d321` | Vehicles row menu assigns and ends a driver assignment; najm-kit 3.5.3 adopted | 39023776905 |
| `65b15ec` | Locale catalogs stored with LF endings again (content unchanged) | 39023833770 |

Each workflow passed verify, publish and the Dokploy deploy step; the served
`/deployment-revision.txt` matched and `/api/health/status` returned 200. No
container inspection was done in this run.

## Results on `65b15ec`

| Script | Result | Evidence |
| --- | --- | --- |
| Staff form, zones, job titles | **34 pass** | [staff-zones](staff-zones-results.json) |
| Grades and student attendance | **24 pass** | [grades-attendance](grades-attendance-results.json) |
| Transport workspace (student routes) | **20 pass** | [transport](transport-results.json) |
| Driver-to-vehicle assignment | **17 pass** | [vehicle-assignments](vehicle-assignments-results.json) |
| najm-kit 3.5.3 labels and drawer | **12 pass**, no saves | [kit-labels](kit-labels-results.json) |
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
- **vehicle-assignments R01/M01/M02 — PASS.** In card view, the page's
  default, the row menu offers assigning a driver. The owned driver is
  assigned to an owned vehicle with a start date of 15 June; the row and the
  stored assignment agree after reload. An earlier start for the same vehicle
  is refused (409, one French toast) and the assignment is unchanged. "End
  driver assignment" in the row menu names the driver, refuses an end before
  the start in French without a request, and ends it on 20 June with one
  request; the row then shows no driver and history keeps one completed
  record. Teacher-A is refused (403).
- **najm-kit 3.5.3 — PASS.** In French the dialog close button is "Fermer",
  the map button "Sélectionner sur la carte" and the calendar's month buttons
  "Mois précédent"/"Mois suivant"; on an Arabic phone the header menu button
  is "فتح القائمة". No icon button keeps an English name. The closed drawer is
  inert, reachable once opened and inert again after closing.
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
10. No browser control ended a driver assignment; the Vehicles row menu now
    does, and also assigns a driver in card view, where there was no driver
    cell to click (`9d8976e`).
11. In najm-kit 3.5.3, published and adopted (`439d321`): icon-only controls
    are named in the interface language (dialog and sheet close, page header
    and sidebar menu buttons, calendar month buttons), the closed mobile
    drawer is inert, and the French and Spanish location labels have their
    accents.

## Accepted, not fixed

- **Server and browser disagree on Casablanca's offset.** The server runtime
  (Bun 1.3.14, tzdata 2026b) puts Africa/Casablanca at GMT+1 on these dates;
  Chrome 155 puts it at GMT+0. Between 23:00 and 24:00 UTC the server's
  "today" is the next day while the browser's is not, so the student
  attendance register hydrates with a different date (React error #418) and
  then uses the browser's. Seen at 23:06 UTC; absent at 09:25 UTC in three
  browser time zones. The owner accepted it: the school closes at 17:00, so
  no one takes attendance in that hour.

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

The API was used only for setup, cleanup and to confirm what the browser
saved. Credentials, sessions and identities remain in
ignored local files; committed results use aliases.
