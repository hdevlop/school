# Chatbot benchmark evidence

This folder keeps current Darija/Jev evidence, the useful comparison reports and
historical inputs required by executable scripts or regression tests. Test-question
datasets remain in `datasets/chatbot-latency/`.

On 2026-10-08, 572 historical/intermediate files were archived out of this folder.
The evidence footprint fell from 728 files / 66.29 MiB to 157 files / 21.96 MiB,
including this index. Historical inputs loaded indirectly by regression tests
were retained too. No benchmark result was rewritten or recomputed.

Start with [the latest Darija routing report](darija-remaining-filters-results-20261009.md). It records 99/100 tool plans, 4/4 previous failures fixed, 36 passing live requests with Jev off and zero model calls, plus concrete next actions. General Jev enablement remains unqualified. [The previous report](darija-final-filters-results-20261009.md) preserves the 96/100 result.

New raw observations are in [one verified compressed archive](darija-remaining-regression-20261009.zip). The preceding two runs remain in [their verified archive](darija-filtered-regressions-20261009.zip). Reports contain entry hashes and offline replay commands.

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
