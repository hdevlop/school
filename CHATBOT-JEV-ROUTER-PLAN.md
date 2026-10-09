# Jev + router optimization plan

Updated: 2026-10-09. Status: **comparison phase closed; implementation plan active**.
Target: local replies and guarded Jev for supported requests, the existing router
for discovery and fallback, and **GPT-OSS 20B only when a model is necessary**.
This document replaces the historical latency work orders. It defines planned
changes; rewriting it does not enable Jev or change the production model.

## Goals and boundaries

- Correct tools, arguments and answers for Moroccan Darija and Arabizi come first.
- Retain the existing router and one authorized MCP execution path.
- Avoid paid classification for requests that cannot produce a supported Jev plan.
- Avoid a generation call when a verified tool result can use a local reply.
- Target an average complete reply under two seconds. Record timing; do not reject
  an otherwise correct answer at two seconds or tune for millisecond differences.
- Work within the owner's **$10/month school-wide budget**, including students
  and staff. Parents' usage also belongs to that total. Low per-request prices
  alone do not establish a monthly usage allowance.
- Concentrate new evaluation on Darija/Arabizi. Keep existing French regressions;
  do not launch another paid French or provider-comparison campaign.

## Completed phase

The latency/provider comparison and framework publication work is closed.
Published Najm integration, local replies, guards, diagnostics and the existing
router are the starting point. Historical failures remain in their reports.

| Current evidence | Result | Meaning |
| --- | --- | --- |
| Router + OSS20B, 20 reused Darija cases | 14/20 tool plans; 1.242 s average | Baseline for targeted fixes |
| Jev first + router/20B fallback, same cases | 17/20; 1.247 s | Preferred candidate flow |
| Router first + Jev/20B, same cases | 17/20; 1.174 s | Tied accuracy; no demonstrated advantage from routing first |
| Direct Jev replies across both hybrids | 8/8 grounded answers | Narrow supported coverage, not global reliability |
| Populated parent/teacher/student 20B review | 12/24 factual/task passes | General 20B replacement remains unqualified |

The latest run made 60 actual chats on 20 questions, with four direct Jev replies,
14 model replies and two local write refusals per hybrid. All 60 responses were
reviewed, but the tool-plan scores are not full-answer or native-fluency scores.
No wrong Jev plan was accepted in that run. Empty fixtures and reused questions
cannot qualify populated personal workflows or estimate real-user accuracy.

References: [three-path comparison](docs/evidence/chatbot-latency/darija-combinations-results-20261009.md),
[populated answer-quality review](docs/evidence/chatbot-latency/darija-20b-quality-results-20261009.md),
[retained evidence and recovery](docs/evidence/chatbot-latency/README.md).
Use the [current validation guide](docs/tests/jev-router-validation.md) for execution.

**Current runtime:** saved model remains 120B and general Jev is off. Jev requires
server-issued synthetic benchmark context and currently admits admin/principal,
web, complete-history first-turn requests. Existing experimental 20B/CoreWeave
routing is also fixture-bound. Normal-chat integration and other-role eligibility
must be implemented explicitly; changing an environment flag alone is insufficient.

## Target request flow

1. Resolve the signed-in actor, permissions, selected academic year and trusted
   conversation context on the server. Apply existing write/year restrictions.
2. Return an existing validated local reply or ask for a missing identity/filter
   when the request is already understood. A clarification does not need an LLM.
3. Check whether any supported Jev plan could be valid for this query and role.
   If provably unsupported, bypass Jev. Otherwise classify with Jev and apply the
   existing confidence, probability, write-intent and query guards.
4. For an accepted plan with complete, authorized arguments, execute through the
   existing MCP path and render only its actual result using a short local reply.
5. On a decline, unsupported request, provider failure or unavailable plan, use
   the existing router's tool shortlist. A shortlist is candidate discovery, not
   an executed tool decision. Reuse an existing validated resolver/reply when possible.
6. If interpretation or tool selection still requires a model, use OSS20B with
   the routed tools and minimal necessary context. Validate tool names/arguments,
   keep execution under existing guards, and render the resulting facts accurately.
