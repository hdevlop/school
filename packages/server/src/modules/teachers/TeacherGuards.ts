import { sql } from 'drizzle-orm';
import { Policy, CanList, CanRead, CanCreate, CanUpdate, CanDelete, join, own, where, when } from '../../auth';
import { staff, teachers } from '../../database/schema';
import { managesSection } from '../staff/floorManagerScope';
import { supervisesSection } from '../staff/supervisorScope';

export const Teacher = own(teachers)
  .for('teacher',
    join(teachers.staffId, staff.id),
    where(staff.userId),
  )
  // The teachers of a section in one of their classes.
  .for('floor_manager', when((userId: string) => sql`exists (select 1 from teacher_assignments assignment
    where assignment.teacher_id = ${teachers.id} and ${managesSection(sql`assignment.section_id`, userId)})`))
  .for('supervisor', when((userId: string) => sql`exists (select 1 from teacher_assignments assignment
    where assignment.teacher_id = ${teachers.id} and ${supervisesSection(sql`assignment.section_id`, userId)})`));
  // parent & student: no rules = automatic deny

export { Policy, CanList, CanRead, CanCreate, CanUpdate, CanDelete };
