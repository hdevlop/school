# Chatbot benchmark evidence

This folder keeps current Darija/Jev evidence, the useful comparison reports and
historical inputs required by executable scripts or regression tests. Test-question
datasets remain in `datasets/chatbot-latency/`.

The comparison phase is closed. The active
[Jev + router optimization plan](../../../CHATBOT-LATENCY-PLAN.md) covers conservative
Jev eligibility, class/child resolution, faithful answers and ordinary-chat integration,
with OSS20B used only when a model is necessary. Production enablement remains a
planned step; historical checkpoints below are preserved observations.

On 2026-10-08, 572 historical/intermediate files were archived out of this folder.
The evidence footprint fell from 728 files / 66.29 MiB to 157 files / 21.96 MiB,
including this index. Historical inputs loaded indirectly by regression tests
were retained too. No benchmark result was rewritten or recomputed.

Start with [the new three-path Darija comparison](darija-combinations-results-20261009.md): 60 actual chats on 20 reused questions. Router + 20B passes 14/20 tool plans; Jev-first and router-first Jev both pass 17/20, at 1.242/1.247/1.174 seconds average. All eight direct Jev replies match fixture facts, but fallback scope and identity failures remain. The conditional next candidate is guarded Jev-first with router/20B fallback, skipping known unsupported classifier calls. Production settings remain unchanged; the report separates tool plans from answer correctness and preserves one compact verified archive.

[The broader 20B answer-quality report](darija-20b-quality-results-20261009.md): 12/24 factual/task checks pass across populated parent, teacher and student Darija workflows (9/18 accessible-data answers), at 1.573 seconds average. No protected data leaked, but missing answers and incorrect wording rule out a general 20B switch. Unavailable notices now fail benchmark scoring. Attached Arabic year markers are fixed; three targeted historical refusals pass with zero model calls. 1,403 chat/year/script tests, lint, typecheck, boundaries and build pass; private captures and the temporary build are removed. Anonymized observations and frozen sources occupy one verified 44 KiB archive.

[The empty-reply fix report](darija-empty-reply-fix-results-20261009.md) records the transport safeguard: School makes empty/failed streams visible and marks their outcome unavailable, with no automatic retry or invented school facts. Three live 20B/CoreWeave repeats of the failed teacher scenario returned visible replies without leaks; a separate controlled empty completion exercised the repair through the authenticated School endpoint with zero external generation calls. 503 chat/year checks, lint, typecheck, boundaries and build passed at that checkpoint.

[The fresh Darija and populated role report](darija-fresh-populated-results-20261009.md) preserves the prior observations: fresh Jev classification 21/24, five correct guarded plans and 19 fallbacks; populated development verification 11/12 at 1.123 seconds, including the empty reply that motivated this fix. No protected data leaked; direct ownership/year denials held. One verified 68 KiB archive preserves those observations and frozen sources, excluding private captures and credentials. The targeted fix is not a new 12/12 accuracy score.

[The previous routing and answer review report](darija-answer-closeout-results-20261009.md) records 100/100 tool plans on the reused development corpus, 42 passing live Jev-off checks with zero provider calls, and the assistant's evidence review of 15 previously flagged answers (two defects fixed). This remains separate from fresh accuracy. General Jev enablement and independent native acceptance remain unqualified.

[The previous 99/100 report](darija-remaining-filters-results-20261009.md) and earlier reports preserve their original observations. New raw evidence is in [one verified archive](darija-answer-closeout-20261009.zip); earlier snapshots remain in [the previous archive](darija-remaining-regression-20261009.zip) and [the preceding archive](darija-filtered-regressions-20261009.zip). Reports include entry hashes and offline replay commands.

Useful comparisons:

- [Previous Jev coverage](darija-jev-coverage-v6-results-20261008.md)
- [Jev-first router fixes](darija-jev-first-fix-results-20261008.md)
- [GPT-OSS 120B router check](darija-router120-check-results-20261008.md)
- [GPT-OSS 20B router check](darija-router20-repeat-results-20261008.md)
- [Original Darija selection comparison](darija-selection-results-20261008.md)

## Recovering historical evidence

All 728 original files were saved in a ZIP outside the project and verified
against their SHA-256 hashes before any removal:

`C:\Users\pc\Documents\SchoolBenchmarkArchives\chatbot-latency-20261008-210143.zip`

ZIP SHA-256: `B7518DB516B3211B22CBF79A883A33589730B49DE0315E7E0ABA50CECFE27041`.
The ZIP is 4.79 MiB. This local backup is not required to build or test the project.

The same original files are available in published Git commit
`e49f51ff9751bfb9eae9bb6429b68388976baa56`. Restore an individual historical
input before rerunning an older study that needs it:

```powershell
git restore --source=e49f51ff9751bfb9eae9bb6429b68388976baa56 -- docs/evidence/chatbot-latency/<filename>
```

Older planning documents may link to archived files; use the ZIP or that commit
to recover them. New benchmark runs should keep their final report and necessary
raw evidence, and archive intermediate snapshots after verification. Temporary
Next builds are removed after validation.

Verification: the 556-test script suite initially identified two missing
historical dependencies. Those files and the other indirect study dependencies
were restored; both affected test files subsequently passed (45 tests). All
other 554 checks passed in the full run. No application code or dataset changed.
