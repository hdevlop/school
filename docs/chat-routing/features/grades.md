# Feature brief: Grades (staff and teachers)

This brief is the only description of the feature that the phrase writer and the
test writer receive. Keep it about the need, never about test questions.

**Scope of this round:** questions asked by **staff and teachers** only. Parent
and student questions ("my son's marks") come in a later round.

## What the feature answers

Marks that are already recorded: one student's marks, a student's report card,
a class or section's marks (optionally in one subject), marks in one subject
across the school, the marks a teacher has given, the results of one test or
one exam, averages and pass rates, and which tests a teacher still has to mark.

The chat only **reads**. Entering, changing or deleting a mark is refused.

## Who asks, and what they can see

| Role | Can read grades | Sees |
| --- | --- | --- |
| admin, principal, registrar | yes | the whole school |
| supervisor, monitor | yes | the classes they manage |
| teacher | yes | marks of their own tests and exams, and of students in sections they teach |
| accounting, secretary, assistant | **no** | nothing: the chat must say they have no access |

## Tools

All are read-only. The name before `_` is the module.

| Tool | Returns | Typical need |
| --- | --- | --- |
| `grades_get_by_student` | every mark of one student (needs the student; a name is found with search first) | "marks of ABID Amine", "how is this student doing in maths" |
| `grades_get_student_report` | one student's report card: subject marks and test/exam results | "bulletin", "report card", "kachf nno9at" of a named student |
| `grades_get_by_section` | marks of one class/section, optionally one subject | "marks of 5AP B", "6AP results in French" |
| `grades_get_by_subject` | marks in one subject across the school | "all maths marks", "how did students do in Arabic" |
| `grades_get_by_teacher` | marks given in one teacher's tests and exams | "marks Mr Alami gave", "the marks I entered" |
| `grades_get_by_assessment` | results of one quiz, assignment or class test | "results of yesterday's quiz", "marks of the fard" |
| `grades_get_by_exam` | results of one exam | "results of the maths final", "who passed the exam" |
| `grades_get_all` | all marks of the selected year | "all grades this year" |
| `registrar-dashboard_get_overview` | grade totals, pass rate, grade distribution, monthly, class and subject averages (no individual marks) | "class averages", "pass rate", "which subject has the lowest average" |
| `academic-dashboard_get_kpis` | school KPIs, including average grade and pending grading count | "school average", "overall academic indicators" |
| `teacher-profile_get_pending_grading` | a teacher's tests that still have marks to enter | "what do I still have to mark", "tests without marks" |

Resolvers the router adds by itself (do **not** write phrases for them here):
`search_search_students`, `classes_get_classes`, `sections_get_sections`,
`subjects_get_subjects`, `teachers_get_my_identity`.

## Neighbouring features (must NOT match grades)

| Neighbour | Sounds like grades because | Real tool |
| --- | --- | --- |
| Exam calendar | "the exam", "lfard" — but asks **when** | `exams_get_upcoming_exams`, `exams_get_today_exams` |
| Today's tests | "forod lyom" — asks **which** tests, not their marks | `assessments_get_today_assessments` |
| Attendance | "results" of a student, "his record" — but absences | `attendance_get_by_student` |
| Class lists and counts | "grade 6", "6th grade" = a level, not marks | `classes_get_classes`, `students_get_student_count` |
| Teacher's timetable/classes | "my classes" | `teacher-profile_get_my_classes` |
| Massar sheets | Massar marks export, missing Massar marks | separate feature, later |
| Homework | "devoir" in French is also a test (devoir surveillé) | `homework_get_all` |

## Tricky words

- **notes** (fr) = marks, not written notes. **devoir / DS** (fr) = can be a graded test, or homework.
- **grade** (en) = a mark, or a class level ("grade 5"). Only the first is this feature.
- **نقطة / نقط / نقاط / nno9ta / nno9at** = marks. **المعدل / lmo3adal / moyenne** = average.
- **فرض / الفروض / lfard / lforod** = a class test: its date belongs to exams, its marks to grades.
- **النتائج / natija / résultats** = results: of an exam or test → grades.
- **كشف النقط / بيان النقط / bulletin** = report card.
- **نصحح / s7e7t / corriger** = marking work still to do → pending grading.
- **saisir / دخل النقط / sjjel nno9ta** = entering marks: a write, refused.

## Languages to cover

Darija in Arabic letters, Darija in Latin letters (3, 7, 9), Darija mixed with French,
formal Arabic, French, English, a little Spanish.
