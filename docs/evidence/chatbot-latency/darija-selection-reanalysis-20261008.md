# Darija tool observations - 2026-10-08

The owner now prioritizes correct tool selection and accepts average complete
responses below two seconds. All four historical Darija arms meet that time
criterion. This reanalysis makes zero new paid requests and does not measure
router-then-Jev.

| Historical path | Average response | Required tool/lookup or no-tool action observed | Missing required tool/lookup | Student attendance scope unverified |
|---|---:|---:|---:|---:|
| 120b-baseline | 0.96 s | 7/8 | 1 | 0 |
| 20b-coreweave-off | 1.45 s | 6/8 | 1 | 1 |
| 20b-coreweave-parallel | 1.45 s | 5/8 | 2 | 1 |
| 20b-coreweave-first | 0.61 s | 6/8 | 1 | 1 |

These are eight reused Arabic-script Darija cases per path. Observations are
**not full accuracy scores**: argument correctness and final-result correctness
remain unverified. Missing evidence stays null in the
[machine-readable analysis](darija-selection-reanalysis-20261008.json).
No Arabizi cases or router shortlists were captured in this full-chat sample.

The important findings are about correctness:

- All paths called both correct count tools for the combined-count question.
- Jev-first called classes_get_classes for the class-list question. The other
  paths called sections_get_sections and returned A/B rather than the class
  under the repository's class_list contract. Darija can mean either class or
  section; clarify ambiguous wording rather than silently assume one.
- Jev-first and parallel Jev produced a CE2-filter reply without a class/section
  lookup. An answer saying it cannot find an ID is not proof that the class was
  searched. The off paths performed class discovery.
- Three paths used attendance_get_today_all for a student-attendance question.
  That may be valid with a student filter, but the saved diagnostics do not expose
  enough arguments/results to confirm it. Do not score it as proven correct.
- The write request was refused without executing a tool on every path.

These expectations were applied after the historical run. They expose weaknesses
in the earlier no-tool-error measure, but are not a new frozen accuracy benchmark.
The embedding router only supplies a shortlist; saved calls do not establish
whether a mismatch came from retrieval or the LLM's choice.

**What we can do next:** use the existing 100 owner-reviewed Darija/Arabizi
questions, freeze tool/argument/clarification expectations for their 50 families,
add the router-then-Jev fixture arm, then compare it with existing router and
Jev-first using the same fallback model. Rank correct plans first; treat average
response below two seconds as a pass, without chasing milliseconds.
See the [active protocol](../../tests/darija-tool-selection-benchmark.md).
