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
}
