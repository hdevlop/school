import { Service, Err, I18n } from '../../najm';
import { SubjectRepository } from './SubjectRepository';
import { foldSubjectName } from '@sms/contracts';

@Service()
export class SubjectValidator {
  @I18n('subjects.errors') private t!: (key: string, params?: Record<string, string>) => string;

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

  /**
   * Planning finds a subject by name, so a name may name only one subject or
   * sub-subject in the school. subjectId is the subject the names belong to
   * (null while it is being created), subjectName its own name.
   */
  async ensureNamesFree(subjectId: string | null, subjectName: string, names: string[]) {
    const all = await this.subjectRepository.allNames();
    const owner = (id: string) => all.subjects.find(subject => subject.id === id)?.name ?? '';
    const seen = new Set<string>([foldSubjectName(subjectName)]);
    for (const name of names) {
      const folded = foldSubjectName(name);
      if (seen.has(folded)) Err(409, this.t('subSubjectTwice', { name }));
      seen.add(folded);
      const subject = all.subjects.find(row => row.id !== subjectId && foldSubjectName(row.name) === folded);
      if (subject) Err(409, this.t('subSubjectIsSubject', { name }));
      const part = all.subSubjects.find(row => row.subjectId !== subjectId && foldSubjectName(row.name) === folded);
      if (part) Err(409, this.t('subSubjectTaken', { name, subject: owner(part.subjectId) }));
    }
    // The subject's own name must not be another subject's sub-subject either.
    const own = all.subSubjects.find(row => row.subjectId !== subjectId && foldSubjectName(row.name) === foldSubjectName(subjectName));
    if (own) Err(409, this.t('subSubjectTaken', { name: subjectName, subject: owner(own.subjectId) }));
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
