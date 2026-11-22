import { Service, Transaction } from '../../najm';
import { ExamPlanningService } from '../examPlanning/ExamPlanningService';
import { SubjectRepository } from './SubjectRepository';
import { SubjectValidator } from './SubjectValidator';
import type { CreateSubjectDto, CreateSubjectsBulkDto, UpdateSubjectDto } from './SubjectDto';
import { legacySchoolSubjectDefaults, schoolSubjectsData } from '@sms/contracts/subjects';
import { foldSubjectName } from '@sms/contracts';

@Service()
export class SubjectService {
  constructor(
    private subjectRepository: SubjectRepository,
    private subjectValidator: SubjectValidator,
    private examPlanning: ExamPlanningService,
  ) { }

  async getAll() {
    return this.subjectRepository.getAll();
  }

  async getById(id: string) {
    return this.subjectValidator.ensureExists(id);
  }

  @Transaction()
  async create(input: CreateSubjectDto) {
    const { subSubjects: parts, ...data } = { ...input, code: input.code.trim().toUpperCase(), nameAr: input.nameAr?.trim() || null };
    await this.subjectValidator.ensureCodeUnique(data.code);
    await this.subjectValidator.ensureNamesFree(null, data.name, (parts ?? []).map(part => part.name), data.nameAr);
    let created;
    try {
      created = await this.subjectRepository.create(data);
    } catch (error) {
      this.subjectValidator.refuseDuplicateCode(error);
    }
    if (parts?.length) await this.subjectRepository.saveSubSubjects(created.id, parts.map(({ name }) => ({ name })));
    await this.examPlanning.followSubjects();
    return this.subjectRepository.getById(created.id);
  }

  /**
   * A renamed subject or sub-subject is renamed in Planning too, in every
   * year, with the title of its exams not marked yet: Planning finds them by
   * name. Planning's exams then follow the new list.
   */
  @Transaction()
  async update(id: string, input: UpdateSubjectDto) {
    const { subSubjects: parts, ...data } = {
      ...input,
      ...(input.code !== undefined ? { code: input.code.trim().toUpperCase() } : {}),
      ...(input.nameAr !== undefined ? { nameAr: input.nameAr?.trim() || null } : {}),
    };
    const existing = await this.subjectValidator.ensureExists(id);
    if (data.code) {
      await this.subjectValidator.ensureCodeUnique(data.code, id);
    }
    const nameAr = data.nameAr !== undefined ? data.nameAr : existing.nameAr;
    if (data.name !== undefined || data.nameAr !== undefined || parts) {
      await this.subjectValidator.ensureNamesFree(id, data.name ?? existing.name, (parts ?? existing.subSubjects).map(part => part.name), nameAr);
    }
    if (Object.keys(data).length) {
      try {
        await this.subjectRepository.update(id, data);
      } catch (error) {
        this.subjectValidator.refuseDuplicateCode(error);
      }
    }
    const renamed = parts ? await this.subjectRepository.saveSubSubjects(id, parts) : [];
    if (data.name !== undefined && data.name !== existing.name) renamed.push({ from: existing.name, to: data.name });
    // Planning rows named by the old Arabic name take the new one.
    if (existing.nameAr && nameAr && nameAr !== existing.nameAr) renamed.push({ from: existing.nameAr, to: nameAr });
    await this.examPlanning.followSubjects(renamed);
    return this.subjectRepository.getById(id);
  }

  /** The sub-subjects one level (a class name) is taught, and whether they are its own list. */
  async getLevelList(id: string, level: string) {
    await this.subjectValidator.ensureExists(id);
    return this.subjectRepository.levelList(id, level);
  }

  /**
   * Sets the sub-subjects a level (class name) is taught. A
   * teacher edits only a subject they teach in that level. Names already in
   * Planning keep their exams; a new name lets Planning rows of that name
   * find their subject.
   */
  @Transaction()
  async saveLevelList(id: string, level: string, names: string[], actor: { id?: string; role?: string | null }) {
    const subject = await this.subjectValidator.ensureExists(id);
    await this.subjectValidator.ensureMayEditLevel(actor, id, level);
    await this.subjectValidator.ensureNamesFree(id, subject.name, names, subject.nameAr);
    await this.subjectRepository.saveLevelList(id, level, names);
    await this.examPlanning.followSubjects();
    return this.subjectRepository.levelList(id, level);
  }

  // A subject is shared by every year; one that any year uses stays.
  async delete(id: string) {
    await this.subjectValidator.ensureExists(id);
    await this.subjectValidator.ensureNotInUse(id);
    return this.subjectRepository.delete(id);
  }

  async deleteAll() {
    await this.subjectValidator.ensureNoneInUse();
    return this.subjectRepository.deleteAll();
  }

  async clearForSeedReset() {
    await this.subjectRepository.clearForSeedReset();
  }

  async seedDemoSubjects(subjectsData: CreateSubjectsBulkDto) {
    const createdSubjects = [];
    for (const { subSubjects: defaults, ...subjectData } of subjectsData) {
      const code = subjectData.code.trim().toUpperCase();
      const existing = await this.subjectRepository.getByCode(code);
      if (existing) {
        const previous = legacySchoolSubjectDefaults[code];
        const current = schoolSubjectsData.find(subject => subject.code === code);
        // Rename only an untouched former default to its current catalogue label.
        // Keep its ID, custom records and all historical assignments intact.
        if (previous && current
          && existing.name === previous.name && existing.description === previous.description
          && subjectData.name === current.name && subjectData.description === current.description) {
          await this.update(existing.id, { name: current.name, description: current.description });
        }
        await this.addDefaultSubSubjects(existing.id, defaults);
        continue;
      }
      // Unexpected validation or database errors must reach the seed runner.
      const created = await this.create(subjectData);
      await this.addDefaultSubSubjects(created.id, defaults);
      createdSubjects.push(created);
    }
    // The defaults added above make Planning names resolve: their exams follow.
    await this.examPlanning.followSubjects();
    return createdSubjects;
  }

  /**
   * The catalogue's sub-subjects a subject lacks, added after its own. A name
   * the school already uses anywhere, as a subject or under another subject,
   * is left where the school put it; a removed default comes back only on a
   * seed run, which is a deliberate act.
   */
  private async addDefaultSubSubjects(subjectId: string, defaults?: string[]) {
    if (!defaults?.length) return;
    const all = await this.subjectRepository.allNames();
    const taken = new Set([...all.subjects, ...all.subSubjects].map(row => foldSubjectName(row.name)));
    const missing = defaults.filter(name => {
      const folded = foldSubjectName(name);
      if (taken.has(folded)) return false;
      taken.add(folded);
      return true;
    });
    if (missing.length) await this.subjectRepository.addSubSubjects(missing.map(name => ({ subjectId, name })));
  }
}
