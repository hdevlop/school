import { Err, Service, t } from '../../najm';
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
    if (!row) Err(404, t('cycles.errors.notFound'));
    return row;
  }

  async create(data: CreateCycleDto) {
    const existing = await this.cycleRepository.getByName(data.name);
    if (existing) Err(409, t('cycles.errors.nameExists'));
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
      if (existing && existing.id !== id) Err(409, t('cycles.errors.nameExists'));
    }
    return this.cycleRepository.update(id, data);
  }

  // A cycle any year uses stays; deactivate it instead.
  async delete(id: string) {
    await this.getById(id);
    if (await this.cycleRepository.isInUse(id)) Err(409, t('cycles.errors.inUse'));
    return this.cycleRepository.delete(id);
  }
}
