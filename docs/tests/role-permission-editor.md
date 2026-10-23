# Role permission editor

The Roles page selects one role in the left panel and edits its grants in a
module/action matrix. Financial rows include Fees, Payments, Fee Types,
Expenses, Payroll, and Financial Operations separately. Mobile uses grouped
checkboxes. Actions absent from the permission catalog have no checkbox;
additional actions remain available under Special permissions.

Changes stay in a draft until Save changes → review → Apply changes.
Discard returns to the latest fetched snapshot. Switching roles with a draft
requires discarding it. Reloading a dirty page triggers the browser's native
unsaved-work warning. Admin is protected in the editor and save endpoint.

## Sidebar behavior

Each menu entry has an independent Show in sidebar checkbox. It is available
only when that role can reach the entry under existing page/role rules. Hiding
an entry does not revoke its page or API permissions. Conversely, a sidebar
grant never authorizes a page or reveals records. Empty navigation groups
disappear. The sidebar Settings footer is configurable; Logout stays present.

The choices live in the existing role permission set, as `sidebar:<key>`
grants, with `sidebar:configured` marking an explicit configuration. Without
that marker, existing navigation remains unchanged. The catalog records are
created transactionally on the first save, without a migration or reseeding
existing access. The normal auth refresh delivers changes to signed-in users.

Page access and record scope remain separate: teacher, parent, and student
ownership stays restricted. A custom role without a configured ownership rule
does not gain owned records from these checkboxes; the editor states this.
Roles and Permissions administration and Appearance remain admin-only.

## Save contract

Admin-only REST: `GET /api/admin/access/roles/:roleId` reads the role, its
assigned permissions, and the catalog. `PUT` receives permission IDs, the
expected original permission IDs, and sidebar keys from the shared contract.
There are no MCP tools for these routes.

The save locks the role, rejects stale drafts with 409, validates all IDs,
creates any missing sidebar catalog records, and applies the grant delta and
audit in one transaction. It uses Najm's PermissionService so existing token
claims are invalidated. A failed audit rolls the entire database change back.

## Verification

```powershell
bun test apps/dashboard/tests/features/Roles/permissionMatrix.test.ts apps/dashboard/tests/shared/sidebarPermissions.test.ts apps/dashboard/tests/shared/pageAccess.test.ts packages/server/tests/security/RoleAccess.test.ts
bun run test:role-access:integration
bun run lint
bun run typecheck
bun run i18n:check
bun run test:boundaries
bun run build
```

The integration test uses an isolated, randomly named PostgreSQL schema and
the installed Najm services. It covers HTTP guard refusal, admin protection,
audit-failure rollback (including new catalog records), competing saves,
access-token invalidation, and independent sidebar/permission grants. It drops
only its own schema. With no DB_URL it reports skipped; a configured but
unreachable or incompatible database fails the test.

For a production build alongside the running development server, use a
separate `NAJM_NEXT_DIST_DIR` so the build does not replace the dev output.

Manual browser checks still required: desktop/mobile layout, French/Arabic
labels and RTL, draft/discard/review, search, and an affected user's refreshed
sidebar. Automated server tests do not establish this visual acceptance.

Verified on 2026-10-22: focused role/navigation checks, the real PostgreSQL
acceptance suite, app/contracts tests, server security tests, workspace
boundaries, typechecks, translation checks, and an isolated production build.
Lint has an existing ParentsTable hook-dependency warning. No browser surface
was connected for visual acceptance. Sidebar-only grants are excluded from
Home feature detection and staff-login privilege comparisons.

## Split actions (22 October 2026)

The active catalog has no `manage` action. Timetables use Create, Update,
and Delete; normal timetable reads retain the `read:classes`
dependency. Candidate details require one of Create, Update, or Delete and are
not exposed to ordinary readers. The desktop and mobile timetable respect
those three permissions independently, including deletion without editing.
Participants use Read/Create/Update/Delete; marking participant attendance
requires Update. Staff attendance is a roster edit (`update:staff-attendance`),
with no separate create/delete endpoint. Financial rollover uses `update:financial-operations`. Resolving and reopening
discipline incidents use `update:discipline`. These workflows appear under Edit. Other custom actions remain available.

