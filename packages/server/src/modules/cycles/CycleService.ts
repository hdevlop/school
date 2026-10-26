import { schoolCycleForLevel } from '@sms/contracts';
import { Service } from '../../najm';
import { CycleRepository } from './CycleRepository';
import { CycleValidator } from './CycleValidator';
import type { CreateCycleDto, UpdateCycleDto } from './CycleDto';

@Service()
export class CycleService {
  constructor(
    private cycleRepository: CycleRepository,
    private cycleValidator: CycleValidator,
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

  // A cycle any year uses stays; deactivate it instead.
  async delete(id: string) {
    await this.cycleValidator.ensureExists(id);
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
