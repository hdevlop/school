# Shared responsive, locale and accessibility matrix

Status: **NOT RUN**. Original unit: J. Apply the [preflight](00-preflight.md) and record results per selected feature in the [ledger](evidence-ledger.md).

| Case | Action | Expected result |
| --- | --- | --- |
| shared-01 | Open accepted surfaces at 1440x900, 1024x768 and 390x844; use touch mode on phone. | Content remains readable; no page-level horizontal overflow; intentional timetable/table scroll stays inside its container. |
| shared-02 | Compare desktop rows and phone cards, filters and pagination/continuation. | Same identity, values and allowed actions; no inaccessible controls or missing records. |
| shared-03 | Repeat a representative journey per group in Arabic and one LTR locale; inspect all four locale labels separately. | RTL direction, icon placement, dates and feedback are correct; no untranslated keys. |
| shared-04 | Switch light/dark, reload and inspect first paint and branding. | Preference persists, text has usable contrast, protected/lazy images decode. |
| shared-05 | Use keyboard only for navigation, menus, form, dialog cancel/submit and close. | Visible focus, logical order, no trap, focus restored to opener, no duplicate submission. |
| shared-06 | Zoom to 200%, including timetable long labels and dialogs. | Content and actions remain reachable; labels are not lost. |
| shared-07 | Observe real loading, empty, error, forbidden and not-found cases. | Distinct feedback without stale/private data; do not inject mocked production responses or cause outages. Unavailable cases remain NOT RUN. |
| shared-08 | Review passive page/console/network diagnostics. | No unexplained errors or failing requests; declared negative responses match exactly. |

Run a representative cross-feature matrix after functional checks; do not repeat every payment or CRUD mutation at every viewport. Record selected features, browser/version and each viewport/locale/theme, not a blanket checkbox for all combinations.
