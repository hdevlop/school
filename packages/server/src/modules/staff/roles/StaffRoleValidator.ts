import { Err, I18n, Service } from '../../../najm';
import { StaffRoleRepository } from './StaffRoleRepository';

@Service()
export class StaffRoleValidator {
  @I18n('staffRoles.errors') private t!: (key: string) => string;

  constructor(private repository: StaffRoleRepository) {}

  normalizeRoleCode(value: string) {
    const cleaned = value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const parts = cleaned.match(/[a-zA-Z0-9]+/g) ?? [];
    if (parts.length === 0) Err(400, this.t('invalidCode'));
    const code = parts.map((part, index) => {
      const word = /^[A-Z0-9]+$/.test(part) ? part.toLowerCase() : `${part.charAt(0).toLowerCase()}${part.slice(1)}`;
      return index === 0 ? word : `${word.charAt(0).toUpperCase()}${word.slice(1)}`;
    }).join('');
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(code)) Err(400, this.t('invalidCode'));
    return code;
  }

  async ensureExists(code: string) {
    const row = await this.repository.getByCode(code);
    if (!row) Err(404, this.t('notFound'));
    return row;
  }

  async ensureCodeUnique(code: string) {
    if (await this.repository.getByCode(code)) Err(409, this.t('codeExists'));
  }

  async ensureActive(code: string) {
    const row = await this.repository.getByCode(code);
    if (!row || !row.active) Err(400, this.t('invalidRole'));
    return row;
  }
}
