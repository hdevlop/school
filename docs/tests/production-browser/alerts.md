# Alerts

Status: **PARTIAL** (2/8 PASS; the rest BLOCKED by missing controls or fixtures), last rechecked on `37147d7`, 2026-10-17. Evidence: [PB1019 Communication](../../evidence/production-browser/2026-10-17-pb1019-comm-continuation/README.md).

Entry point: `/alerts`. Original coverage: F04.

[All features](README.md) · [Required preflight](00-preflight.md) · [Evidence ledger](evidence-ledger.md)

## Setup

Use owned student-A/student-B, parent-A/parent-B and teacher-A/teacher-B with
known relationships, plus a school-wide staff account with the required grants.
Prepare separate owned alerts about student-A and student-B, a teacher/assignment
alert and a class notice limited to an entirely controlled class audience.
Record the exact IDs, expected readers, selected year and original statuses in
the private manifest. Status is shared by all readers of an alert, so every
mutation fixture must have an entirely controlled audience.

The current UI exposes list/filter, acknowledge, resolve, dismiss and authorized
delete actions; it has no alert create/content-edit form. Use supported internal
MCP first, or REST where needed, for separately authorized setup. That setup
does not count as browser creation. If fixtures, grants or a surface are absent
on the serving release, mark the affected cases BLOCKED. Do not run broad health
or financial reminder generation to produce fixtures.

## Browser checks

- [x] **alerts-R01**: Open `/alerts` directly and through navigation; class/section filters, subject identity, audience, priority, status and dates match supported reads. Desktop rows and phone cards identify the same alert; Arabic/LTR labels translate. Result: **PASS** — Direct and sidebar navigation, class/section filters, own subject identity and audience filtering, priority, status and full date/time match supported reads.
- [ ] **alerts-R02**: Compare parent-A/student-A/teacher-A with their unrelated B identities. Lists and filters expose only the alerts allowed by ownership, audience and selected year. Known alert-B detail/status/delete requests require separate transport denial checks when no corresponding browser control exists. Result: **BLOCKED** — Parent A/B row isolation and teacher audience filtering pass in browser; earlier scoped transport denials retained.
- [ ] **alerts-R03**: Inspect a controlled class notice: parent/student and teacher readers have no status action for this shared notice. On an active alert about their own child/self, parent/student see acknowledge only; a teacher sees supported status actions only on a readable alert about a person or their assignment. School-wide staff actions still require effective grants. Hidden actions alone do not prove server enforcement. Result: **BLOCKED** — Parent sees acknowledge only; teacher and admin supported person-alert actions observed.
- [ ] **alerts-R04**: As a year-authorized identity, switch between registered years and back; year-bound fixtures follow selection and shared notices follow their documented scope. Limited roles cannot select a forbidden historical scope. Compare error, empty and filtered-empty states without stale alerts; do not create a global notice for this case. Result: **BLOCKED** — Admin historical selection hides current fixtures and switching back restores them; parent has no year switch; active year unchanged.

## Owned-fixture mutations

Run only within the recorded production fixture scope and controlled audience;
otherwise mark these cases BLOCKED. Use separate alerts where one transition
would remove another case's starting state.

- [ ] **alerts-M01**: As parent-A, acknowledge an active alert about their owned child; repeat as student-A on a separate self alert. Reload both the acting view and an authorized staff view: the same alert is acknowledged. Resolve/dismiss/content-edit remain unavailable; assert their server denials separately against those exact owned fixtures with no state change. Result: **BLOCKED** — Both parents acknowledge own child and reload persistence passes.
- [ ] **alerts-M02**: As teacher-A with the required grants, acknowledge/resolve/dismiss readable owned person/assignment alerts through row/card menus. Reload after each action and verify the shared persisted status. A class-only notice has no teacher status action; verify a scoped transport attempt is denied separately. Result: **BLOCKED** — Teacher acknowledge/resolve/dismiss each persist on a controlled person alert.
- [ ] **alerts-M03**: As a permitted school-wide staff account, exercise acknowledge/resolve/dismiss on separate controlled person/class fixtures. Reload and reconcile the exact status with other permitted readers; unrelated alerts remain unchanged. Include supervisor according to its serving grants. Result: **BLOCKED** — Admin resolves/dismisses controlled person alert and reloads; unrelated alerts unchanged.
- [x] **alerts-M04**: Cancel deletion of an owned disposable alert, then confirm once as an identity granted deletion. Verify it disappears after reload and unrelated fixtures remain. Check denied identity UI and separate transport refusal; never use delete-all or delete-resolved bulk endpoints. Result: **PASS** — Cancel preserves controlled alert; one confirmed browser delete persists after reload.

## Finish and evidence

Record each case ID, expected versus observed result, serving SHA, role, fixture
alias, sanitized request statuses and PASS / FAIL / BLOCKED / NOT RUN. Keep
browser outcomes separate from fixture setup, API denials, content lifecycle,
health-alert generation and database guarantees. Run the relevant
[viewport, locale and keyboard checks](responsive-accessibility.md).

Cleanup only the exact owned alerts through supported actions before removing
their relationships and people. Reconcile statuses shared across readers and
record any retained fixtures. A notification bell read or hidden menu action
does not accept the corresponding alert lifecycle or authorization case.
