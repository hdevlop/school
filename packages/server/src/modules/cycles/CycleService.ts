import { Err, Service } from '@server/najm';
import { CycleRepository } from './CycleRepository';
import type { CreateCycleDto, UpdateCycleDto } from './CycleDto';

@Service()
export class CycleService {
  constructor(private cycleRepository: CycleRepository) {}

  async getAll() {
    return this.cycleRepository.getAll();
  }

  async getActive() {
    return this.cycleRepository.getActive();
  }

  async getById(id: string) {
    const row = await this.cycleRepository.getById(id);
    if (!row) Err(404, 'Cycle not found');
    return row;
  }

  async create(data: CreateCycleDto) {
    const existing = await this.cycleRepository.getByName(data.name);
    if (existing) Err(409, 'Cycle name already exists');
    return this.cycleRepository.create({
      name: data.name,
      labels: data.labels ?? null,
      sortOrder: data.sortOrder ?? 0,
      active: data.active ?? true,
    });
  }

  async update(id: string, data: UpdateCycleDto) {
    await this.getById(id);
    if (data.name) {
      const existing = await this.cycleRepository.getByName(data.name);
      if (existing && existing.id !== id) Err(409, 'Cycle name already exists');
    }
    return this.cycleRepository.update(id, data);
  }

  async delete(id: string) {
    await this.getById(id);
    return this.cycleRepository.delete(id);
  }
}
