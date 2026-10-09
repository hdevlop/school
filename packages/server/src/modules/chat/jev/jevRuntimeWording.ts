import { buildDecisionRequest, buildDecisionRequestV5 } from './jevIntents';
import { queryVetoV6 } from './jevQueryGuard';

/** Profile 6: candidate wording 5 only for a positively guarded unqualified read. */
export const JEV_RUNTIME_WORDING_VERSION = 6;
const reads = ['student_count', 'teacher_count', 'student_and_teacher_count', 'class_list', 'attendance_today', 'upcoming_exams'];
export function jevRequestWordingProfile(query: string): 3 | 5 {
  return reads.some(choice => queryVetoV6(query, choice) === null) ? 5 : 3;
}
export function buildJevRuntimeDecisionRequest(query: string) {
  return jevRequestWordingProfile(query) === 5 ? buildDecisionRequestV5(query) : buildDecisionRequest(query);
}
