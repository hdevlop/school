/**
 * Tools offered alongside a routed tool (najm-rag `toolRouting.dependencies`):
 * when routing picks a key, the model also gets the tools listed for it,
 * usually the read that returns an ID the key's tool needs.
 * `tests/chat/ToolDependencies.test.ts` checks every name is a registered MCP tool.
 *
 * A named student is found with search. The full student list is not a
 * dependency: when search found nothing, the model read all of it (112k
 * characters, about 50k tokens) looking for the name. Class-wide work still
 * reaches section and class student tools through routing.
 */
export const TOOL_DEPENDENCIES: Record<string, string[]> = {
  'student-profile_get_academic': ['students_get_my_identity', 'parents_get_my_identity', 'parents_get_children', 'student-profile_get_overview', 'student-profile_get_attendance_summary'],
  'student-profile_get_overview': ['students_get_my_identity', 'parents_get_my_identity', 'parents_get_children', 'student-profile_get_academic', 'student-profile_get_attendance_summary'],
  'student-profile_get_attendance_summary': ['students_get_my_identity', 'parents_get_my_identity', 'parents_get_children', 'student-profile_get_academic'],
  'parents_get_my_identity': ['parents_get_children'],
  'parents_get_children': ['parents_get_my_identity', 'student-profile_get_academic'],
  // Family reads take the signed-in parent's or a child's ID, so the model
  // needs the identity reads that return it.
  'parent-profile_get_all_fees_due': ['parents_get_my_identity'],
  'parent-profile_get_unread_alerts': ['parents_get_my_identity'],
  'parent-profile_get_all_upcoming_events': ['parents_get_my_identity'],
  homework_get_by_student: ['students_get_my_identity', 'parents_get_my_identity', 'parents_get_children'],
  'student-profile_get_financial': ['students_get_my_identity', 'parents_get_my_identity', 'parents_get_children'],
  'students_get_my_identity': ['student-profile_get_overview', 'student-profile_get_academic', 'student-profile_get_attendance_summary'],
  'teachers_get_my_identity': ['teacher-profile_get_my_classes', 'teacher-profile_get_my_students', 'teacher-profile_get_pending_grading'],
  'teacher-profile_get_pending_grading': ['teachers_get_my_identity'],
  'teacher-profile_get_schedule_today': ['teachers_get_my_identity', 'teacher-profile_get_pending_grading'],
  'teacher-profile_get_my_students': ['teachers_get_my_identity', 'teacher-profile_get_my_classes', 'teacher-profile_get_pending_grading'],
  'teacher-profile_get_my_classes': ['teachers_get_my_identity', 'teacher-profile_get_my_students', 'teacher-profile_get_pending_grading'],

  // Subject-filtered teacher replies join scoped assignment IDs to the catalog.
  teachers_get_teachers: ['subjects_get_subjects'],
  attendance_mark: ['search_search_students'],
  grades_get_student_report: ['search_search_students'],
  grades_get_by_student: ['search_search_students', 'student-profile_get_academic', 'student-profile_get_attendance_summary'],
  grades_create: ['search_search_students', 'assessments_get_all'],
  attendance_get_by_student: ['search_search_students'],
  // "Yesterday" or "last Monday" routes like "today"; the date tool answers it.
  attendance_get_today_students: ['attendance_get_by_date'],
  attendance_get_today_all: ['attendance_get_by_date'],
  attendance_get_by_date: ['attendance_get_all'],
  // Class lists include section names; section discovery must offer that read.
  sections_get_sections: ['classes_get_classes'],
  sections_get_students: ['classes_get_classes', 'sections_get_sections', 'students_get_students'],
  classes_get_class_students: ['classes_get_classes', 'sections_get_sections', 'students_get_students'],
  classes_get_class_student_count: ['classes_get_classes'],
  grades_get_by_section: ['classes_get_classes', 'sections_get_sections', 'subjects_get_subjects', 'grades_get_all'],
  grades_get_by_subject: ['classes_get_classes', 'subjects_get_subjects', 'grades_get_all'],
  grades_get_all: ['classes_get_classes', 'sections_get_sections', 'subjects_get_subjects'],
  // One test's or exam's results need its ID: the class's own list (about
  // 10 KB), never the year's 222 exams (160 KB, which left OSS20B unable to
  // reply). A teacher's marks need the teacher found by name.
  grades_get_by_exam: ['sections_get_sections', 'exams_get_by_section'],
  // A class test's marks start from the class's exam list (where its examId
  // is), which Jev picks first for 19 of 37 test-results questions; the results
  // read must come with it (2026-11-21).
  exams_get_by_section: ['sections_get_sections', 'grades_get_by_exam'],
  grades_get_by_assessment: ['sections_get_sections', 'assessments_get_by_section'],
  grades_get_by_teacher: ['search_search_teachers'],
  exams_get_upcoming_exams: ['exams_get_all'],
  // "This month" may retrieve today's exam tool; the list is needed to
  // apply a different date window without guessing teacher/class IDs.
  exams_get_today_exams: ['exams_get_all', 'exams_get_upcoming_exams'],
  fees_get_student_fees: ['search_search_students'],
  payments_get_by_student: ['search_search_students'],
  students_get_student_parents: ['search_search_students'],
  'student-routes_get_by_student': ['search_search_students'],
  'student-profile_get_transport': ['search_search_students', 'students_get_my_identity', 'parents_get_my_identity', 'parents_get_children'],
  // Personal records share vocabulary ("my record", "this year"). A grade
  // question can retrieve the attendance profile first; keep the academic
  // read available so the model can answer the requested part of the record.
  // Teaching assignments can retrieve a section or personal dashboard read.
  // The profile read takes the signed-in teacherId and checks ownership.
  sections_get_teachers: ['teacher-profile_get_my_classes'],
  'teacher-dashboard_get_overview': ['teacher-profile_get_my_classes', 'teacher-profile_get_pending_grading'],
};
