import { Can, own, join, where } from '../../auth';
import { composeGuards } from 'najm-guard';
import { disciplineIncidents, parents, studentParents, students } from '../../database/schema';

/** Teachers see the incidents they reported; students their own; parents their children's. */
export const Discipline = own(disciplineIncidents)
  .for('teacher', where(disciplineIncidents.reportedBy))
  .for('parent',
    join(disciplineIncidents.studentId, students.id),
    join(students.id, studentParents.studentId),
    join(studentParents.parentId, parents.id),
    where(parents.userId),
  )
  .for('student',
    join(disciplineIncidents.studentId, students.id),
    where(students.userId),
  );

export const canReadDiscipline = composeGuards(Can('read:discipline'));
export const canCreateDiscipline = composeGuards(Can('create:discipline'));
export const canUpdateDiscipline = composeGuards(Can('update:discipline'));
export const canDeleteDiscipline = composeGuards(Can('delete:discipline'));
export const canResolveDiscipline = composeGuards(Can('resolve:discipline'));
