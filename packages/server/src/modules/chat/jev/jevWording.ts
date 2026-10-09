import { JEV_MODEL, INTENTS } from './jevProtocol';

const INSTRUCTIONS = 'The message was typed by a school administrator in the chat of a Moroccan school management dashboard. '
  + 'It can be English, French, Spanish, Modern Standard Arabic or Moroccan Darija in Arabic or Latin script, or a mix. ';

export function buildDecisionRequest(query: string) {
  if (typeof query !== 'string' || !query.trim()) throw new Error('Query must be non-empty text');
  return {
    model: JEV_MODEL,
    state: query,
    questions: {
      intent: { type: 'choice', instructions: `${INSTRUCTIONS}Which kind of request is it?`, criteria: INTENTS },
      is_write: { type: 'noul', instructions: `${INSTRUCTIONS}Does it ask the assistant itself to create, add, record, mark, change, publish or delete data?`,
        criteria: { true: 'The user wants the assistant to make a change now.',
          false: 'The user only asks to see information, asks how to do something themselves, or makes small talk.' } },
    },
  };
}

/** Wording 5 serves guarded runtime reads; wording 3 remains the historical/default profile. */
export const JEV_WORDING_CANDIDATE_VERSION = 5;
export function buildDecisionRequestV5(query: string) {
  const request = buildDecisionRequest(query);
  request.questions.intent.criteria = {
    ...request.questions.intent.criteria,
    upcoming_exams: INTENTS.upcoming_exams + ' In Moroccan Darija, "imta lfard jay?" and "إمتى الفرض الجاي؟" ask when the next exam is; '
      + '"lforod jayin" and "الفروض الجايين" mean upcoming exams. A named subject or class still needs needs_llm.',
    student_and_teacher_count: INTENTS.student_and_teacher_count + ' "bo7do" / "بوحدو" means separately. '
      + 'Give two counts; adding them into one total or doing arithmetic needs needs_llm.',
  };
  request.questions.is_write.instructions = 'Does the message ask the assistant to CHANGE stored school data now? '
    + 'Decide by the requested action on records, not by command tone. Read, show, list, count and ask when are not changes.';
  request.questions.is_write.criteria = {
    true: 'Change records: add a student/teacher, edit a phone/class, record attendance, delete a payment/exam, or send/publish an announcement. '
      + 'Darija examples: zid tilmid jdid; beddel nmra; sejjel tilmid ghayeb; mse7 lfard; sifet i3lan. '
      + 'It is still a change when the target details are incomplete.',
    false: 'Only read existing information or ask how: show exam dates, ask when the next exam is, list classes, count students/teachers, '
      + 'or show attendance. Darija examples: 3tini 3adad tlamd; gouli ch7al mn tilmid; werini tawarikh dyal lforod; imta lfard jay. '
      + '3tini/gouli/werini alone do not change a record. Negated or quoted changes are not requests to execute them.',
  };
  return request;
}
