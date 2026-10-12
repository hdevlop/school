# One-time landing defaults

Production Compose runs `bun run seed:landing` in the migration service, after
schema migrations succeed and before the web app and notifications worker start.
The image contains the defaults and photos; initialization runs against the
persistent runtime database, never against a database during image build.

The packaged defaults match the development landing page: four statistics, six
news cards, two testimonials, admissions content, and three program photos.
They are illustrative content; replace the statistics, testimonials, dates and
social URLs through **Public Page** with the school's actual content.
The seed does not copy local users, students, credentials, branding uploads,
school settings, or academic-year data.

The `school_landing` singleton row is the initialization marker. The seed inserts
it with `ON CONFLICT DO NOTHING`. If it exists, the entire seed skips, even if its
sections are empty or the page is unpublished. Redeploys preserve every saved
change. Editing the bundled defaults later does not update an initialized DB.
Deleting the singleton directly removes the marker and allows initialization on
the next run; clearing sections through the editor keeps the marker.

On first initialization, existing cycles are reused in display order, with the
first three active cycles assigned program photos and descriptions. The seed
creates the three default cycles only when there are no cycle records at all.
Inactive cycles stay inactive, and existing cycles are never renamed. The marker,
cycle creation, and photo assignments share one transaction, so a failure leaves
initialization retryable. Database or seed failure blocks app startup.

Existing installations with a saved empty landing record deliberately skip;
populate that record through **Public Page**. The persistent PostgreSQL volume and
storage mount must remain in place across redeploys.

Manual initialization uses `bun run seed:landing` with the intended `DB_URL`.
Source checks use `bun run test:landing`. PostgreSQL preservation checks use:

```powershell
$env:LANDING_SEED_DB_TEST = '1'
bun --env-file=apps/dashboard/.env.local test packages/server/tests/landing/LandingSeed.test.ts
Remove-Item Env:LANDING_SEED_DB_TEST
```

The PostgreSQL checks use session-local temporary tables and leave application
records unchanged.
