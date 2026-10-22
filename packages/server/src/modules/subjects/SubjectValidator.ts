import { Service, Err, I18n } from '../../najm';
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

  async ensureNotInUse(id: string) {
    if (await this.subjectRepository.isInUse(id)) Err(409, this.t('inUse'));
  }

  async ensureNoneInUse() {
    if (await this.subjectRepository.countInUse() > 0) Err(409, this.t('someInUse'));
  }

  async ensureCodeUnique(code: string, excludeId?: string) {
    const existing = await this.subjectRepository.getByCode(code);
    if (existing && existing.id !== excludeId) {
      Err(409, this.t('codeExists'));
    }
  }

  refuseDuplicateCode(error: unknown): never {
    const cause = (error as { cause?: unknown })?.cause ?? error;
    const { code, constraint_name: constraint } = (cause ?? {}) as { code?: string; constraint_name?: string };
    if (code === '23505' && ['subjects_code_normalized_unique', 'subjects_code_unique'].includes(constraint ?? '')) {
      Err(409, this.t('codeExists'));
    }
    throw error;
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
