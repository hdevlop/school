import { Service } from '../../../najm';
import { ZoneValidator } from './ZoneValidator';
import { ZoneRepository } from './ZoneRepository';
import type { CreateZoneDto, UpdateZoneDto } from './ZoneDto';

@Service()
export class ZoneService {
  constructor(private zoneRepository: ZoneRepository, private validator: ZoneValidator) {}

  async getAll() {
    return this.zoneRepository.getAll();
  }

  async getById(id: string) {
    return this.validator.ensureExists(id);
  }

  async create(data: CreateZoneDto) {
    await this.validator.ensureNameUnique(data.name);
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
      await this.validator.ensureNameUnique(data.name, id);
    }
    return this.zoneRepository.update(id, data);
  }

  async delete(id: string) {
    await this.getById(id);
    await this.validator.ensureUnassigned(id);
    return this.zoneRepository.delete(id);
  }
}
