# Owned property adoption

Status: `najm-auth@4.2.0` and `najm-api@2.1.0` are published and installed in
School. All 16 owned repositories use the property decorator. Tests, lint,
typechecking, and the production build passed.

```ts
import { Owned, type OwnedWhere } from '../../auth';

@Repository()
export class ExamRepository {
  @Owned(Exam, ExamForPlacedStudent, ExamForPlacedParent)
  private ownedWhere!: OwnedWhere;
}
```

Queries call `this.ownedWhere()` in their existing combined WHERE condition.
Najm owns the `OwnedWhere` type and binds the function after constructor field
initialization during context injection. Resolve decorated repositories through
the container. The function evaluates the current request on every call;
policy tokens, query conditions, and selected-year behavior are preserved.
The legacy class decorator remains supported. Najm API also exports `Owned`
and `OwnedWhere` from its root entry.

## Publication and adoption

- Najm release commit: `ce7a5b90b1fc396725a7722b5165ba4d52bcd768`.
- Both releases passed the repository publisher and published-artifact checks.
  Registry tarballs returned HTTP 200 before the successful consumer install.
- School's root, server, and dashboard manifests pin published versions;
  `bun install` regenerated the lockfile. Installed declarations/runtime were
  verified. No local Najm links or copied framework source are used.
- Migrated Alerts, Announcements, Assessments, Attendance, Behavior Rewards,
  Classes, Discipline, Events, Exams, Grades, Parents (two repositories),
  Search, Sections, Students, and Teachers.
- School re-exports `OwnedWhere` through its auth entry. Repositories without
  ownership, including StudentEnrollmentRepository, are outside this migration.
- School changes remain uncommitted alongside pre-existing work. No Git push
  or deployment was performed.

## Validation

- Najm ownership suite: 15 passed, including both TypeScript field emission
  modes, multiple/inherited properties, alternative policies, unknown/anonymous
  denial, concurrent request isolation, and legacy class-decorator behavior.
- Najm auth full suite: 526 passed, 13 skipped, 0 failed. Separate React-server
  suite: 13 passed, 6 skipped, 0 failed. PostgreSQL/Redis acceptance was skipped.
- Najm API export suite: 3 passed. Auth/API builds, built public-entry smoke
  through DI with two actors, and public API snapshot checks passed.
- School ownership suite: 172 passed, 0 failed, including published-container
  wiring and ownership alongside each repository's read filters.
- School `bun run test` passed, including academic-year regressions, teacher
  dashboard, access reset, routines, configuration, and workspace boundaries.
- School `bun run typecheck` passed across all workspaces and test projects.
- School `bun run lint` passed with one existing unused `activeLabel` warning
  in Transport's VehicleStudentsPanel.
- School `bun run build` passed, including compilation, TypeScript checks,
  page generation, and build traces.

No database mutation, live database/API acceptance, or browser test was run
for this ownership API migration. Existing academic-year evidence remains in
its own ledger.
