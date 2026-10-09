# Fresh Darija and populated role checks — 2026-10-09

Keep the existing router and guarded local replies. Jev correctly classified
21/24 new synthetic Darija questions, but its guard accepted only 5/24 plans.
All five accepted plans matched the expected intent; the other 19 required
fallback. That coverage does not justify replacing the router.

The populated parent, teacher and student check passed 11/12 scenarios after
fixes, averaging 1.123 seconds for a full response. One teacher request for an
unauthorized student's grades ended with an empty reply. No protected data
was returned. The empty fallback remains a limitation for a general 20B rollout.

## What was measured

| Check | Observed result | Limit |
|---|---|---|
| Fresh Jev classification | 21/24 (87.5%) | Assistant labels; synthetic queries, no School reads |
| Guarded Jev plans | 5 correct, 0 incorrect accepted | 20.8% coverage; 19 fallback cases |
| Fresh Jev mean response | 0.459 seconds | Classification only, not full chat |
| Populated role scenarios, last run | 11/12 | Same questions reused for development verification |
| Populated role mean full reply | 1.123 seconds | One empty reply included in the average |
| Direct role boundaries, last run | 6 own reads allowed; 3 outsider and 3 historical reads denied | Existing authenticated accounts and internal MCP |

These are different questions and account scopes, not a head-to-head model
comparison. No French questions were benchmarked and no two-second cutoff
discarded slow answers. The earlier 100/100 development-corpus result remains
a separate observation; it is not a fresh accuracy score.

The 24 fresh Arabic/Arabizi questions form 12 paired families and have no
normalized duplicates in 23 previous corpora. No wording or Jev guard was
tuned on these questions after observing their results. Fresh08 and fresh12
declined class/exam requests; fresh24 guessed small talk for an ambiguous
question, which the guard vetoed. Independent native acceptance is not claimed.

Populated checks used an existing parent with two children and ten recorded
grades for the selected child; a teacher with 44 students across four classes;
and a student with ten grades and 13 attendance records. Jev was off for these
roles, as required by its current fixture-only administrator/principal scope.
An isolated Bun process on port 3103 used GPT-OSS 20B with CoreWeave only.
The saved School GPT-OSS 120B settings were read and left unchanged. Provider
observations confirm 20B/CoreWeave for the paid generations. No academic
records were created or changed; chats may create conversation bookkeeping.

## Fixes and scoring review

- Make academic profile reads available when routing retrieves an attendance
  profile, and distinguish academic marks from attendance percentages.
- Offer the teacher's class profile on section/personal-dashboard routing
  paths and identify the exact tool and authenticated teacher ID in context.
- Answer explicit requests for another academic year locally: personal roles
  receive the access restriction; eligible roles receive a dashboard selection
  instruction. The shared year boundary still owns access.
- Use guarded local reads/renderers for an unfiltered teacher's own student
  count and a student's own grades. Names and other qualifiers keep routing;
  malformed or mismatched results cannot produce invented facts.

All four 12-request runs are retained: strict scores were 8, 11, 10 and 11.
The first checker required exact profile tools: an own grade read through
`grades_get_by_student` and four classes returned by the teacher dashboard
were valid alternatives. Those original strict failures are preserved.
The third checker also rejected a correct “no absences” answer because it
required a literal `0`; the fourth checker accepts that wording. Empty replies
are genuine failures, including the remaining `teacher-outsider` case.

## Verification, evidence and next action

492 chat/year checks and 560 script checks passed, including budget-stop,
fresh-corpus and guard tests. Root lint, typecheck and production build passed;
workspace boundaries passed for 1,329 files. The test host is stopped,
51 private captures/credential files were removed, and the temporary build was
removed. Cleanup reclaimed about 1,012 MiB.

[Structured results](darija-fresh-populated-results-20261009.json) include
per-case outcomes, original run scores, provider usage with unknown costs
preserved, and archive hashes. [The verified archive](darija-fresh-populated-20261009.zip)
contains 36 entries in about 68 KiB: immutable public observations, prompt-free
provider records, role harnesses and frozen source snapshots. Private identities,
tool payloads and credentials are excluded. Extract it to an ignored cache
directory to inspect the original observations; a live role replay needs a new
private MCP capture and authentication. The fresh Jev CLI supports an offline
`--plan`; live `--execute` is another paid observation.

Next, address empty provider/fallback replies in the framework/provider path
before a general 20B rollout. Keep the current router and local replies while
doing that. Broader Jev intents need new independently reviewed Darija examples
and role-aware parameter planning; the current five accepted fresh plans support
a narrow helper, not a general tool selector. School runtime fixes are ready;
production model switching and broad Jev enablement are not part of this change.
