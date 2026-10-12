# Landing hero redesign

Verified locally on 2026-10-11 against `http://localhost:3102/welcome`.

The old two-column classroom hero and blue statistics bar have been replaced
with the approved mockup's cream canvas, display headline, orange action,
two student portraits, school doodles, and four pastel statistic cards.
The headline, links, description and statistics remain HTML. Statistics and
their translations come from the existing school-owned landing content;
the main portrait retains the `landingHero` branding slot.

## Verification

- `bun run lint`: passed, with a final focused lint of both hero components.
- `bun run typecheck`: passed across all workspaces and test types.
- `bun run i18n:check`: passed for Arabic, English, Spanish and French.
- `bun run test:landing`: 7 passed, 0 failed.
- `bun run build`: passed with `NAJM_NEXT_DIST_DIR=.next-hero-review`, keeping
  the running development server's output separate.
- Headless Chrome previews: English desktop and mobile, French tablet,
  Arabic desktop and mobile, Spanish at 320px, and English desktop dark mode.
  Both portraits loaded, the visit action reached the contact section, no
  horizontal scrolling was introduced, and no page or HTTP errors occurred.
  Dark mode was checked by applying the existing document class in the local
  preview; persistence of the user's theme preference was outside this check.

The previews show the saved English statistics exactly as requested:
`1,200 students`, `85 teachers`, `25 years of excellence`, `98% bac success`.
The school-owned Arabic labels for students and years currently contain
replacement characters. These stored labels were retained; RTL layout and
the newly translated headline and controls were checked separately.

Screenshots and per-viewport results are beside this file in
[results.json](results.json). The temporary capture runner is
`.cache/landing-hero-review.mjs`. These checks cover the local hero and its
navigation; they do not establish deployment or visit-form submission
acceptance. No database records were changed during this work.

Portraits were generated with built-in ImageGen, saved as transparent WebP
under `apps/dashboard/public/images/landing/hero.webp` and `hero-girl.webp`.
Their exact prompts and source paths are recorded in
[landing-hero-prompts.json](../../../design/landing-hero-prompts.json).
