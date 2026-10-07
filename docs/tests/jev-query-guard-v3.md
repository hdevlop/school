# Semantic veto candidate and regression benchmarks

`scripts/chatbot-jev-query-guard-v3.mjs` is an offline candidate. It rejects
arithmetic, qualified counts, wrong count subjects and explicit school writes
before accepting a read shortcut. It builds on the preserved v1/v2 name/list
vetoes and adds narrow excluded-name grammar. No measured probability, label,
confidence threshold or original classifier wording is rewritten.

The shared School write predicate is in
`packages/server/src/modules/chat/schoolReplyWrite.ts`. Synchronous refusal
templates use it today in source; the prototype uses it for semantic vetoes.
Unknown/ambiguous wording keeps the normal model path. No mutation is executed.

For a reviewed same-corpus recheck:

```powershell
bun scripts/chatbot-jev-probe.mjs --cases=datasets/chatbot-latency/jev-fixes-regression100-20261007.json --acceptance-policy=core --query-guard-version=3 --connection-reuse=off --validate
```

`--query-guard-version=3` records the candidate's separate projection, leaving
raw classifier statistics intact. The default is `0` (no semantic-veto projection).
The raw probe still dispatches every selected question for controlled comparison;
it does not implement the School runtime or skip actual paid requests based on
the projected refusals. All paid runs require their own recorded request/budget
allowance. The completed regression allowance is exhausted.

Saved decisions can be replayed with no network or School calls:

```powershell
bun scripts/chatbot-jev-fix-study.mjs --out=<new-report.json>
```

The old count-v1 study keeps measured-source checks. A changed language/write
profile requires explicit `--current-reply-profile`; `--current-language-profile`
does not silently authorize changed refusal behavior. Outputs are exclusively
created and historical evidence is preserved.

Read the [fixes report](../evidence/chatbot-latency/jev-fixes-report-20261007.md)
for code changes, measured performance, coverage losses, test limits and next
actions. The [fresh-study specification](../evidence/chatbot-latency/jev-fixes-next-study-spec-20261007.json)
is a design, with no authoring completion, spending allowance or execution claim.
