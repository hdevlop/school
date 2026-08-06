import { Service, Err, I18n } from '@server/najm';
import { SubjectRepository } from './SubjectRepository';

@Service()
export class SubjectValidator {
  @I18n('subjects.errors') private t!: (key: string) => string;

  constructor(private subjectRepository: SubjectRepository) {}

  async ensureExists(id: string) {
    const subject = await this.subjectRepository.getById(id);
    if (!subject) Err(404, this.t('notFound'));
    return subject;
  }

  async ensureCodeUnique(code: string, excludeId?: string) {
    const existing = await this.subjectRepository.getByCode(code);
    if (existing && existing.id !== excludeId) {
      Err(409, this.t('codeExists'));
    }
  }

  async ensureNameUnique(name: string, excludeId?: string) {
    const existing = await this.subjectRepository.getByName(name);
    if (existing && existing.id !== excludeId) {
      Err(409, this.t('nameExists'));
    }
  }

  async ensureExistsByCode(code: string) {
    const subject = await this.subjectRepository.getByCode(code);
    if (!subject) Err(404, this.t('notFound'));
    return subject;
  }

  async ensureExistsByName(name: string) {
    const subject = await this.subjectRepository.getByName(name);
    if (!subject) Err(404, this.t('notFound'));
    return subject;
  }
}