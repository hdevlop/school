# Moroccan draft: offline pipeline coverage

Audited all 960 assistant-authored questions against the current School language
profile and synchronous reply templates for year `2026-2027`. The
[machine report](jev-draft-coverage-20261006.json) retains every question, detected
language, template intent/tools, skip reason and source hash. No classifier,
School tool, paid API or live app was called. Corpus labels remain provisional.

| Declared style | Questions | Unknown language | Template matches | Eligible misses under assumed turn | Supported labels skipped for language |
|---|---:|---:|---:|---:|---:|
| French | 240 | 64 | 8 | 168 | 49 |
| Arabic | 240 | 0 | 9 | 231 | 0 |
| Darija, Arabic script | 240 | 0 | 5 | 235 | 0 |
| Arabizi | 240 | 81 | 0 | 159 | 57 |
| Total | 960 | 145 | 22 | 793 | 106 |

All 22 existing template matches are write refusals and agree with the draft's
labels. None of the new read paraphrases hits a synchronous template. This is
coverage on this deliberately varied draft, not the production template share.

Of the 793 eligible misses, 592 have provisionally supported labels (522 reads
or small talk, 70 writes). The other 201 have `needs_llm` or core-excluded exam
labels; eligibility merely permits classification, not acceptance. These counts
assume mode `on`, a verified administrator, a web request and complete first-turn
history. Jev remains off, and no decisions or readiness times were measured.

The language gate skips 106 supported-label questions: 49 French and 57 Arabizi.
Examples include “L'école compte combien d'élèves inscrits cette année, au total ?”
and “salam ntmenna tkoun bikhir lyoum.” Separately, 47 Arabic-script Darija cases
are detected as `ar`: they remain eligible, but a formal-Arabic reply could miss
the intended register. Detection is heuristic; declared styles are also unreviewed.

The development count veto declines 14 provisional count labels that explicitly
exclude names/lists, such as “J'ai besoin du total des élèves, pas de leurs noms.”
This is a known conservative abstention tradeoff, not 14 measured classifier
errors. The veto remains outside the live application.

Manual label concern: `mda26-student_and_teacher_count-12-fr` says “Je cherche les
deux totaux, sans les listes de noms.” It does not name students or teachers;
on a standalone first turn, `needs_llm` is the safer label. Its other language
variants name both entities. Flag this translation/label disagreement during
review; the source text, provisional label and blind worksheet remain preserved.
No full semantic or native-speaker review is claimed by this mechanical audit.

Next work: review/correct provisional meanings, then extend language recognition
with focused ambiguous/unsupported-language regression cases. Keep intent
matching narrow. A later exploratory Jev run needs its own recorded request and
spending budget; actual native authorship/review and the published async hook
are still prerequisites for acceptance and integration.

Reproduce without a key:

```powershell
bun scripts/chatbot-jev-draft-audit.mjs
bun test scripts/tests/chatbot-jev-draft-audit.test.mjs
```

An optional `--out=NEW_PATH` writes the full report exclusively and refuses to
overwrite evidence. The audit's four focused tests pass (17 assertions).
