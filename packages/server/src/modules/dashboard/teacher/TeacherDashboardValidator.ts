import { Err, Service } from '../../../najm';

@Service()
export class TeacherDashboardValidator {
  ensureTeacherExists<T>(teacher: T | null | undefined) {
    if (!teacher) Err(404, 'teachers.errors.notFound');
    return teacher;
  }
}
