import { Err, Service } from '@server/najm';
import { ZoneRepository } from './ZoneRepository';
import type { CreateZoneDto, UpdateZoneDto } from './ZoneDto';

@Service()
export class ZoneService {
  constructor(private zoneRepository: ZoneRepository) {}

  async getAll() {
    return this.zoneRepository.getAll();
  }

  async getById(id: string) {
    const row = await this.zoneRepository.getById(id);
    if (!row) Err(404, 'Zone not found');
    return row;
  }

  async create(data: CreateZoneDto) {
    const existing = await this.zoneRepository.getByName(data.name);
    if (existing) Err(409, 'Zone name already exists');
    return this.zoneRepository.create({
      name: data.name,
      building: data.building ?? null,
      floor: data.floor ?? null,
      description: data.description ?? null,
    });
  }

  async update(id: string, data: UpdateZoneDto) {
    await this.getById(id);
    if (data.name) {
      const existing = await this.zoneRepository.getByName(data.name);
      if (existing && existing.id !== id) Err(409, 'Zone name already exists');
    }
    return this.zoneRepository.update(id, data);
  }

  async delete(id: string) {
    await this.getById(id);
    return this.zoneRepository.delete(id);
  }
}
