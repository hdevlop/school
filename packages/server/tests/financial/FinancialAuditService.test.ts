import { describe, expect, it, mock } from 'bun:test';
import { FinancialAuditService } from '@server/modules/financial/auditLog/FinancialAuditService';

describe('FinancialAuditService', () => {
  it('records append-only audit data through the repository', async () => {
    const repository = {
      create: mock((data) => Promise.resolve({ id: 'audit_01', ...data })),
      list: mock(() => Promise.resolve([])),
      count: mock(() => Promise.resolve(0)),
      getById: mock(() => Promise.resolve(null)),
    };
    const service = new FinancialAuditService(repository as any);
    const row = await service.record({ entityType: 'payment', entityId: 'pay_01', action: 'payment.completed', actorId: 'usr_01' });
    expect(row).toMatchObject({ id: 'audit_01', action: 'payment.completed', actorId: 'usr_01' });
  });
});
