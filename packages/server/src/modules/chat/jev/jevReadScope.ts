import { queryVetoV6 } from './jevQueryGuard';

export const ORDINARY_JEV_READS = ['student_count', 'teacher_count', 'student_and_teacher_count', 'class_list'] as const;
export function hasOrdinaryJevReply(query: string) {
  return ORDINARY_JEV_READS.some(choice => queryVetoV6(query, choice) === null);
}
