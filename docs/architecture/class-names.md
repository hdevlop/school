# Class names in the app and in files

School uses familiar class names in its screens and official codes in table file exports.
The single mapping lives in `packages/contracts/src/classNames.ts` and is exported by
`@sms/contracts` for the dashboard, server and fixtures.

| App name | Official code |
| --- | --- |
| CP | 1APG |
| CE1 | 2APG |
| CE2 | 3APG |
| CM1 | 4APG |
| CM2 | 5APG |
| CE6 | 6APG |
| 1AC | 1APIC |
| 2AC | 2APIC |
| 3AC | 3APIC |

PS, MS, GS, TC, 1BAC, 2BAC and custom names keep their existing names.

Shared class filters use academic order: PS, MS, GS, CP, CE1, CE2, CM1, CM2,
CE6, 1AC, 2AC, 3AC, TC, 1BAC, 2BAC. Official aliases use the same positions;
custom classes follow in natural alphabetical order, independent of creation date.

## Input and persistence

Student import and server class-name lookup accept either convention, ignoring case
and surrounding spaces. An exact name takes priority over an alias. Class lookup
and uniqueness checks keep their existing year boundaries; aliases never select
another year's class. Create/update/bulk class validation stores recognized names
in the familiar form. Equivalent names count as duplicates within one year.

Existing class IDs, relationships and saved names need no migration. No missing
class or section is created by the importer. Sections accept `1`/`A`, `2`/`B`,
through `26`/`Z`, with exact names first and independent of list order.

## Exports

Dashboard tables use `SchoolTable`, a small adapter over Najm's `NTable`. Its CSV
export reads Najm's live table model, retaining visible columns, filters, sorting
and rows across pages. It converts only class columns to official codes without
mutating the source data or changing rendering or printing.

The standard class fields are `class`, `className`, `class.name` and `classSection`.
The Classes table declares `classNameColumns={['name']}` because its class-name
column is called `name`; names in unrelated tables remain untouched. A new table
with different class columns should pass their keys through `classNameColumns`.
