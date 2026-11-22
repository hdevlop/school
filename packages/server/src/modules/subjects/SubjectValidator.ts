import { Service, Err, I18n } from '../../najm';
import { SubjectRepository } from './SubjectRepository';
import { foldSubjectName } from '@sms/contracts';
import { SCHOOL_WIDE_ROLES } from '../../auth';

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
   * Planning finds a subject by name, so a name may name only one subject:
   * a subject's name or Arabic name, or a sub-subject of any of its lists
   * (the school's or a level's). subjectId is the subject the names belong to
   * (null while it is being created), subjectName and nameAr its own names.
   */
  async ensureNamesFree(subjectId: string | null, subjectName: string, names: string[], nameAr?: string | null) {
    const all = await this.subjectRepository.allNames();
    const owner = (id: string) => all.subjects.find(subject => subject.id === id)?.name ?? '';
    const ownNames = [subjectName, ...(nameAr?.trim() ? [nameAr] : [])];
    const seen = new Set<string>(ownNames.map(foldSubjectName));
    const namedSubject = (folded: string) => all.subjects.find(row => row.id !== subjectId
      && (foldSubjectName(row.name) === folded || (!!row.nameAr && foldSubjectName(row.nameAr) === folded)));
    for (const name of names) {
      const folded = foldSubjectName(name);
      if (seen.has(folded)) Err(409, this.t('subSubjectTwice', { name }));
      seen.add(folded);
      if (namedSubject(folded)) Err(409, this.t('subSubjectIsSubject', { name }));
      const part = all.subSubjects.find(row => row.subjectId !== subjectId && foldSubjectName(row.name) === folded);
      if (part) Err(409, this.t('subSubjectTaken', { name, subject: owner(part.subjectId) }));
    }
    // The subject's own names must not name another subject or its sub-subject either.
    for (const name of ownNames.slice(1)) if (namedSubject(foldSubjectName(name))) Err(409, this.t('nameExists'));
    for (const name of ownNames) {
      const own = all.subSubjects.find(row => row.subjectId !== subjectId && foldSubjectName(row.name) === foldSubjectName(name));
      if (own) Err(409, this.t('subSubjectTaken', { name, subject: owner(own.subjectId) }));
    }
  }

  /**
   * A level's sub-subjects: the school-wide roles edit every subject's, a
   * teacher a subject they teach in a class of that name, any other role
   * granted the permission none.
   */
  async ensureMayEditLevel(actor: { id?: string; role?: string | null }, subjectId: string, level: string) {
    if (SCHOOL_WIDE_ROLES.includes(actor.role ?? '')) return;
    if (actor.role === 'teacher' && actor.id && await this.subjectRepository.teachesInLevel(actor.id, subjectId, level)) return;
    Err(403, this.t('notYourLevel'));
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
