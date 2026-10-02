# Academic-year and assistant release follow-up — 2026-10-02

This follows the local assistant acceptance in section 0.1j of the root plan
and the visual review. It preserves the implemented transport interval and
driver role-change rules. School-owner acceptance of those rules, every module's
appearance, the enrollment-status choices and closing old years remains open.

## Corrections from this review

- Qwen's default retrieval instruction refers to the user request rather than
  assuming every account is a teacher. Explicit environment overrides remain
  supported.
- Student-list metadata identifies a read-only operation and describes it in
  English, French and Arabic. Najm's existing router can retain that read tool
  when another candidate ranks first.
- `students_get_student_count` / `GET /api/students/count` returns the existing
  service/repository count with `@CanList()`, the selected-year boundary and
  ownership predicates. It precedes `/:id`; no year input or second resolver
  is added. The assistant uses this aggregate for totals instead of estimating
  from long lists. The initial French/Arabic list-count replies were incorrect
  (59/200 rather than 100/106); those runs are failed evidence.
- The widget waits for the existing client access token before mounting.
  Earlier fresh-page captures showed MCP 401s even after refresh; the final
  replay has no failed API requests.
- Finance Operations uses a shrinkable grid track and wrapping check details;
  phone payment amounts and panel borders are fully visible.

## Local evidence

| Check | Result |
| --- | --- |
| Frozen Bun installation | PASS; lockfile unchanged |
| Full `bun run check` | PASS: lint, all workspace typechecks, i18n, 964 configured tests, boundaries, isolated production build and migration check |
| Final source changes | PASS: lint, all workspace typechecks, 12 focused chat tests, another isolated production build (`.next-release-complete-20261002`) |
| Date/time-zone regression | PASS: 5 tests, including the Casablanca/UTC midnight boundary |
| Provider migration regression | PASS: 1 fixture test / 7 assertions; temporary table and transaction rollback preserve the real settings |
| Current database state | Read-only `school` check: 63 journal entries; provider is `text NOT NULL DEFAULT 'ollama'`; OpenRouter / GPT-OSS enabled |
| Count through REST and MCP | PASS: administrator 100 in 2024–2025 and 106 in 2026–2027; teacher 72, parent 1, student 1 in the active year; each matches that account's student list |
| Historical count for limited roles | PASS: teacher, parent and student receive HTTP 403 |
| French and Arabic model requests | PASS: both greetings and both exact selected-year count questions; no tool execution errors |
| Fresh browser replay | PASS: 30 captures/checks; French desktop 1366 px for 2024–2025 and 2026–2027, phone 390 px for 2026–2027; browser host time zone UTC |
| Chat in the actual widget | PASS: the two selected-year count requests return 100/106 through the widget; the year is carried in its API URL and switching year clears the prior messages |

The 10 replayed routes are Dashboard, Student Attendance, Behavior Rewards,
Calendar, Finance Operations, Fee Types, student fees, Payroll, student profile
and Settings. Each check asserts navigation, authorization state, document
overflow, untranslated catalog keys, console errors and unresolved API failures.
The final report contains zero failed requests and zero console errors.
Settings and payment-card phone screenshots were also inspected visually.
This focused replay supplements the earlier wider review; it does not replace
the owner's full visual acceptance.

| Final model case | First answer text | Complete response |
| --- | ---: | ---: |
| French greeting | 4.916 s | 4.947 s |
| Arabic greeting | 1.789 s | 2.237 s |
| French historical count: 100 / 2024–2025 | 2.649 s | 3.522 s |
| Arabic active count: 106 / 2026–2027 | 8.377 s | 8.571 s |

These are four local samples, not a latency guarantee. Initial long-list count
requests also took roughly 71–79 seconds and returned incorrect totals; the
aggregate tool avoids transferring those full lists for count questions.
One overlapping development-server restart interrupted a trial; interrupted
trials are not included in the passing samples.

Raw local evidence is ignored under `.cache/`: `release-chat-languages.json`,
`release-count-scope.json`, `history-playwright/release-20261002/report-partial.json`
and its screenshots, `release-chat-browser-proof.json`,
`release-20261002-final-check.log`, and
`release-last-gates.log`. Credentials and provider keys are excluded.

## Release boundary

Git publication, CI verification, image publication and live deployment are
separate proofs. The production workflow checks the exact release SHA at
`deployment-revision.txt`, both apex and www `/login` responses, and
`/api/health/status`. Its run and the final release response record those
results after publication. Local model acceptance does not establish production
provider credentials or embedding-service readiness. No provider secret is
copied into Git or the image by this release.
