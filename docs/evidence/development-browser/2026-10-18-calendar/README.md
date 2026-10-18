# Calendar and events: development browser batch

Target: **http://127.0.0.1:3102**, existing local demo, year **2026-2027**.
Accepted reports contain **123 PASS, 0 FAIL assertions**. Five of the six
development checklist cases pass; calendar-R03 remains partial because an
entirely empty month was not available in the selected-year candidates.
Production acceptance remains separate.

Five defects were fixed and retested:

- An event with optional times omitted returned 500 because date validation
  attempted to split an absent time. Time comparison now runs only when both
  values exist. Date order and registration deadlines are always validated,
  including partial date-only edits. Explicit null time clearing is respected.
- Calendar had no previous/next period controls. Accessible buttons now move
  by month or week, and Today returns to the current date. Date cells have full
  translated names and selected state; Space selects without scrolling.
- Event form defaults converted a selected local day through UTC. In a Tokyo
  browser, selecting 20 October opened 19 October. It now preserves 20 October;
  the fallback uses the school's current date. Calendar headings also format
  date-only values consistently across browser time zones.
- Clearing saved optional times/location omitted them from updates, leaving the
  old values in storage. An edited form now sends null for cleared optional
  values. Reload/reopen checks confirm those fields remain empty.
- Multi-day events appeared only on their first date. Calendar now displays the
  full date interval. An owned overnight event appears on 31 October and
  1 November, including after navigating to November.

| Journey | Accepted assertions | Evidence |
| --- | --- | --- |
| Optional-time creation and restored navigation controls | 3 PASS | [Creation retest](calendar-create-after.json) |
| Selected day preserved east of UTC | 1 PASS | [Tokyo retest](calendar-date-after.json) |
| Reload/edit, exact class, refusals, month/week/Today navigation | 18 PASS | [Lifecycle](calendar-lifecycle.json) |
| Browser date-picker edit and cleared optional fields | 3 PASS | [Date edit retest](calendar-date-edit-after.json) |
| Disposable identities with verified roles; owned announcement | 6 PASS | [Setup](calendar-role-setup.json) |
| French desktop and French/Arabic touch, details, validation, themes, empty day | 27 PASS | [Views](calendar-views.json) |
| Teacher/parent browser and API audience visibility; refused mutations | 24 PASS | [Audience and access](calendar-access.json) |
| Overnight month boundary and date-only API refusals | 9 PASS | [Boundary retest](calendar-boundary-after.json) |
| Final phone rendering and width checks | 4 PASS | [Final views](calendar-final-views.json) |
| Cancelled/confirmed browser deletion, login removal and residue reads | 28 PASS | [Cleanup](calendar-cleanup.json) |

The [initial observations](calendar-before.json) summarize the recorded
pre-fix tool output: missing period controls and a 500 on optional-time creation.
The [timezone](calendar-date-before.json),
[clear-field](calendar-date-edit-before.json) and
[multi-day](calendar-boundary-before.json) reports retain the other failures.
Before-fix reports are excluded from accepted totals.

The browser created the owned event with one exact class target, reopened it,
edited its text/times/location and verified persistence. A later browser
date-picker edit moved it to 21 October while clearing times/location. Invalid
browser time ordering returned 400 with translated guidance and left the form
available for correction. Date-only reversed starts/ends and late registration
deadlines returned 400; moving outside the selected year returned 409, with the
saved date and cleared times preserved. Invalid class relationships returned
404. Overnight dates accept a later calendar end day with an earlier clock time.

Calendar opened the owned announcement and event with their exact originating
content. The teacher account saw the teacher-only items and the untargeted
public event; the parent account saw only the public fixture. Parent direct
detail reads for teacher-only fixtures returned 404. All three parent event
mutations returned 403 and preserved the owned event. Both reader browser
sessions hid event-management controls. These checks use the actual verified
roles, rather than inferring permissions from account names.

French light desktop, French dark phone and Arabic dark phone checks passed.
Phone screens used 390 × 844 with Chrome touch emulation, including a Tokyo
browser time zone; the overnight boundary used Los Angeles. Keyboard selection,
RTL, translated required validation, empty selected-day feedback and the final
phone layouts were checked. The French and Arabic phone screenshots were
inspected visually. No physical device or native browser zoom was used.

| Development checklist case | Result |
| --- | --- |
| calendar-R01 | PASS: month/week/Today, selected dates and overnight month boundary |
| calendar-R02 | PASS: admin opens known event/announcement and verifies originating content |
| calendar-R03 | PARTIAL: locale, RTL, allowed/denied audiences and empty-day feedback pass; entirely empty month NOT RUN |
| events-R01 | PASS: Calendar form, date defaults and visible required validation |
| events-M01 | PASS: create, reopen, browser edit of dates/details and reload |
| events-M02 | PASS: teacher/parent audience checks, refused mutations and owned browser deletion |

Cleanup removed **all newly created fixtures**: three events, one published
announcement and two disposable login accounts. Each event deletion was first
cancelled, then confirmed through the browser; Calendar removed the item
immediately and detail reads returned 404. The owned notice was removed through
MCP, and both exact login identities were deleted through their supported API.
Final list reads found zero owned event/announcement residue. The run reused
the learning batch's existing class; its three empty archived schedules and
academic references remain as [previously recorded](../2026-10-18-learning/README.md).
No additional class, section, person profile, fee or payment was created here.

[Validation](validation.json) records passing 31 focused tests, root type checks,
final lint and a final production build in a fresh separate output directory.
Five of those tests cover optional-time creation, partial date refusals,
registration deadlines, time clearing and overnight events. Source hashes
identify a mutable working tree shared with concurrent work, not a deployed
revision. The normal dev server remains running.

[Harness attempts](browser-attempts.json) retain excluded retries, including a
day selector that initially confused an event-count badge with day 1. The
corrected boundary run uses full accessible dates and caught the end-date
defect before its fix. Normal accepted browser journeys have no unhandled page
errors or HTTP errors; the lifecycle report deliberately records its expected
400 refusal. Full audience/class-placement matrices, reader-only detail
controls, native browser zoom and production acceptance remain unverified.
This batch did not change production checkboxes or trigger a deployment.