Migration `0073_split_manage_permissions` copies each legacy grant to its
replacement actions for every role, including custom roles. It preserves
unrelated and sidebar grants and existing replacement IDs. `manage:*` becomes
the union of the retired School actions; `*:*` stays untouched. The unused
`manage:attendance` entry is removed without granting new student-attendance
access. Existing individual attendance grants remain unchanged.

Catalog insertion, grant transfer, revocation of affected users' active tokens,
and legacy removal run in one transaction. The migration is idempotent and does
not restore permissions revoked after it ran. Run migrations before starting
the new app and worker processes; the restart clears process auth caches.
Affected users must sign in again. Do not roll back just the app to code that
still requires the retired permission names. Keep a database backup for a
coordinated rollback; do not reseed role defaults to perform this upgrade.

The PostgreSQL suite covers catalog-conflict rollback, late-failure rollback of
grants and token revocation, custom-role preservation, wildcard migration,
revocation of old tokens after restart, HTTP action separation, candidate
privacy, and repeat execution after an administrator removes a grant. It uses
its own disposable schema; it does not change running-app role grants.

Browser acceptance remains separate: test a View-only role, an Add-only role,
an Edit-only role and a Delete-only role on desktop and mobile, then check the
Edit for publishing, rollover and discipline resolution, and sign-in after migration.

### Existing local installations

`POST /api/admin/access/roles/migrate-actions` is an admin-only, body-free,
idempotent upgrade action. It exists because the built-in permission routes
validate IDs as five characters and therefore reject the older deterministic
School seed IDs. It migrates only the retired School names, locks roles in
order, uses Najm PermissionService for every grant and catalog change, and
audits each changed role in one transaction. It preserves sidebar grants
without normalizing or configuring them. It is not exposed through MCP.
The integration test verifies anonymous/non-admin refusal, long IDs,
audit-failure rollback, token invalidation, exact grant preservation and retry.

Local acceptance on 22 October: the five retired catalog entries were removed
through internal REST, all 10 roles matched the original grants with exactly
the replacements above, unrelated/sidebar grants were preserved, and a repeat
upgrade returned zero changes. This does not mark the SQL migration applied
in Drizzle's journal. Deployment still runs migrations 0073 and 0074; after this API
upgrade it safely finds no remaining legacy grants and leaves new sessions
alone. Production deployment and browser layout checks were not performed.

Verification: the 10 PostgreSQL/API integration tests, 148 security tests,
type checking, workspace boundaries and isolated production build passed.
Root `bun run test` reaches an unrelated existing enrollment ownership SQL
snapshot mismatch (`OwnershipSqlBaseline.test.ts`); that baseline was not
rewritten for this permission change. Lint has the existing ParentsTable
`parentFilters` dependency warning.

### Edit workflows correction

Migration `0074_edit_workflow_permissions` folds `rollover:financial-operations`
into `update:financial-operations` and `resolve:discipline` into
`update:discipline`, including legacy `manage:financial-operations`. It preserves
existing Edit permission IDs and all unrelated grants, revokes stale tokens,
and is idempotent. A role with Edit may perform those workflows; there is no
separate Rollover or Resolve checkbox. The REST upgrade action applies the same
mapping, and `manage:*` does not gain discipline editing from this change.
Local REST verification confirmed the exact mapped grants of all 10 roles and
zero remaining Rollover/Resolve permissions.

### Publishing is editing

`publish:class-routines` is retired by migration 0075 and the internal REST
upgrade action. Publishing now requires `update:class-routines`; there is no
Publish permission column. Fresh defaults also grant only timetable CRUD.
Existing Publish grants become Edit grants without changing unrelated access.
Deploy migrations 0073?0075 in order; the earlier steps retain their historical
SQL and the final step removes the temporary separate Publish permission.
