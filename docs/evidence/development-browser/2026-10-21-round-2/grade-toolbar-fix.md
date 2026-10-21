# Grade toolbar correction

Follow-up to the original **38 PASS, 1 FAIL** retest in [README.md](README.md).
The original failure and screenshot are retained as history.

The grade statistics now take the full available row on phones. Save grades
and Reset changes occupy their own wrapping action row. Statistic labels can
wrap and remain within their own cells; desktop keeps the compact inline layout.

Development verification: `http://localhost:3102`, Chrome 155.0.8059.86,
2026-10-21, base revision `3aa3ca1693353387ba685e211e68fcdd86526527` plus the
uncommitted source fingerprint in [grade-toolbar-fix-source.json](grade-toolbar-fix-source.json).

- **53 grade checks PASS, 0 FAIL**, plus the Settings switch check below, in
  [grade-toolbar-fix-results.json](grade-toolbar-fix-results.json).
- Grade toolbar: English, French, Arabic and Spanish, at 320, 360, 390, 768 and
  1440 px, with and without pending edits. Checked individual stat label bounds,
  text clipping, toolbar width and action bounds; no grade mutations in this matrix.
- Grade workflow: draft status, persistence across reload/navigation, isolation
  across assessment sources, Reset, new grade Save, existing grade update, saved
  statistics and reopening. One disposable assessment and its grade were removed
  through supported routes afterward.
- No unhandled page errors in the completed browser checks.
- **40 PASS, 0 FAIL** focused assessment, grade and finance dashboard tests.
- Root lint passed.
- Production build passed, including TypeScript and all 13 static pages, using
  the isolated `.next-grade-toolbar` output. Local app health returned HTTP 200.

The production build also exposed a Settings switch using the unsupported
`description` prop. The explanation is now a visible paragraph, because shared
FormInput hides its normal description when disabled. The switch sits inside
a native disabled fieldset, which enforces its disabled state even though the
shared SwitchInput does not forward the disabled prop. A separate Playwright
check confirms the explanation is visible and the switch is disabled.

Reviewed cropped phone screenshots:
[English](grade-header-en-390-fixed.png), [French](grade-header-fr-390-fixed.png),
[Arabic](grade-header-ar-390-fixed.png), [Spanish](grade-header-es-390-fixed.png).
These crops contain the toolbar only.

An initial workflow retest stopped on a Playwright response timeout. Its one
owned assessment fixture was removed before rerunning. The final complete
workflow passed with awaited response handling and completed cleanup.

Production deployment and production acceptance remain **NOT RUN**. The grade
locale matrix verifies layout and draft/reset controls; create/update acceptance
in this follow-up was English.
