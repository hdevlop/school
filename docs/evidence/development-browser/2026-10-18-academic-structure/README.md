# Academic structure: development browser batch

Target: **http://127.0.0.1:3102**, the existing local demo, year **2026-2027**.
The recorded checks contain **165 PASS and 5 FAIL** across cycles, classes,
sections and subjects. No deployment was triggered.

Three School defects were fixed locally:

- The class form had no way to choose its supported cycle relationship.
  It now offers localized cycle names and an unassigned option, keeps the
  selected cycle when editing, and submits an explicit null when clearing it.
- Section inline capacity allowed 200 while the form/API limited it to 100.
  The inline editor now uses the same schema as the form, including its upper
  limit and integer validation.
- Section inline validation used English literals in French pages. Name and
  capacity errors now use the form's translated schema/messages.

The [cycle/class before probe](academic-cycle-before.json) and
[inline before probe](academic-inline-before.json) retain the original failures.
The browser retests verify chosen-cycle creation/reopening and local capacity
refusals, with one request for a valid Enter-plus-blur save.

| Journey | Assertions | Evidence |
| --- | --- | --- |
| Cycle create, rename, reload and duplicate refusal | 5 PASS | [Cycle](academic-cycle.json) |
| Class/cycle, subject and section creation/editing | 15 PASS | [Creation](academic-create.json) |
| Inline capacity validation and single saved write | 7 PASS | [Inline after fix](academic-inline-after.json) |
| Exact relationships, referenced deletion and API refusals | 23 PASS | [Relations](academic-relations.json) |
| Owned subject assignment through the teacher wizard | 3 PASS | [Assignment UI](academic-assignment-ui.json) |
| Filters, details, French/Arabic phone and RTL | 51 PASS, 5 FAIL | [Read checks](academic-read.json) |
| Actual denied-role mutation checks | 16 PASS | [Access](academic-access.json) |
| Duplicate submissions and actionable browser feedback | 12 PASS | [Duplicate UI](academic-duplicates-ui.json) |
| Dependency cleanup, cancelled/confirmed browser deletion, residue | 33 PASS | [Cleanup](academic-cleanup.json) |

The owned class preserved its chosen cycle, selected year and level through
creation, rename and reload. The owned section preserved class, numeric room
and capacity. Invalid capacities 0, 101 and 1.5 were refused by the API without
changing the stored value. Inline zero/over-100 attempts now send no request;
a valid edit persists after reload and sends exactly one PUT.

The teacher wizard assigned the owned subject to the owned class/section;
supported reads and teacher profile details showed that relationship exactly
once. Subjects' own card/detail screens expose code/name/description; linked
teacher/class information was checked through the supported teacher view and
API instead of claiming a subject-page control exists.

Each referenced delete returned 409 and preserved its target: cycle with a
class, class with a section, section with a disposable student's enrollment,
and subject with an owned teacher assignment. Duplicate cycle, class, section
and subject submissions returned 409 in the browser, displayed server guidance
and left the form available for correction. A separate authenticated account
confirmed as teacher received 403 for all twelve create/update/delete attempts;
all four target identities stayed unchanged. That account was removed.

Cleanup removed the owned teacher assignment and teacher/staff/login chain,
then the disposable student enrollment, through supported MCP operations. The
browser cancelled deletion of each academic entity before confirming it, in
dependency order. All eight academic/reference detail endpoints returned 404
after cleanup. List scans found zero owned academic residue and restored the
original counts: 3 cycles, 15 classes, 46 sections and 10 subjects. No parent,
fee, payment or invitation was created for this batch; the reference teacher
was provisioned with a private disposable password.

Five assertions remain failed in shared `najm-kit@3.6.1`: no-match feedback on
each of the four pages and the unnamed Section class filter. These are the
previously recorded [empty-state](../2026-10-18-users/shared-table-empty-state.md)
and [filter-name](../2026-10-18-students/shared-class-filter-label.md) defects.
Positive filters, clearing them and detail identity checks pass. The
[Najm skill](../../../../.agents/skills/najm/SKILL.md) says “Najm source is
read-only reference” and “School pins published versions”; this batch does not
edit that source or introduce a second filter owner. Those fixes await a
published package release and retest.

| Development checklist case | Result |
| --- | --- |
| cycles-R01 | PARTIAL: search/detail/phone identity pass; no-match feedback fails |
| cycles-M01, cycles-M02 | PASS |
| classes-R01 | PARTIAL: saved year/level/cycle and phone identity pass; no-match feedback fails |
| classes-M01, classes-M02 | PASS |
| sections-R01 | PARTIAL: filtering, room/capacity and identity pass; no-match feedback and class-filter accessible name fail |
| sections-M01, sections-M02, sections-M03 | PASS |
| subjects-R01 | PARTIAL: code/detail/filtering and supported relationship reads pass; no-match feedback fails |
| subjects-M01, subjects-M02 | PASS |

[Validation](validation.json) records passing focused schema tests, lint,
root type checks, the translation scan, 531 configuration tests and a production
build in a fresh separate output directory. Source fingerprints identify the
mutable working tree. The initial configuration run caught an Arabic encoding
error in the new label; it was corrected before the passing rerun. The
[attempt record](browser-attempts.json) retains that failure and an earlier
browser assertion that did not account for the shared full-name tooltip.

Accepted normal browser journeys have no unhandled page errors or HTTP error
responses. The duplicate UI report deliberately records its four expected 409s.
French/Arabic phone checks used 390 × 844 viewports; the Arabic Section view was
also inspected visually. Full touch, accessibility/security matrices and
production acceptance remain unverified. Production checkboxes are unchanged.