7. If information, access or provider response is unavailable, return the specific
   clarification/refusal/unavailable result. Do not invent facts or silently retry.

Jev selects a closed intent; School maps it to tools and renders the answer.
It is not treated as a general prose model. The target flow does not start a GPT
answer in parallel with every Jev request and has no automatic 120B escalation.
A failed tool execution must not cause the same reads to be repeated blindly on fallback.

Examples:

| Request | Intended handling |
| --- | --- |
| “فالمدرسة شحال كاينين ديال التلاميذ كاملين؟” | Local reply if already recognized, otherwise Jev → authorized count → template |
| “ch7al mn tilmid f l9ism lkhamis bo7do?” | Resolve the actual class; clarify if missing; scoped read, then template or 20B as needed |
| “وريني نقط بنتي” | Resolve linked child from authenticated context, or ask which child; never search for the literal word “daughter” |
| “zid tilmid jdid daba” | Existing read-only write refusal; no classification or generation required |

## Work order

Complete these phases in order. Each phase has one concrete output and targeted
verification; routine implementation should continue without repeated “continue”.

### P1 — Eliminate unnecessary Jev calls

- [ ] Add a conservative prefilter before transport: skip only when all supported
      intent guards veto the request. An uncertain query must not be discarded
      merely because a new keyword rule fails to recognize it.
- [ ] Preserve role, history, language, cancellation and budget checks. Unknown
      language can bypass Jev safely while the ordinary Darija flow is improved.
- [ ] Record why Jev was skipped or declined, which path answered, and whether a
      model was invoked; keep personal text and tool payloads out of diagnostics.
- [ ] Prove unsupported requests make zero Jev calls and previously valid guarded
      candidates remain reachable. Keep shadow-study behavior explicit.

Primary files: `JevIntentClassifier.ts`, `jevQueryGuard.ts`, `jevGuard/`,
`SchoolReplyLanguage.test.ts`, `JevAdapter.test.ts` under the existing chat module/tests.
Output: fewer paid classifier attempts without losing valid supported plans.

### P2 — Repair tool and argument selection

- [ ] Distinguish class identities from section labels for Arabic and Arabizi;
      use actual discovery results before choosing class/section IDs.
- [ ] Resolve fifth-class requests without choosing an arbitrary section or adding
      a gender filter. An unresolved class requires clarification, not zero students.
- [ ] Resolve child identity using the signed-in role and owned records. Ask which
      child when needed; do not fabricate an ID, search for “bnti”, or claim an
      input error means the grades tool or permission is absent.
- [ ] Repair subject/class grade queries and pending-grading tool offers from the
      populated review. Keep grades separate from attendance.
- [ ] Reject malformed/unknown tool names and incomplete arguments before dispatch.
      Report the original failure even if a later model step recovers.
- [ ] Tune Jev wording only on development cases, preserving finite values in
      [0,1], confidence thresholds and independent write-intent agreement. Extend
      the supported menu only with a scoped tool plan, renderer and passing cases.

Primary files: `ragConfig.ts`, `jevRuntimeWording.ts`, `jevReplyPlan.ts`,
`schoolReplyTemplates.ts`, `schoolReplyContext.ts` and existing role reply helpers.
Output: corrected failures, with the same authorized executor and year ownership.

### P3 — Make answers faithful and fallback selective

- [ ] Prefer a local renderer after validated reads; preserve subject names, grade
      denominators, class/section identity and requested filters.
- [ ] Distinguish no records from a failed read, and today's/upcoming results from
      whole-year results. Never infer a zero count from an unresolved identity.
- [ ] Improve short Arabizi language handling; avoid French/English fallthrough,
      echoed planning text and internal tool instructions in ordinary answers.
- [ ] Use OSS20B only where the verified local/Jev path cannot answer. Maintain
      explicit unavailable outcomes and cancellation; do not count a visible failure
      notice as a correct answer or introduce automatic retries.

Output: facts and task fulfillment pass independently of the tool-plan score.

### P4 — Integrate and enable the qualified flow

