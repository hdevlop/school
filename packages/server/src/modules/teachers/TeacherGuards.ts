import { Policy, CanList, CanRead, CanCreate, CanUpdate, CanDelete } from '../../auth';
import { join, own, where } from 'najm-auth';
import { staff, teachers } from '../../database/schema';

export const Teacher = own(teachers)
  .for('teacher',
    join(teachers.staffId, staff.id),
    where(staff.userId),
  );
  // parent & student: no rules = automatic deny

export { Policy, CanList, CanRead, CanCreate, CanUpdate, CanDelete };
