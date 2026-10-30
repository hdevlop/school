# School data reset and Routine dependency

## Academic-year deletion follow-up (2026-10-29)

The interactive keep-academics reset reached `delete from "academic_years"`
without clearing `exam_planning`. Its restrictive academic-year foreign key
prevents that deletion even after people, fees and ordinary exams are gone.

Both the CLI reset and `SeedService.clearAllData()` now clear exam planning
across all years before removing the year registry. The seed container exports
the repository directly, as it already does for alerts and announcements.
The keep-academics choice still preserves cycles, classes, sections, subjects
and fee types.

Verification: CLI reset/menu and seed dependency tests pass (11 tests, 65
assertions); server source/test and seed typechecks and the production build
pass. Lint passes with the
existing `ParentsTable.tsx` hook warning. The reset-order server suite cannot
initialize because `AcademicYearValidator` hits `target.constructor` on an
undefined decorator target in `najm-i18n`, before its tests execute. The added
repository regression checks that reset emits an unscoped planning deletion;
orchestration tests check its order and stop-on-failure behavior. No application
database reset was run for this repair.

Date: 2026-09-24

## Production failure

The interactive `bun seed` → `Delete all school data` operation stopped at `SectionService.deleteAll()` after earlier deletion steps succeeded. Production had one `routine_schedules` row with a restrictive foreign key to `sections`; the reset script did not clear Routine tables. A read-only count after failure showed zero students, teachers, staff, and parents, while 27 sections, 9 classes, 10 subjects, 9 fee types, 2 settings rows, and one Routine schedule remained. This was a partial reset, not an atomic rollback.

## Local repair

- Clear Routine entries and duties before periods and schedules, before deleting teachers, staff, or sections.
- Clear rollover items and runs before deleting students, fees, or fee types, since those items also use restrictive references.
- Use service and repository methods through the seed container; both table groups are cleared within their own transaction.
- Keep the production data unchanged until the user chooses whether to finish the reset or preserve the remaining data for recovery.

## Verification

The focused `test:routines` suite passes its two new foreign-key-order checks. Server test typecheck, root lint, and the production build pass. The repaired reset has not been run against a disposable or production database, and its source is not deployed.
