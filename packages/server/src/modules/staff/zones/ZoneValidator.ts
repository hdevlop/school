import { Err, Service } from '../../../najm';
import { ZoneRepository } from './ZoneRepository';

@Service()
export class ZoneValidator {
  constructor(private repository: ZoneRepository) {}

  async ensureExists(id: string) {
    const row = await this.repository.getById(id);
    if (!row) Err(404, 'Zone not found');
    return row;
  }

  // Past years' assignments name the zone; the database restricts the delete.
  async ensureUnassigned(id: string) {
    if (await this.repository.countAssignments(id)) Err(409, 'Zone is named by staff assignments and cannot be deleted');
  }

  async ensureNameUnique(name: string, excludeId?: string) {
    const existing = await this.repository.getByName(name);
    if (existing && existing.id !== excludeId) Err(409, 'Zone name already exists');
  }
}
