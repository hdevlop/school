# Remaining development reads: dates, empty month, years and native zoom

Executed on 2026-10-18 using isolated Chromium. **132 browser checks PASS**:
33 exam/calendar checks, 78 fee-year workflow checks and 21 native zoom/contrast
checks. Normal demo reads used **http://127.0.0.1:3102**. Fee-year switching used
an owned local database clone on **http://127.0.0.1:3109**. The connected-browser
runtime had no available browser. These are development results; production
checkboxes are unchanged.

One School defect was found and fixed: the day heading in the timetable's
responsive day view inherited black text on a dark background. It now uses the
existing `text-foreground` token. [Before](contrast-before.json), its computed
foreground was `rgb(0, 0, 0)`. The [retest](native-zoom-results.json) measures
**18.10:1** heading contrast in French/Arabic dark views and **19.80:1** in
French light. No Najm source, dependency pin or translation was changed.

## Exam dates and empty calendar month

[Results](exam-calendar-results.json) compare three independently reordered
API dates, January 27-29, 2027, with the saved `DD/MM/YYYY` school format. Cards
in French desktop, French dark phone and Arabic dark phone agree with the API's
date, type, status and section. French desktop table dates agree too. Class and
exact-title filtering identify one record instead of assuming the table's row
model ID is the exam ID.

Supporting REST reads found no event or announcement in July or August 2027.
The real calendar navigates to **July 2027**, permits keyboard date selection,
shows translated empty-day feedback on phone and returns through Today in all
three views. This checks an entirely empty reporting month with real responses;
no request is mocked and no calendar record is deleted to manufacture it.
Earlier role/audience checks are not repeated by this read-only follow-up.

## Fee-year selection

The normal demo has only one year. The run therefore copied the marked,
otherwise unused local `school_history_test` database into the newly owned
`school_read_browser_20261018`. It refused an existing target and disabled
external email/push delivery on the isolated server. The clone already had two
closed historical years and the open 2026-2027 year; no fee fixtures were added.

[Fee results](fees-results.json) exercise French desktop, French phone and
Arabic dark phone. The API returns 7 scoped student rows in 2024-2025, 9 in
2025-2026 and 8 in 2026-2027. The middle year has two charges; the other two
have none. Header count metadata, all six monetary stat cards and currently
rendered student identities reconcile with each selected year's actual REST
read. The desktop count is visible; the responsive phone header intentionally
hides its subtitle. The phone stat cards and student rows remain visible.

Selecting 2024-2025 survives navigation through `/fee-types`, return and reload.
Switching to 2025-2026 and back to the active year restores their own results.
The fees class filter has its translated accessible name. Recorded `/api/fees`
requests carry each selected `X-Academic-Year`. These reads change no active
school setting or financial row. Comparisons after navigation/reload are
distinct workflow checkpoints; repeated command attempts are not added to the
accepted count.

## Native browser zoom

The run changes **Chrome Settings > Appearance > Page zoom to 200%** in a fresh
owned profile. It does not set CSS zoom or emulate pinch zoom. Recorded metrics
show device-pixel ratio 1 -> 2, viewport width 1424 -> 712 at the same 1440 outer
width, visual viewport scale 1, CSS zoom 1 and no document transform.

In French light/dark and Arabic dark, the real populated timetable reflows to
day tabs. Keyboard day selection, period configuration, its save control and
break supervision remain reachable. The dialogs are cancelled. The heading
contrast fix passes, no horizontal document overflow occurs and an exact
before/after API comparison preserves the timetable. Private screenshots were
inspected; native-zoom images use the actual Chromium surface capture because
the ordinary screenshot path clipped it. No physical-device or OS printing
claim is made.

## Verification and cleanup

[Validation](validation.json) records the commands and source hashes for the
one-line UI correction. Root lint, dashboard type checks and a production build
all pass. The build uses a fresh isolated output directory, preserving the
normal development output. [Harness attempts](browser-attempts.json) retain the
excluded selector, locale, responsive-header, drawer-transition and screenshot
adjustments. No business mutation was sent by the browser checks. Normal
authentication/session metadata is outside that statement.

[Snapshots](source-comparison.json) match before/after for **five checked
tables** in the original fixture and clone: fees, fee installments, settings,
academic years and students. This is not an all-table comparison; authentication,
audit and enrollment tables were not snapshotted. The checked settings and
year hashes establish that viewing-year changes did not activate another year.

[Cleanup](cleanup.json) verifies the private marker and zero remaining
connections before removing only the owned database. Its server was stopped;
the normal dev server remains healthy. Authenticated zoom profiles were removed.
Automatic approval review blocked removal of three anonymous zoom probe
folders with "blocked by policy"; those folders remain ignored local artifacts.

This closes the specific development gaps previously recorded for exam date
labels, an empty calendar month, the fees year-filter matrix and native 200%
browser zoom. It does not repeat every feature mutation or the full responsive,
authorization and delivery matrices. The UI fix and evidence remain local;
no commit, push or deployment is performed by this batch.
