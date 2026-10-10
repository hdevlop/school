/** Shared Decisions protocol. No network, settings, authorization or tool execution. */
export interface JevDecision {
  choice: JevIntent; confidence: number; topProbability: number;
  probabilities: Record<JevIntent, number>; writeProbability: number;
  model: string;
}
export const JEV_MODEL = 'typesafe/jev-1.13';
export const JEV_DECISIONS_URL = 'https://openrouter.ai/api/alpha/decisions';

// Classification choices; supported shortcuts are defined in jevReplyPlan.ts.
export const INTENTS = {
  small_talk: 'Only a greeting, thanks, goodbye, or a question about what the assistant can do. No request for school data.',
  student_count: 'Asks only how many students are enrolled in the whole school this year: one number, not a list of students, with no filter by class, section, gender, status, date or anything else.',
  teacher_count: 'Asks only how many teachers the whole school has: one number, not a list or names of teachers, with no filter by subject, class or anything else.',
  student_and_teacher_count: 'Asks for both the total number of students and the total number of teachers, with no filter.',
  class_list: "Asks to list or name the school's classes, with no filter and no question about their students, teachers or timetable.",
  attendance_today: "Asks to see today's attendance for the whole school (who is present or absent today), with no class, student or other date, and not a number to compute.",
  upcoming_exams: 'Asks which exams are coming up or when the next exam is, for the whole school, with no class, subject or student filter.',
  write_request: 'Asks the assistant to create, add, record, mark, change, publish, send or delete something now, for example to record a student as absent or present today, including short Darija commands. Asking how to do it oneself is not this.',
  needs_llm: 'Anything else: a question with a filter or qualifier (a class, a student, a name, a gender, a past or other date, last year, a number to compute), a list of teachers or students, '
    + 'grades, fees, payments, timetables, how-to questions, a short follow-up that starts with "and" (et, y, و, w) or needs an earlier message, unclear requests and topics unrelated to the school.',
};
export type JevIntent = keyof typeof INTENTS;
export const INTENT_NAMES = Object.keys(INTENTS) as JevIntent[];
