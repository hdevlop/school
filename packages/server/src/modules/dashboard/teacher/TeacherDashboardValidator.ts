import { Err, I18n, Service } from '../../../najm';

@Service()
export class TeacherDashboardValidator {
  @I18n('teachers.errors') private tt!: (key: string) => string;
  ensureTeacherExists<T>(teacher: T | null | undefined) {
    if (!teacher) Err(404, this.tt('notFound'));
    return teacher;
  }
}
