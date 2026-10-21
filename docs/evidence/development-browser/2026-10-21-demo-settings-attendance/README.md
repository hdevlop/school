# Demo settings, timetable and attendance follow-up

Verified on 2026-10-21 with standalone Playwright and Chrome, against development
at `http://localhost:3102`. This is an isolated browser session, not connected
Browser acceptance. The base revision and implementation hashes are recorded in
[source-fingerprint.json](source-fingerprint.json).

## Results

| Finding | Result and boundary |
| --- | --- |
| Possible personal demo accounts | Provenance remains unverified. Three role-account addresses have no exact match in static seed sources, but the faker previously generated public webmail addresses. This does not prove they belong to real people. Existing users were preserved. Authentication accounts do not automatically create HR employee profiles. |
| Incomplete school identity | Production settings successfully changed to **MyScolAI Demo School**, **contact@school.test**, and **Fictional demo address, Casablanca, Morocco**. API rereads verified all three values and no unrelated setting changes. |
| Logo differs from identity | Production branding revision advanced from 1 to 2. The sign-in, expanded sidebar and collapsed sidebar logo slots now use the fictional demo logo. A fresh public login browser visit visibly verified the logo. Customer factory assets were preserved. The vector source is in `packages/seed/src/scripts/school/data/demo-logo.svg`. |
| Empty required contacts | Development browser rejected blank email and address inline, with zero settings writes. First-run setup now requires both, and the API DTO refuses explicitly blank values while preserving partial updates. |
| Regional preferences | Production settings rereads confirmed **DD/MM/YYYY** and **24-hour** time after a minimal update. New-installation and display fallbacks use these defaults; explicitly saved alternatives remain valid. |
| Timetable hours | A development public-settings response fixture supplied 08:00-15:00 with a 30-minute lunch. The existing 08:30-15:30 grid showed the mismatch notice. “Use school hours” prepared six 65-minute lessons and lunch at 11:15-11:45. Cancel sent zero timetable writes. Unit/service tests separately verify new routine generation from actual repository settings and preservation of existing published routines. No production timetable was rewritten. |
| Attendance appears saved | Development loaded 101 people with no status selected for unrecorded attendance. Selecting one person displayed one unsaved mark. “Mark all present” displayed 101 unsaved marks. Reload discarded both kinds of drafts; zero attendance writes were sent. The 390px mobile view had no document overflow. |
| Two-factor switch | Development browser verified that the control is disabled and explains that authentication is not enforced. This change does **not** implement MFA or establish that an account is protected by MFA. |
| Future demo emails | The faker now uses the reserved `school.test` domain. Existing accounts were not anonymized or removed. |
| Receipt identity | Local receipt generation now takes the current managed logo, with grayscale printing, instead of always choosing the bundled customer logo. Rendering tests pass; a new printed-browser receipt was not exercised in this follow-up. |

## Verification

- Configuration tests: **587 passed**, including attendance mark selection,
  required contacts, date/time defaults, reserved demo email domains and school
  day generation.
- Focused settings and routine service tests: **21 passed**.
- Server translation tests: **19 passed**.
- Workspace boundaries: **28 passed** plus the source boundary scanner.
- Lint, full workspace type checking, translation-key scan and production build
  passed. There were no missing translation keys.
- Browser settings and timetable checks sent no application writes. Attendance
  persistence itself was not retested with a browser save in this follow-up.

Machine observations and screenshots are retained locally under
`.cache/demo-acceptance/`: `attendance.json`, `attendance-bulk.json`,
`routine.json`, `settings.json`, `production-demo-repair.json`, and the matching
PNG screenshots. Browser response fixtures are identified explicitly above.

## Concurrent work and release state

Another session added staff attendance arrival times and migration 0071 during
this run. Attendance reads briefly returned 500 while the local column was
missing. That session applied the local migration before the bulk-draft retest;
the attendance API then returned 200. This session did not apply a migration or
alter production attendance data. Those concurrent source edits were preserved.

The production changes in this report are settings and managed branding only.
The application code remains uncommitted and undeployed. Existing production
timetables, account ownership and actual MFA enrollment/enforcement remain
separate acceptance items.

A final production check returned HTTP 200 from `/api/health/status` and served
revision `3aa3ca1693353387ba685e211e68fcdd86526527`. That is the existing revision,
not deployment acceptance of this working tree.