- [ ] Build trusted request context for ordinary signed-in chats using the existing
      framework preparation contract. Keep benchmark grants restricted to tests;
      never trust client-supplied role, year or claims that history is complete.
- [ ] Enable only validated roles/intents. Parent, teacher and student tools require
      their own populated ownership tests; broad admin tools do not become personal tools.
- [ ] Configure the normal fallback model as `openai/gpt-oss-20b` and its compatible
      provider policy together. Do not reuse fixture-only experiment flags in production.
- [ ] Keep bounded cancellation/provider timeouts without a two-second accuracy
      cutoff. The 3,000 ms experimental Jev setting is evidence, not a selected
      production timeout; choose the operating timeout from corrected targeted checks.
- [ ] Apply a school-wide monthly spend guard to paid classification, generation
      and routing embeddings. Reserve uncertain/in-flight charges conservatively;
      exhausted allowance returns a clear local result. Existing fixture ledgers
      are not a durable monthly budget. Verify this offline, without another billing study.
- [ ] Record the release scope and rollback controls; deploy the qualified paths
      together. Turning Jev off alone must not remove the existing router fallback.

Output: an explicitly scoped release using Jev/router/20B, with the $10 budget
and rollback behavior enforceable. Historical 120B settings remain until this phase;
a deliberate rollback can restore them, but it is not a per-request paid escalation.

## Validation and finish criteria

Use existing Darija/Arabizi failures first. Freeze expected tools, argument scope
and factual outcomes before live dispatch. Validate with actual authenticated MCP
reads on populated fixtures; parent, teacher and student cases stay separate.

- Every previously failed case in the enabled scope passes both tool/argument and
  factual/task checks. Correct tools with wrong wording/facts remain failed answers.
- Zero accepted writes, outsider reads, wrong-year reads, guessed identities or
  malformed executed calls. Role/year refusal tests remain required.
- Every accepted Jev plan in the release check matches its intended authorized
  operation and facts. Report coverage and decline rate as well as accepted precision.
- Add a small unseen Darija/Arabizi holdout after development fixes. Keep families
  and authorship clear; do not describe assistant drafts as independent native evidence.
  Remaining failures keep that intent/role on the ordinary qualified fallback.
- Record complete-response average against the two-second goal, without ranking
  millisecond differences. An average over two seconds is an optimization finding,
  not permission to interrupt otherwise correct test answers.
- Verify paid-call avoidance, fallback reasons, monthly allowance and cancellation.
  No guarantee that $10 covers unlimited messages; report the configured allowance.
- Run the smallest relevant Bun tests first. Meaningful TypeScript changes require
  lint/typecheck; runtime changes require build and affected ownership/year/boundary
  checks. Read academic-year plan section 0 before changing scope or ownership.

Recheck affected families and roles; run wider regressions once the fixes pass.
Do not repeat a full provider/model/French benchmark without a concrete new question.
The assistant can draft new questions and continue the work; owner wording feedback
may improve them, but no new manual collection or “continue” loop is required.

**Finished means:** the enabled scope is explicit, its failures are corrected,
ordinary-chat integration works, OSS20B fallback is qualified for that scope,
budget/rollback checks pass, and one final report names any remaining unsupported
workflows. A rewritten plan or a classification score alone is not completion.

## Evidence and reporting rules

Keep one concise report and one compact verified archive per meaningful milestone.
Store test questions in the existing dataset directory. Delete private captures,
owned temporary hosts and generated builds after verification; leave other work intact.
Each report states: what changed, tool and fact results by role, remaining failures,
actual paid-call counts, average reply time, release status and the next concrete step.
Use response cost metadata for a brief cost line; keep unknown cost unknown. No
additional pricing research, invoice reconciliation or provider shopping is planned.

The former 167 KB plan remains in Git at commit `846a679`:
`git show 846a679:CHATBOT-LATENCY-PLAN.md`.
Historical native-research protocols and old numeric latency/sample gates remain
historical evidence; they do not add prerequisites to these engineering rechecks.
Native qualification must still be reported honestly if pursued separately.

**First action: implement P1, then repair P2's class and child-identity failures.**
