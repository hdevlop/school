> Preserved reference from the retired root acceptance plan. This text is retained verbatim below for traceability, including its old status, section numbers, paths and commands. It is not a current execution result. Use the [production browser index](../README.md), [preflight](../00-preflight.md) and [current runner status](../automation-and-release.md) before execution. Local/database obligations remain open; production smoke does not satisfy them.

## 13. Evidence ledger

Maintain one row per tester attempt:

| Field | Required value |
| --- | --- |
| Candidate | Full commit SHA or explicitly recorded worktree state |
| Build provenance | Candidate fingerprint and fresh runner-owned build result |
| Role handoff | Named coder and named tester |
| Environment | Disposable local label or exact remote origin/revision |
| Selection | Exact grep/title range and expected/actual count |
| Command result | Native exit code, summary and duration |
| Unit result | `PASS`, `FAIL`, `NOT RUN` or `EXCLUDED BY GREP` |
| Diagnostics | Unexpected page/console/request/response counts |
| Cleanup | Counts only; exact namespace removed or remaining |
| Process teardown | Owned process stopped and runner port confirmed free |
| Artifacts | Redacted files retained and secret scan result |
| Classification | `TEST`, `PRODUCT`, `RUNNER` or `ENVIRONMENT` |
| Next owner | Coder, tester or blocked external environment |
| Deployment | `NOT REQUIRED`, or exact deployed healthy revision |

Do not record passwords, cookies, tokens, generated emails/phones, personal
data, raw response bodies or database connection values.

## 14. Completion definition

This plan is complete only when:

- Gate A auth passes completely before any feature promotion;
- forgot-password, reset/invite and every seeded login role pass Gate A;
- every B-I matrix row has traceable source/server, UI-contract and connected
  evidence appropriate to its surface;
- the J responsive/localization/accessibility matrix passes once across the
  accepted feature set;
- real-database financial, transaction, uniqueness and seed guarantees pass;
- all supported mutations are cleaned through exact fixture ownership;
- full connected acceptance passes with one worker, zero retries and passive
  diagnostics;
- required guarded remote smoke passes against the exact healthy revision;
- every tester attempt has a sanitized ledger entry;
- no secret or runtime identity is retained in committed evidence;
- test-only commits are verified without application deployment;
- runtime changes are deployed and revision-verified before remote proof;
- the final root gate and schema-drift check pass at the accepted candidate.
