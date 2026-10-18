# Open defect: client filtering leaves an empty card grid

Target: `http://127.0.0.1:3102/users`, French desktop, `najm-kit@3.6.1`.

With existing users loaded, enter a name with no matches. The visible card
count becomes zero, but School's `renderFilteredEmpty` renderer is never
shown. The list area is blank and pagination reads page 1 of 0. Clearing the
filter restores the records. This is a **FAIL**, independent of the successful
account mutations; it does not accept `users-R01`.

[The probe](users-empty-before.json) records zero cards and zero occurrences
of the expected `Aucun résultat` title. The screenshot was inspected locally;
its private browser artifacts remain ignored.

The matching read-only Najm source shows that `NTable` sets `isFilteredEmpty`
from the explicit prop only. Its layout checks that flag, while `NTableCards`
renders an empty grid for an empty filtered row model. School already passes
the translated renderer. The defect needs a published Najm fix; adding a second
School filter state would duplicate the shared table's state.

The [Najm skill](../../../../.agents/skills/najm/SKILL.md) explicitly says
“Najm source is read-only reference” and “never make School consume the local
source; School pins published versions.” Accordingly this run changes no
Desktop Najm source or dependency pins.

For the Najm package fix, derive client filtered emptiness from the existing
table's prefiltered and filtered row models. Preserve explicit server-filtered
emptiness, loading/error precedence and the distinction from a truly empty
dataset or an out-of-range pagination page. Use the existing filtered-empty
renderer for cards and table mode, with filters still available. Verify clearing
the filter restores rows, and cover French/Arabic phone and desktop views.

Retest this reproduction in School after pinning the published fix. Keep the
production case unchecked until its release and production browser recheck.
