# Live role/follow-up smoke — 2026-10-06

Twelve serial chats completed on a separate local instance at port 3103 using
the current published pins, saved GPT-OSS model and unchanged Cerebras/fallback
policy. The user's app at port 3102 remained running. Fresh private fixtures came
from selected-year internal MCP/REST reads; no school records or settings were
changed. Chat sessions were created as part of the test. Jev remains off.

**Automatic checks passed 10/10; assistant review passed 9/10.** This run does
not pass complete reply accuracy. `parent-other-absences-ary` claims no absence
records/date although the scoped student search returned no match. A failed
lookup does not establish empty attendance. The original automatic result is
preserved alongside the separate review; no paid recheck was performed.

| Measurement | Result |
|---|---:|
| Outer chat attempts | 12 of 12 |
| Chat completion mean | 1.253 s |
| Chat completion p50 / p95 | 0.986 / 3.584 s |
| Complete correlated diagnostics | 12/12, no duplicate IDs |
| Routing embedding calls / attempts | 12/12; all cache misses, complete capture |
| Declared client cost estimate | $0.019637350 |
| Delayed selected-key window increase | $0.017480950 |
| SDK cost estimate | $0.002314881 |
| Unknown cost / retained reserves | 0 / $0 |

These are per-turn HTTP/body durations, excluding diagnostic retrieval. The two
follow-up scenarios each have separate records for both turns. Twelve samples
are a smoke check, not a stable p95 estimate, browser timing or production SLA.
Application caches were uncontrolled; observed routing calls all missed.

The client allowance was $0.10 with $0.005 reserved before each chat. Declared
rates use independent maximum input/output prices across current non-Groq
catalog endpoints because fallbacks remain allowed. Those estimates and the
SDK's much lower estimate are separate from actual billing. The selected key
was verified against the environment key and had an existing $50 limit, rather
than a hard $0.10 provider cap. Its immediate window delta was zero; a later
read showed the increase above. Other traffic and per-generation host/cache
charges are not isolated, so this is not an attributed run invoice.

Review details:

- No forbidden student IDs, full names or parent phones were detected in tool
  outputs for the configured outsider cases. This narrow check does not cover
  every ownership/year denial or infer global authorization correctness.
- Parent names matched the scoped fixture/context; the attempted
  `parent-profile_get_children` call was denied by its finance guard. The answer
  used children already provided in authorized parent context. Terminal
  diagnostics retain one tool error, although the UI stream exposed it through
  a tool-output event and the old scorer called it `output`. Avoid that
  irrelevant finance-profile selection; preserve its guard.
- The teacher count matched its four scoped students. The student's report had
  zero grades. Postflight read-only MCP facts matched all four admin grade rows,
  marks/totals, titles and dates; all twelve attendance rows were present.
- English, French, Spanish and Arabic replies had no identified language defect
  in this assistant review. The Darija not-found/empty-attendance conflation
  failed; independent native fluency review remains absent.

[Redacted original runner report](role-live-run-20261006.json),
[separate analysis/review](role-live-analysis-20261006.json) and
[verification](role-live-verification-20261006.json) preserve measurements,
automatic results, anonymized transcript and source/private-evidence hashes.
Private identities, credentials and raw text/facts were removed after review.
The task instance was stopped; the original app remained available.

All twelve paid slots are consumed. Next: correct the unverified absence claim,
add scoring regressions for failed lookups and terminal tool errors, then declare
a separate bounded recheck. This run grants no additional paid allowance or
rollout approval and does not change the existing Jev/native gates.
