# Dashboard action permissions

Dashboard actions use the signed-in session's permission matcher. Reading a
page does not grant its create, update or delete actions. API guards remain
the authority; these controls prevent offering actions the API will refuse.

- Mutation tables declare `permissionResource` on `SchoolTable`. It gates
  create, edit, delete, bulk delete, import and inline editing. Unavailable
  actions use disabled controls/menu entries and have no mutation callback.
- A workflow that uses another permission declares it explicitly. For example,
  voiding a payment uses `deletePermission="update:payments"`.
- Custom table menu entries carry `permission`, such as `update:expenses`.
  `SchoolTable` protects those entries, including submenus. Menus reused outside
  the table must call `protectMenuItems` themselves and render `disabled`.
- Standalone mutation buttons use `PermissionButton permission="…"`. Existing
  workflow/loading restrictions still apply. Read-only family views keep their
  existing restrictions.
- Grade and attendance controls also check the permissions used by their
  submission endpoints. Existing record/teacher ownership rules still apply
  on the server.

Accounting cannot create, edit or delete sections, cycles or staff. Its staff
create/edit grants are removed from the seed policy and existing installations
by `0076_accounting_staff_read_only.sql`; other roles and finance grants remain
unchanged. The migration revokes affected sessions so cached claims cannot
retain the removed grants.
An account with an explicit grant can perform that action; an account with no
grant cannot, including while its session is still loading. Wildcards are
resolved by Najm's existing matcher.

## Verification

```powershell
bun test apps/dashboard/tests/components/permissionControls.test.ts
bun test apps/dashboard/tests
bun run test:boundaries
bun run lint
bun run typecheck
bun run build
bun --env-file=apps/dashboard/.env.local test packages/server/tests/acceptance/AccountingStaffPermissionsDatabase.test.ts
```

The focused tests verify the seeded accounting policy, native disabled buttons,
table callbacks and menus, bulk/inline editing, explicit and wildcard grants,
workflow-disabled items, school-wide restrictions and permission revocation.
The component fixture runs in a separate process to isolate its auth mocks.
The migration tests use a generated isolated PostgreSQL schema and verify exact
grant removal, unaffected roles, idempotence, session revocation and rollback.
The role editor API accepts permission-only saves without `sidebarKeys` so these
changes preserve both explicit sidebar settings and legacy default navigation.

Local API acceptance on 2026-10-23 removed exactly `create:staff` and
`update:staff` from accounting and reread the role to confirm every other grant
was preserved. Staff reading and fee/payment writes remained available. This
used the role API; the upgrade migration remains for deployment. No browser was
connected for live visual acceptance.

For live acceptance, open Sections and Cycles as an accountant and check the
disabled add button, edit/delete menu entries, bulk delete and inline editing.
Repeat with a granted/admin account and at mobile width. Also check fee/payment,
payroll, grade and attendance controls with read-only and write-capable accounts.
