# Jev continuation accounting — 2026-10-05

The runner now reconstructs cumulative attempts and spending from earlier raw
reports before dispatch. The two previous core exploration legs remain unchanged;
this follow-up made no provider, School app, tool or database call.

## Changes

- Repeated `--resume-report` replaces unchecked nonzero `--skip-requests`.
  Reports must follow the exact case/repetition order with no gaps or retries.
- Corpus hash, request body, wording, policy, threshold, repetitions and
  classifier/eligibility sources stay frozen. Runner transport changes are
  recorded. New continuation reports link all prior report hashes.
- Raw reported costs and unknown reservations must match each settled budget
  snapshot. Earlier costs and reservations reduce the next leg's allowance;
  earlier attempts reduce its request cap. Neither cumulative ceiling may exceed
  the first report's allowance.
- Unknown costs block dispatch unless `--retain-unknown-costs` is explicit.
  That option keeps the reservations; it does not price those requests at zero.
- HTTP 429 stops dispatch even when its cost is known. Its status and retry
  header remain in the raw report; no automatic retry runs.
- `--preflight` checks these conditions offline, without a key or ledger read.
  Leg summaries remain separate; `cumulativeAccounting` carries total attempts,
  known spending and unresolved reservations into new reports.

## Actual saved-report preflight

| Quantity | Reconstructed value |
|---|---:|
| Earlier attempts | 61 |
| Known reported cost | $0.002325456 |
| Unknown attempts | 2 |
| Retained unknown reservations | $0.004 |
| Original cumulative spending stop | $0.02 |
| Remaining estimated allowance | $0.013674544 |
| Original cumulative request cap | 312 |
| Remaining attempts | 251 |
| Next scheduled case | `core3-ary-10#1` |

[Without acknowledgement](jev-resume-preflight-blocked-20261005.json), preflight
exits 1 with `retain_unknown_costs_not_acknowledged`.
[With retained reservations](jev-resume-preflight-retained-20261005.json), it
exits 0 and leaves both unknown costs unresolved. Both checks are offline.
The 2000 ms candidate spacing in these artifacts is a preflight input, not an
observed provider limit or a successful availability test.

## Verification and remaining work

`bun run test:boundaries`: **287 passed, 0 failed, 1,107 assertions**; workspace
boundaries passed across 1,275 files and 288 client entries.
`bun run lint`: passed. Mocked CLI tests exercise real prior legs, cumulative
request and spending stops, unknown-cost acknowledgement, preflight without a
key, known-cost throttling and zero unexpected fetches. Unit checks reject
changed inputs, broken report chains, duplicated/missing attempts, expanded
allowances and inconsistent budget snapshots.

[Verification metadata](jev-resume-verification-20261005.json) retains source
and historical evidence hashes. No production build was rerun for this change
to scripts, tests and documentation. Orderly stopped reports are supported;
attempts lost when a process is killed before saving are not recovered here.
Client reservations remain estimates, not provider billing ceilings.

Jev remains off. B0 still failed; the earlier partial study's 33 eligible
accepted questions across 15 families does not replace fresh native-authored
and reviewed acceptance. Provider stability and that larger validation remain
before runtime integration.
