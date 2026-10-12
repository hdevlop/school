# Landing section title colors

Checked locally on 2026-10-11 against `/welcome`.

Landing headings now share the hero's charcoal black (`#282925`). All seven
section titles highlight whole translated words with the hero's purple
(`#af62ad`) and coral (`#d64e57`). One palette supplies the hero and section
titles, including their lighter colors in dark mode. Card headings also use
the shared heading color. The admissions year remains outside the accents.

- Root lint and dashboard type checks passed.
- The production build passed with
  `NAJM_NEXT_DIST_DIR=.next-landing-titles-review`. Its generated CSS includes
  the final admissions-heading rule without the previous blue override.
- Six Chrome previews passed: English desktop and mobile, French tablet,
  Arabic mobile, Spanish at 320px, and English in dark mode. Theme and language
  used the existing School preference cookies in fresh browser contexts.
- Each section heading's computed base and accent colors matched the hero.
  Translated text, heading accessible names, and the admissions year were
  preserved. Arabic words remain intact, preserving connected glyphs.
- No horizontal overflow or page errors were observed. A separate hydrated
  dark-mode check produced no browser console errors or warnings.

Screenshots and computed-color evidence are saved beside this file in
[results.json](results.json). Local preview runners live under `.cache/`.
These checks do not cover deployment or submitting a visit request.
