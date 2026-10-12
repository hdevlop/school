# School UI publication check - 2026-10-12

The publication includes the pending landing redesign, local Lilita One font and
license, translated hero and section headings, mobile navigation, coral branding,
sidebar logos and sizing, attendance-filter layout, six news slots and their
validation, fictional Moroccan portraits and event photos, user-supplied device
images, generation prompts and existing local visual evidence.

The sixth news card uses `news-trampoline-game.webp`. The hero component and
branding configuration share the new Moroccan boy portrait through
`LANDING_HERO_FALLBACK`. Device image dimensions match the supplied assets:
1920 x 1080 for the laptop and 887 x 1774 for the phone.

## Validation

- `bun run check`: passed lint, all workspace and test type checks, translation
  validation, the root test suite, production build and migration metadata check.
- The root Bun test suites reported a combined 1,477 passes and zero failures.
- All referenced hero and news assets decoded successfully. Both hero cutouts
  retain alpha; the six news images are 1000 x 625 WebP.
- Changed JSON files parsed successfully. The staged text scan found no private
  keys, API keys or GitHub tokens. `git diff --cached --check` passed after removing
  trailing whitespace from two font-license lines without changing the text.
- A newer device-image update arrived during the full check. The original build
  used `.next-school-publication-20261012`; a final production build using
  `.next-school-publication-final-20261012` passed with the updated image dimensions
  verified in its compiled page output.

The full check is source validation and migration metadata validation. No database
migration, seed, new browser suite or deployment was run for this publication.
Earlier local screenshots and their precise scopes remain in the adjacent evidence
directories. The latest sixth-card check is recorded in
[the 2026-10-12 evidence](event-redraw/sixth-card-2026-10-12.json).
