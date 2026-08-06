import { Err, Service } from '@server/najm';
import { AuditLogRepository } from './AuditLogRepository';

export type RecordAuditInput = {
  entityType: string;
  entityId: string;
  action: string;
  actorId?: string | null;
  before?: any;
  after?: any;
  metadata?: any;
};

@Service()
export class FinancialAuditService {
  constructor(private repository: AuditLogRepository) {}

  async record(input: RecordAuditInput) {
    return this.repository.create(input);
  }

  async list(filters: {
    entityType?: string;
    entityId?: string;
    action?: string;
    actorId?: string;
    limit?: number;
    offset?: number;
  }) {
    const [items, total] = await Promise.all([
      this.repository.list(filters),
      this.repository.count(filters),
    ]);
    return { items, total };
  }

  async getById(id: string) {
    const row = await this.repository.getById(id);
    if (!row) {
      Err(404, 'Audit log entry not found');
    }
    return row;
  }
}
