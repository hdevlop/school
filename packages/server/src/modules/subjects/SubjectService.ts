import { Service } from '@server/najm';
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

  async delete(id: string) {
    await this.subjectValidator.ensureExists(id);
    return this.subjectRepository.delete(id);
  }

  async deleteAll() {
    return this.subjectRepository.deleteAll();
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
