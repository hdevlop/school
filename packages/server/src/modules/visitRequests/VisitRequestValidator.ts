import { Err, Service } from '../../najm';
import { I18n, type TFn } from 'najm-i18n';
import { VisitRequestRepository } from './VisitRequestRepository';
@Service()
export class VisitRequestValidator {
  @I18n('visitRequests') private t!: TFn;
  constructor(private repository: VisitRequestRepository) {}
  async ensureExists(id: string) { const row = await this.repository.find(id); if (!row) Err(this.t('errors.notFound'), 404); return row; }
  async ensureActiveCycle(id?: string) { if (id && !await this.repository.activeCycle(id)) Err(this.t('errors.cycle'), 422); }
}
