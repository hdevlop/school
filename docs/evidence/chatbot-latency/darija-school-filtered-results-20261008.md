# Guarded Darija filtered reads — 2026-10-08

All three targeted failures are fixed for their reviewed Arabic-script and Arabizi
wording. A live **Jev-off check passed all six requests**, with **zero Jev or GPT
calls**. These narrow requests now use guarded local reply plans; the existing
Jev classifier and acceptance threshold are unchanged.

| Request | New behavior |
| --- | --- |
| Maths-teacher names, q31/q32 | Read the subject catalog and authorized teachers. Match subject IDs against assignments scoped to the selected academic year; list each matching teacher once. A specialization label alone does not prove an assignment. |
| Girls-only count, q91/q92 | Read the authorized year roster, count unique female records and disclose missing/unknown gender. Never substitute the unfiltered student total. |
| What this parent paid this month, q93/q94 | Ask for the parent's name or ID before any payment read. No school-wide payment total is presented as that parent's result. |

Recognition is closed to these complete requests and a few explicit language
equivalents. Extra class/date/name qualifiers, arithmetic, quotations or mutations
stay outside these plans. Existing write refusals retain precedence. The maths
teacher routing dependency now includes `subjects_get_subjects`.

## Evidence and boundaries

The live fixture has eight students with unknown gender, and no subjects or
teachers. The girls reply therefore says the total cannot be confirmed; it does
not establish that the school has zero girls. The maths reply reports the missing
catalog information without inventing teacher names or inferring no assignment.

Populated synthetic HTTP/MCP checks cover all six requests for admin and principal
in two years: **24 checks**. They verify different year-specific girls counts,
actual maths assignment IDs, teacher deduplication and exclusion of a non-maths
teacher whose specialization says maths. Malformed rows/assignments and duplicate
identities are rejected; unknown gender cannot produce an unqualified exact count.

Parent, student and teacher accounts get no school-wide tool plan for these reads.
Their ambiguity questions still request identity. Nine role-specific chats and
nine direct MCP-denial checks passed. These are synthetic permission checks, not
qualification of general Jev routing or all personal profile flows.

A broader observational 20-chat Jev-first/20B run passed **18/20 tool plans**,
versus 17/20 previously. q32, q91 and q93 gained passing plans. Two previously
passing cases failed in this run:

- q30 arithmetic: the model emitted a malformed teacher-tool name containing a
  channel token, then called the correct counts. The failed tool event remains
  a failure in the score.
- q80 upcoming exams: Jev chose the correct intent at confidence 0.79, below the
  unchanged 0.8 threshold. The fallback read today's exams and answered about
  today instead of upcoming exams.

That run used 14 Jev replies, three local replies and three model replies, with
17 classification requests and eight generation calls. All response-reported
costs were known ($0.001402574); no generation IDs were unaccounted. Average
complete response was 0.646 s, observed without a time acceptance gate.

The initial 20-chat source manifest omitted the new filtered-renderer file. The
manifest was corrected afterward. The subsequent primary six-chat Jev-off check
froze all runtime sources, including that renderer, and verified no source change
or new provider call. The 20-chat raw observations are preserved unchanged; this
is not a controlled causal comparison, an independent native study or a new
100-question score. The earlier full score remains 80/100.

## Verification and next work

416 chat tests, 556 script tests and 13 chat-year checks passed. After the source
manifest correction, 21 protocol tests and the updated populated role checks also
passed. Root lint/typecheck, server test typecheck, workspace boundaries and an
isolated production build passed. The fixture was returned to Jev off, disabled
AI, key removed and 120B, then stopped. Both temporary Next directories were
removed; the normal app and its active `.next` were preserved.

Next, cover the arithmetic total and upcoming-exam fallback explicitly, then
repeat the full Darija regression set before considering a general Jev rollout.
Named-parent payment lookup still requires authorized identity resolution and
the correct parent/month filter; this change resolves the ambiguous request by
asking for identity. Normal Jev mode remains off.

Compact evidence:

- [Six live requests with Jev off, complete source manifest](darija-school-filtered-off-check-20261008.json)
- [Combined results and verification](darija-school-filtered-results-20261008.json)
- [20-chat raw run](darija-school-filtered-run-20261008.json)
- [20-chat recorded plan](darija-school-filtered-plan-20261008.json)
- [Provider call usage](darija-school-filtered-generation-usage-20261008.jsonl)
- [Unpaid fixture facts](darija-school-filtered-fixture-20261008.json)
- [Fixture cleanup](darija-school-filtered-cleanup-20261008.json)
