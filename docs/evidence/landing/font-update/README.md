# Landing typography update

Checked locally on 2026-10-11 against `/welcome`.

The reference hero's Lilita One font is now loaded once from
`features/Landing/config/landingFont.ts`. The public layout applies it across
the landing page. Heading and form-control rules explicitly inherit it;
the language menu, mobile sheet and program dropdown receive the same font
variable in their portal containers. Arabic glyphs use the system fallback.

- Root lint and dashboard type checks passed.
- The production build passed with
  `NAJM_NEXT_DIST_DIR=.next-landing-font-review-final`.
- Five Chrome previews passed: English desktop and mobile, French tablet,
  Arabic mobile, and Spanish at 320px. Computed font families matched for
  navigation, headings, statistics, body copy, cards, testimonials, footer,
  labels, input fields, textareas and submit controls.
- The language menu, program dropdown, country dropdown, mobile menu and
  mobile menu title also matched the landing font.
- The bundled font loaded successfully; no horizontal overflow or page
  errors were observed. Screenshots and computed-font evidence are saved
  beside this file in [results.json](results.json).

The local preview runner is `.cache/landing-font-review.mjs`. The font and
its license remain under `apps/dashboard/src/features/Landing/fonts/`.
These checks do not cover deployment or submitting a visit request.
