import { Err, I18n, Service } from '../../../najm';
import { ZoneRepository } from './ZoneRepository';

@Service()
export class ZoneValidator {
  @I18n('zones.errors') private et!: (key: string) => string;
  constructor(private repository: ZoneRepository) {}

  async ensureExists(id: string) {
    const row = await this.repository.getById(id);
    if (!row) Err(404, this.et('notFound'));
    return row;
  }

  // Past years' assignments name the zone; the database restricts the delete.
  async ensureUnassigned(id: string) {
    if (await this.repository.countAssignments(id)) Err(409, this.et('inUse'));
  }

  async ensureNameUnique(name: string, excludeId?: string) {
    const existing = await this.repository.getByName(name);
    if (existing && existing.id !== excludeId) Err(409, this.et('nameExists'));
  }
}
