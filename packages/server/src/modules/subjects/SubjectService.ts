import { Service } from '../../najm';
import { SubjectRepository } from './SubjectRepository';
import { SubjectValidator } from './SubjectValidator';
import type { CreateSubjectDto, CreateSubjectsBulkDto, UpdateSubjectDto } from './SubjectDto';

@Service()
export class SubjectService {
  constructor(
    private subjectRepository: SubjectRepository,
    private subjectValidator: SubjectValidator
  ) { }

  async getAll() {
    return this.subjectRepository.getAll();
  }

  async getById(id: string) {
    return this.subjectValidator.ensureExists(id);
  }

  async create(data: CreateSubjectDto) {
    await this.subjectValidator.ensureCodeUnique(data.code);
    return this.subjectRepository.create(data);
  }

  async update(id: string, data: UpdateSubjectDto) {
    await this.subjectValidator.ensureExists(id);
    if (data.code) {
      await this.subjectValidator.ensureCodeUnique(data.code, id);
    }
    return this.subjectRepository.update(id, data);
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
    for (const subjectData of subjectsData) {
      try {
        const subjectEntity = await this.create(subjectData);
        createdSubjects.push(subjectEntity);
      } catch {
        continue;
      }
    }
    return createdSubjects;
  }
}
