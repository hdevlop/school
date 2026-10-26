# Subject defaults

`packages/contracts/src/fixtures/data/subjects.json` is the single subject
catalogue. CLI seeds, server demo seeds and browser fixtures read it through
the shared contracts package; the duplicate server JSON has been removed.
`@sms/contracts/subjects` exports the catalogue and subject selection helpers
without loading the fake-data generators.

## School defaults

Choose **Seed default data** in `bun seed`, or run:

```sh
bun seed defaults --levels=maternelle,primaire,college
```

The selected cycles determine which subject records are added:

| Cycle | Default catalogue |
| --- | --- |
| Maternelle | Language/communication, mathematical activities, discovery, sensory/motor development, arts, values/living together |
| Primaire | AR, FR, MATH, EI, SCI, HG, ART, PE |
| Collège | AR, FR, MATH, EI, HG, PHY, SVT, ENG, PE, INFO, ART |
| Lycée | AR, FR, MATH, EI, HG, PHY, SVT, ENG, PE, INFO; a common base, not a complete filière programme |

AMZ is excluded as requested. Primary English/informatics and other optional
subjects can be added by the school. Subjects remain shared across years;
`--year` limits classes and sections, not subject ownership. Selecting more
cycles later adds their missing subjects without removing any existing ones.

These are catalogue defaults, not class enrolment rules or assessment
coefficients. Demo teacher assignments use the same cycle selection and start
HG in primary year four (CM1/4APG). CE6/6APG is primary, not collège. Existing
classes are preserved; rerunning this seed does not recategorize a class the
school already created. Demo timetable lesson counts are illustrative.

## Reseeding an existing school

The seed matches existing subjects by normalized code and preserves their IDs.
Missing subjects are created; unexpected lookup, validation or write failures
stop the seed instead of being silently reported as existing subjects.

Only exact, untouched former defaults for PHY, SVT, ENG and PE are renamed to
the corrected catalogue labels. Both their former name and description must
match. Customized names/descriptions are preserved, as are settings and the
active academic year. Subject seeding never deletes or merges records.

New school defaults use combined HG. HIST/SB05 and GEO/SB06 stay in the reference
catalogue because older demo files and historical assignments can reference
them. They are excluded from new default profiles and new generated teacher
assignments. Legacy demo seed paths still seed the full reference catalogue
to keep their saved fixture IDs valid. Existing HIST/GEO records are not
automatically merged: their historical lessons and grades keep their meaning.

No fake `gradeLevel: 1` is attached to subjects. Per-class selection belongs to
the curriculum/assignment logic, not the global subject row.
