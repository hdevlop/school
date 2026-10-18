# Vehicle table/card parity — development follow-up

Executed on 2026-10-18 at **http://127.0.0.1:3102**, year **2026-2027**.
**vehicles-R01: PASS in development**, closing the partial case from the
[transport/attendance batch](../2026-10-18-transport-attendance/README.md).
Production acceptance remains separate and unchanged.

The [before result](before.json) reproduces the gap: a card shows 12,543.5 km,
but table view has neither a current-mileage column nor the value. The local
fix adds that column using the existing translated label and card formatting.
Its accessor returns a number so sorting compares numeric readings.

The [final browser run](after.json) contains **71 passing assertions** in fresh,
isolated Chromium contexts. This is not connected-browser acceptance.

| Surface | Checks |
| --- | --- |
| French, Arabic, English and Spanish desktop, 1440×1000 | Three vehicles agree between cards, table rows and supporting MCP reads on plate, current mileage and translated state. Header translation, both sort directions, plate search, filter retention when switching views, reload and viewport bounds pass. |
| French phone and Arabic dark-mode phone, 390×844 | Responsive cards show the same zero and decimal readings and active/maintenance/retired states; name search, reload and viewport bounds pass. Arabic uses RTL. |

Controlled odometer readings were **0**, **9.5**, and **12,543.5** km. Both sort
directions verify that 9.5 precedes 12,543.5 when ascending, rather than sorting
the stored numeric strings alphabetically. Supporting reads confirm that the
stored readings and states remain unchanged. The browser journeys made **zero
vehicle writes**, with no HTTP failures or JavaScript page errors recorded.

Phone layouts intentionally use cards and do not expose the desktop view
switch. Early harness attempts were corrected to wait for the menu to close
and to follow that responsive contract. Their partial assertion counts are
excluded; only the final six-variant run contributes to the 71 total.

Screenshots: [missing column before](before-table-fr.png),
[French table after](after-fr-desktop.png),
[Arabic table after](after-ar-desktop.png),
[French phone cards](after-fr-phone.png), and
[Arabic phone cards](after-ar-phone.png). French desktop and Arabic phone
screenshots were visually reviewed. Existing table truncation remains; this
change does not redesign column sizing or shared table controls.

Setup created exactly three unused local vehicles through internal Najm MCP.
[Cleanup](cleanup.json) verified their exact identities, removed them through
supported MCP deletion and confirmed all three return 404. Dev health returns
200. No students, assignments, fees or payments were created in this follow-up.
Credentials, sessions and raw fixture manifests remain in ignored local files.

[Validation](validation.json): lint, type checks, translation scan, **547
automated tests**, production build and diff checks pass. The build used a
separate output directory so the existing dev server remained available.
The [source fingerprint](source-fingerprint.json) identifies the tested working
tree. This batch was not committed, pushed, deployed or tested in production.
