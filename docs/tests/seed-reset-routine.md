# School data reset and Routine dependency

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
