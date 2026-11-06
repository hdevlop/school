import { sql } from 'drizzle-orm';
import { own, when } from '../../auth';
import { massarSheets } from './massarSchema';
import { supervisesClass } from '../staff/supervisorScope';

/**
 * Teachers: their exact assignment. Supervisors: read their supervised
 * classes. Monitors, families and any other non school-wide role: nothing.
 */
export const MassarSheet = own(massarSheets)
  .for('teacher', when((userId: string) => sql`exists (
    select 1 from teacher_assignments assignment
    join teachers teacher on teacher.id = assignment.teacher_id
    join staff member on member.id = teacher.staff_id
    where assignment.id = ${massarSheets.teacherAssignmentId} and member.user_id = ${userId})`))
  .for('supervisor', when((userId: string) => sql`exists (select 1 from massar_classes mapped
    where mapped.id = ${massarSheets.massarClassId} and ${supervisesClass(sql`mapped.class_id`, userId)})`));
