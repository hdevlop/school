# Focused live role recheck — 2026-10-06

**All six answers pass assistant review:** three parent-name replies match the
authorized child list, and three Darija replies report a scoped student lookup
failure without asserting empty attendance or inventing dates. Parent-name
replies made no tool calls. There were no terminal tool errors or blocks.

This is two known questions repeated three times, not six independent held-out
questions, a native-speaker fluency review or broad role/year acceptance. The
earlier [9/10 reviewed role run](role-live-results-20261006.md) remains unchanged.

| Measurement | Result |
|---|---:|
| Chats dispatched / planned | 6 / 6 |
| Assistant-reviewed answers | 6 / 6 |
| Original automatic checks | 5 / 6; one scorer false positive |
| Corrected offline scoring | 6 / 6; no added chats |
| Completion mean / p50 / p95 | 2.132 / 1.062 / 7.838 s |
| Complete correlated diagnostic captures | 6 / 6 |
| Routing cache misses / hits | 2 / 4 |
| Routing provider attempts | 2 |
| Declared client estimate | $0.007348900 |
| Later shared-key increase | $0.007972200 |
| SDK estimate | $0.000862211 |
| Unknown cost attempts / retained reserves | 0 / $0 |

The first parent-name reply took 7.838 seconds; later replies took 0.375–1.908
seconds. This small, uncontrolled-cache run does not establish a latency
improvement or reliable p95. Times measure per-turn HTTP/body completion and
exclude diagnostic polling; first-text/browser time and provider host/queue
attribution are absent.

The separately declared schedule allowed six chats, a $0.05 client-estimate stop
and $0.005 reserved per chat. Current non-Groq catalog maximum input/output
rates priced observed tokens, with the usual Cerebras/fallback policy retained.
The existing $50 key limit was verified, rather than a hard $0.05 run cap.
Immediate and five-second ledger reads showed zero increase; a later read showed
the increase above. A delayed zero window does not mean requests were free.
The key is shared, and catalog/SDK estimates do not isolate host/cache charges,
fees, omitted usage or unrelated traffic; the difference remains unallocated.

The original scorer falsely marked the first Darija answer wrong because it
treated “no student record” as “no attendance record.” Its Arabic/Darija pattern
now requires attendance words in the same negative clause. New regressions
accept the actual scoped student-record refusal while still rejecting the old
empty-attendance failure. The [original redacted report](role-recheck-run-20261006.json)
retains its 5/6 and `checks_failed` status. [Separate review and offline scoring](role-recheck-analysis-20261006.json)
record 6/6 using the confirmed empty-search contract; the old wire output was
not archived, so this is not described as a wire replay or fresh prospective
scorer validation.

The runner now accepts a closed `--case-ids` selection and `--repeat=1..5`.
It calculates both turns of follow-up cases before dispatch, checks the explicit
request cap and logs in only the required roles plus the diagnostic administrator.
Its default remains the original ten scenarios/twelve chats. Mock tests exercise
the focused schedule, unknown/duplicate cases and a cap too small for six turns.

[Verification](role-recheck-verification-20261006.json) records checks, source
hashes and retained historical artifacts. An additional script-suite run timed
out and left a lock for a dead mock-test process; its verified stale lock was
removed and affected tests rerun. This did not add paid chats.

The separate task instance was stopped; the original app at port 3102 remained
available. Private fixture identities and raw reply evidence were removed after
review. No school records, provider settings, package pins, guards or ownership
rules changed. The six paid slots are exhausted; there were no live retries.
Jev remains off. Broader role/year cases, native review, error/fallback conditions
and production/browser acceptance remain separate work.
