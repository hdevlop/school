import { Err, Service, t } from '../../najm';
import { CycleRepository } from './CycleRepository';

@Service()
export class CycleValidator {
  constructor(private cycleRepository: CycleRepository) {}

  async ensureExists(id: string) {
    const cycle = await this.cycleRepository.getById(id);
    if (!cycle) Err(404, t('cycles.errors.notFound'));
    return cycle;
  }

  async ensureNameUnique(name: string, excludeId?: string) {
    const existing = await this.cycleRepository.getByName(name);
    if (existing && existing.id !== excludeId) Err(409, t('cycles.errors.nameExists'));
  }

  async ensureNotInUse(id: string) {
    if (await this.cycleRepository.isInUse(id)) Err(409, t('cycles.errors.inUse'));
  }
}
