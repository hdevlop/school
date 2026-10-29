import { schoolCycleForLevel } from '@sms/contracts';
import { Service, Transaction } from '../../najm';
import { CycleRepository } from './CycleRepository';
import { CycleValidator } from './CycleValidator';
import type { CreateCycleDto, UpdateCycleDto } from './CycleDto';
import { ClassValidator } from '../classes/ClassValidator';
import { SectionValidator } from '../sections/SectionValidator';

@Service()
export class CycleService {
  constructor(
    private cycleRepository: CycleRepository,
    private cycleValidator: CycleValidator,
    private classValidator: ClassValidator,
    private sectionValidator: SectionValidator,
  ) {}

  async getAll() {
    return this.cycleRepository.getAll();
  }

  async getActive() {
    return this.cycleRepository.getActive();
  }

  async getById(id: string) {
    return this.cycleValidator.ensureExists(id);
  }

  async create(data: CreateCycleDto) {
    await this.cycleValidator.ensureNameUnique(data.name);
    return this.cycleRepository.create({
      name: data.name,
      labels: data.labels ?? null,
      sortOrder: data.sortOrder ?? 0,
      active: data.active ?? true,
    });
  }

  async update(id: string, data: UpdateCycleDto) {
    await this.cycleValidator.ensureExists(id);
    if (data.name) await this.cycleValidator.ensureNameUnique(data.name, id);
    return this.cycleRepository.update(id, data);
  }

  // A shared cycle owns its classes and sections across every school year.
  // Reuse domain checks without changing the request's selected-year scope.
  @Transaction()
  async delete(id: string) {
    await this.cycleRepository.lockForMutation(id);
    await this.cycleValidator.ensureExists(id);
    const classes = await this.cycleRepository.lockClassesForDeletion(id);
    for (const schoolClass of classes) {
      await this.classValidator.ensureHasNoStaff(schoolClass.id);
    }
    const classIds = classes.map(schoolClass => schoolClass.id);
    const sections = await this.cycleRepository.lockSectionsForDeletion(classIds);
    for (const section of sections) {
      await this.sectionValidator.ensureHasNoStudents(section.id);
      await this.sectionValidator.ensureHasNoAssignments(section.id);
    }
    await this.cycleRepository.deleteClassSections(classIds);
    await this.cycleRepository.deleteClasses(id);
    await this.cycleValidator.ensureNotInUse(id);
    return this.cycleRepository.delete(id);
  }

  // Trusted seed data: the standard stages the school lacks. A cycle matching
  // one by name or label, active or not, is the school's own and stays as is.
  async seedDefaultCycles(stages: readonly { name: string; sortOrder: number; labels: Record<string, string> }[]) {
    const existing = await this.cycleRepository.getAll();
    const created = [];
    for (const stage of stages) {
      if (existing.some((cycle) => schoolCycleForLevel(cycle.name)?.name === stage.name)) continue;
      created.push(await this.cycleRepository.create({
        name: stage.name,
        labels: { ...stage.labels },
        sortOrder: stage.sortOrder,
        active: true,
      }));
    }
    return created;
  }

  async clearForSeedReset() {
    await this.cycleRepository.clearForSeedReset();
  }
}
