# Bilingual birthplaces

The shared reference catalog ships with School; it requires no database seeding
or third-party runtime service. It contains **1,503 communes**, with HCP's Arabic
and Latin names and province labels for disambiguation. It is not a complete
list of douars, neighbourhoods or foreign places. Those accept manual names in
both scripts. A commune is identified by `MA-HCP-` plus its geographic code;
names are never IDs.

## Source and regeneration

Source: Haut-Commissariat au Plan, **RGPH 2024**, published 7 November 2024:

- [Publication and bilingual downloads](https://www.hcp.ma/Population-legale-du-Royaume-du-Maroc-repartie-par-regions-provinces-et-prefectures-et-communes-selon-les-resultats-du_a3975.html)
- [Original Excel workbook](https://www.hcp.ma/file/242341/)
- Retrieved 29 October 2026; workbook SHA-256:
  `7e9d3d402cc2fd0d9c4fc941c4f23c6a5e5ddcbefbba80b7540267f8e2728dca`.

Run `python scripts/generate-morocco-birthplaces.py <downloaded-workbook.xlsx>`
with openpyxl installed. The generator selects only `Commune` rows, strips the
administrative label in each language and recovers leading zeros from Excel's
code formatting. It checks the commune count and uniqueness before writing
`packages/contracts/src/data/moroccoBirthplaces.json`.

## Student records and import

Apply the generated database migration with `bun run db:migrate`. The three
nullable identity columns are `birthplaceId`, `birthplace` (Latin script), and
`birthplaceArabic`. Catalog choices store the ID and both canonical names;
manual places store names with a null ID. Names are snapshots so documents do
not need the catalog at render time. These fields belong to the student,
independently of academic years and enrollments.

Student create, edit, REST, MCP and JSON/CSV/XLSX imports use the same fields.
The legacy `birthplace` import field is supported. Exact, accent-insensitive
names and explicit aliases (`Casa`, `Fes`, `Mohammedia`, etc.) resolve only when
one commune matches. Ambiguous names stay manual; selecting the geographic ID
resolves them. Unknown IDs are rejected. An absent birthplace does not change
existing data; explicitly clearing names clears its ID and translations too.

Student forms use one searchable field showing `Latin - العربية`. Catalog
choices fill both stored names; manual entries must include both scripts in
that format. Province labels appear only to distinguish duplicate names in
the choices. The form-only `birthplaceEntry` value is removed before submission;
the database, API and import fields are unchanged. Arabic documents prefer
`birthplaceArabic` and fall back to the available Latin name.

Student import continues to create records only; duplicate student codes are
rejected. To fill existing records without replaying enrollment, parents, fees
or payments, use `scripts/backfill-student-birthplaces.ts` over the internal
MCP API. Its default is a dry run; `--apply` fills missing fields only and
reports conflicts for manual review. See its usage message. The input JSON
is not modified by the backfill tool.

## Verification

`bun test packages/contracts/tests/birthplaces.test.ts packages/server/tests/security/StudentBirthplace.test.ts apps/dashboard/tests/features/Students/config/studentImport.test.ts apps/dashboard/tests/features/Students/insurance/insuranceDocument.test.ts`

Also run lint, typecheck, i18n checks, boundary checks, migration checks and a
production build. With the local app running and `SCHOOL_ADMIN_EMAIL` and
`SCHOOL_ADMIN_PASSWORD` set, run `bun run test:student-birthplace:browser`. It
uses mocked academic/student data and blocks school record writes. For UI
verification, choose Casablanca in either script,
edit a manual foreign place, clear a choice, reopen the student and print the
Arabic insurance register. Check duplicate commune names by province.
