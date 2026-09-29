import { Service } from '../../../najm';
import { FinancialAuditValidator } from './FinancialAuditValidator';
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
  constructor(private repository: AuditLogRepository, private validator: FinancialAuditValidator) {}

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
    return this.validator.ensureExists(row);
  }
}
