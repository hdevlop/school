# Open defect: the class filter has no accessible name

Target: `http://127.0.0.1:3102/students`, French desktop,
`najm-kit@3.6.1`. The root pin matches the read-only Desktop package version.

The visible class filter says `Filtrer par classe`, but its focusable
`div[role="combobox"]` has no accessible name. Playwright's named-role lookup
cannot find it. A text-scoped lookup operates the filter correctly and verifies
CP and sections A/B against the transferred owned student. This accessibility
assertion remains **FAIL** in [the read report](students-read.json).

In the matching Najm source,
`src/components/table/NTableHeader.tsx` renders `ComboboxInput` for controlled
filters without passing `ariaLabel`. `src/components/inputs/ComboboxInput.tsx`
puts only its `ariaLabel` prop on the trigger; the visible placeholder does not
supply the combobox's accessible name. The same table renderer also has an
uncontrolled combobox branch that needs coverage.

The [Najm skill](../../../../.agents/skills/najm/SKILL.md) says
“Najm source is read-only reference” and “never make School consume the local
source; School pins published versions.” This batch therefore changes no Najm
source or dependency pin. The missing label requires a published package fix.

Forward a stable translated accessible name from the existing filter contract,
including the translated placeholder fallback. Cover controlled and column
comboboxes, empty and selected values, desktop/mobile filters and French/Arabic.
Verify keyboard opening, searching and selection, then pin the published
version and rerun School's named-role lookup. Preserve the single table owner;
do not patch the DOM or add a duplicate School filter.
