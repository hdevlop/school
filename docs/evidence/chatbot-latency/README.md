# Chatbot evidence

Active work: [Jev + router optimization plan](../../../CHATBOT-JEV-ROUTER-PLAN.md).
Validation: [Darija tool and answer checks](../../tests/jev-router-validation.md).

Keep these reports separate; their questions, roles and scoring differ:

- [Jev / router + OSS20B comparison](darija-combinations-results-20261009.md):
  60 chats on 20 reused Darija/Arabizi questions; tool plans 14/20, 17/20 and 17/20.
  All eight direct Jev replies are grounded; fallback answer defects remain.
- [Populated OSS20B answer quality](darija-20b-quality-results-20261009.md):
  12/24 factual/task passes across parent, teacher and student workflows.
- [Empty-reply safeguard](darija-empty-reply-fix-results-20261009.md):
  failed/empty output becomes a visible unavailable result, without retries.

The first two reports have a JSON summary and compact verified archive. The
safeguard has its JSON summary. Other retained JSON/JSONL files are historical
inputs referenced by executable studies or regression tests, including indirect
inputs resolved from their analyses. They remain unchanged to keep tooling working.
The Cerebras note is retained because the current provider config references it.

## Cleanup — 2026-10-09

The evidence directory fell from **208 files / 24.82 MiB to 54 files / 7.51 MiB**
before this index rewrite. Eleven obsolete chatbot test/review documents were
also archived. Current architecture, deployment, production-browser, local
embedding and other product documentation remains in place. Use the active
validation guide instead of the retired latency/native-collection work orders.

## Historical recovery

All 208 evidence files, 13 chatbot test documents and the old plan name were
backed up before removal. The verified ZIP has 223 entries, including a manifest
of paths, sizes, SHA-256 hashes and retention reasons:

`C:\Users\pc\Documents\SchoolBenchmarkArchives\chatbot-docs-20261009-132207.zip`

ZIP SHA-256: `f6e55ddfeebfc39a5011aa81557141aec128b35f5e08b5379f7257c2d0c1177c`.
This backup is outside the repository and is not needed for ordinary tests.
The same pre-cleanup documents are recoverable from published commit `601b779`:

```powershell
git restore --source=601b779 -- docs/evidence/chatbot-latency/<filename>
```

Use the corresponding `docs/tests/<filename>` path for an old guide. Restoring an
old study is optional; it does not create a new paid benchmark allowance.

The earlier 2026-10-08 cleanup archive remains available for files already absent
before this cleanup:
`C:\Users\pc\Documents\SchoolBenchmarkArchives\chatbot-latency-20261008-210143.zip`.
Its SHA-256 is `B7518DB516B3211B22CBF79A883A33589730B49DE0315E7E0ABA50CECFE27041`;
those original files also exist at commit `e49f51ff9751bfb9eae9bb6429b68388976baa56`.
Historical reports and retained worksheets may refer to those archived inputs.

New milestones should keep one final report and a compact archive. Remove
intermediates, private captures, owned hosts and generated builds after verification.

Cleanup verification: 561 script tests passed with zero failures; all 20 links
in the active plan, docs index and current validation/evidence guides resolve.
No application behavior, test corpus labels or retained JSON/JSONL inputs changed.
