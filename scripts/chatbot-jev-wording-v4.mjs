/** Unmeasured development candidate. The default probe still uses measured wording v3. */
import { buildDecisionRequest } from './chatbot-jev.mjs';

export const JEV_WRITE_WORDING_CANDIDATE_VERSION = 4;

export function buildDecisionRequestV4(query) {
  const request = buildDecisionRequest(query);
  request.questions.is_write.instructions += ' Classify the requested effect on stored school data, not imperative tone. '
    + 'A command to display, read, list, count or explain existing information is read-only. '
    + 'Quoted examples, negated changes and instructions about doing something oneself are not requests to execute a change. '
    + 'Use the operation and its object: showing an attendance register is different from recording an absence.';
  request.questions.is_write.criteria = {
    true: 'The assistant is asked to persist a change now: create, update, record, mark, delete, publish or send. '
      + 'Examples: "enregistre cet élève absent", "سجل غياب التلميذ", "سجل هاد التلميذ غايب", '
      + '"sjjel tilmid ghayb", "zid tilmid jdid", "beddel smit section". '
      + 'Do not treat a polite wording, question form or incomplete target details as read-only when a data-changing operation is requested.',
    false: 'No stored-data change is requested: show, list or count existing data, explain how, greet, or ask a follow-up that only requests existing information. '
      + 'Examples: "montre le registre de présence", "اعرض سجل الحضور", "وريني سجل الحضور", '
      + '"werrini sijillat 7odour", "bghit jouj a3dad dyal tlamid w l asatida", '
      + '"kan9elleb 3la mjmo3 tlamid", "3tini smiyat l a9sam", "kifach nsjjel lghiyab bo7di". '
      + 'Words such as bghit (want), 3tini (give me) and werrini (show me) do not by themselves request a mutation.',
  };
  return request;
}
