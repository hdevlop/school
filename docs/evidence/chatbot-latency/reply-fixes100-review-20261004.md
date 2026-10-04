# First reply-fix experiment — review, 2026-10-04

This intermediate prompt was **rejected and corrected**, not accepted as the
final change. All 100 requests completed; 97/100 original automatic checks
passed. The same corpus, pins, saved model and non-prompt configuration hashes
match the previous baseline. Fresh-cache/correlation checks passed 100/100.

| Measure | Previous baseline | First fix |
|---|---:|---:|
| Overall completion p50 / p95 | 8.235 / 27.273 s | 6.597 / 18.242 s |
| Overall first text p50 / p95 | 6.053 / 11.413 s | 4.660 / 14.435 s |
| Exam completion p50 / max (10 samples) | 27.273 / 32.840 s | 15.068 / 33.240 s |
| Exam visible answer length p50 | 1,277 characters | 504 characters |
| Exam reported completion tokens, total | 6,234 | 6,315 |
| Attendance-write promises | 1 of 6 | 0 of 6 |
| Installed estimated cost | $0.015093 | $0.016263 |

Visible exam text shrank 61%, but billed completion tokens did not shrink;
the metadata does not split visible and reasoning tokens. The slower English
exam repetition waited 26.198 s for first text. Timing changes cannot be wholly
attributed to the prompt: runs were sequential and provider scheduling, prompt
cache and host selection were uncontrolled. Proposed latency gates still fail.

Direct agent review against internal read-only exam facts found:

- All six attendance-write replies explicitly refused chat writes, redirected to
  the dashboard, and asked for no ID/confirmation or lookup for a write. Two
  English, two Arabic and two Darija cases; the original corpus has grade writes
  instead of attendance writes in French/Spanish. Darija register quality still
  needs native-speaker review; one reply used Modern Standard Arabic.
- All ten exam answers used real dates, start/end times and class/section pairs
  in chronological order. Subject/title differences already exist in the seeded
  records (e.g. “Language exam” has subject “Mathématiques”); answers must preserve
  them rather than infer a different subject from the title.
- `upcoming-exams-ar#1` invented a total of 13; authoritative total is 12.
  `upcoming-exams-fr#2` said nine remain after showing five; actually seven remain.
  Original automatic checks only require the read tool and missed both errors.
- `upcoming-exams-es#1` showed ten rows rather than the requested maximum five;
  `upcoming-exams-es#2` omitted the newly requested total. These are response
  format deviations, not incorrect row facts.
- Three inconclusive automatic language results are actual Spanish on direct
  agent review: `classes-es#1`, `classes-es#2`, and `teacher-count-es#2` (“La escuela
  tiene **50 profesores**.”). Stored French class descriptions and too few unique
  detector words explain the flags. The original scorer and raw failures remain
  unchanged; agent review does not retroactively turn 97/100 into 100/100.
- One tool error occurred on `attendance_get_today_students` in the second
  Arabic attendance-read request. A second call executed successfully and
  returned an empty list; the reply reported no recorded attendance for today.

The final prompt removes inferred totals/remaining counts and strengthens the
five-item instruction. The ten-request exam recheck and subsequent model
comparison use that corrected prompt; keep this rejected run as evidence.

Evidence: [raw run](reply-fixes100-fresh-20261004.json),
[derived comparison](reply-fixes-analysis-20261004.json),
[authoritative facts](reply-fixes-facts-20261004.json),
[recheck plan](reply-fixes-exam-recheck-plan-20261004.md).
Language/factual review above is by the coding agent, not independent human
or native-speaker acceptance. Full-role and production verification remain.
