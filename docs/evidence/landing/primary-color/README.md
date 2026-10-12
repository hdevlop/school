# Shared coral primary color

Checked locally on 2026-10-11.

The landing page and dashboard use `#d64e57` as their primary color, with
white text and icons on solid primary backgrounds. Landing hover states use
a deeper coral. Section titles retain their shared black, purple and coral
palette; the portrait panels and statistic cards retain their varied colors.

School's factory theme and CSS fallbacks define the same primary, foreground,
sidebar, focus-ring and first-chart tokens in light and dark modes. Table
header cells use the existing primary and foreground variables. The single
Najm provider remains the theme owner.

- Root lint passed.
- The factory theme passed Najm's parser and its tokens matched in both modes.
- The final production build passed with
  `NAJM_NEXT_DIST_DIR=.next-school-coral-final`.
- The active local appearance was saved through the guarded REST route,
  using its expected revision. Revision advanced from 1 to 2. Readback
  confirmed the tokens; typography, components and layout were preserved.
  Evidence is in [platform-api.json](platform-api.json).
- Six landing Chrome previews passed: English desktop and mobile, French
  tablet, Arabic mobile, Spanish at 320px, and English dark mode. Buttons,
  testimonial text, rating icons, hover states and primary variables matched.
  Language and program dropdowns and the mobile menu also matched. No
  horizontal overflow or page errors were observed. See [results.json](results.json).
- Three authenticated dashboard previews passed: light and dark desktop,
  and light mobile. Scoped primary, foreground, sidebar, focus-ring and chart
  variables matched. Pagination used coral and white text. Classes table
  header cells had coral backgrounds and white text in both modes. No page
  errors were observed. See [platform-browser.json](platform-browser.json).

Preview runners and the prior local appearance backup are under `.cache/`.
The browser checks only read application data; the appearance save used REST.
These checks do not cover deployment or submitting forms.
