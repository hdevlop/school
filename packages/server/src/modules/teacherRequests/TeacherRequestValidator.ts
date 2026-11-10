import { Err, Service } from '../../najm';
import { I18n, type TFn } from 'najm-i18n';
import { TeacherRequestRepository } from './TeacherRequestRepository';

@Service()
export class TeacherRequestValidator {
  @I18n('teacherRequests') private t!: TFn;
  constructor(private repository: TeacherRequestRepository) {}

  async ensureExists(id: string) {
    const row = await this.repository.find(id);
    if (!row) Err(404, this.t('errors.notFound'));
    return row;
  }
}
