import { describe, expect, it, mock } from 'bun:test';

const { NotificationService } = await import('@server/modules/financial/notifications/NotificationService');

function createService() {
  const deps = {
    repository: {
      getStudentsWithOverdueInstallments: mock(() => Promise.resolve([])),
      getStudentsWithChecksDueInWindow: mock(() => Promise.resolve([])),
      tryClaimDelivery: mock(() => Promise.resolve({ claimed: true, row: { id: 'delivery_01' } })),
      listRecent: mock(() => Promise.resolve([])),
    },
    alerts: { create: mock(() => Promise.resolve({ id: 'alert_01' })) },
    audit: { record: mock(() => Promise.resolve({ id: 'audit_01' })) },
  };
  return {
    service: new NotificationService(deps.repository as any, deps.alerts as any, deps.audit as any),
    deps,
  };
}

describe('NotificationService', () => {
  it('does not create a second overdue alert after the delivery key is claimed', async () => {
    const { service, deps } = createService();
    deps.repository.getStudentsWithOverdueInstallments.mockImplementation(() => Promise.resolve([{
      studentId: 'stu_01', studentName: 'Sara', installmentCount: 2, totalUnpaid: 300, oldestDueDate: '2026-01-01',
    }]));
    deps.repository.tryClaimDelivery
      .mockImplementationOnce(() => Promise.resolve({ claimed: true, row: { id: 'delivery_01' } }))
      .mockImplementationOnce(() => Promise.resolve({ claimed: false }));

    await service.runOverdueJob({ businessDate: '2026-06-13' });
    await service.runOverdueJob({ businessDate: '2026-06-13' });
    expect(deps.alerts.create).toHaveBeenCalledTimes(1);
  });

  it('groups multiple due checks for one student into one delivery', async () => {
    const { service, deps } = createService();
    deps.repository.getStudentsWithChecksDueInWindow.mockImplementation(() => Promise.resolve([
      { studentId: 'stu_01', studentName: 'Sara', paymentId: 'pay_01', checkNumber: 'A', checkDueDate: '2026-06-15', amount: 100, status: 'pending' },
      { studentId: 'stu_01', studentName: 'Sara', paymentId: 'pay_02', checkNumber: 'B', checkDueDate: '2026-06-16', amount: 200, status: 'deposited' },
    ]));

    const result = await service.runCheckDueJob({ businessDate: '2026-06-13' });
    expect(result.processed).toBe(1);
    expect(deps.repository.tryClaimDelivery).toHaveBeenCalledTimes(1);
    expect(deps.repository.tryClaimDelivery.mock.calls[0][0].payload.checks).toHaveLength(2);
  });

  it('continues processing students when one alert delivery fails', async () => {
    const { service, deps } = createService();
    deps.repository.getStudentsWithOverdueInstallments.mockImplementation(() => Promise.resolve([
      { studentId: 'stu_01', studentName: 'Sara', installmentCount: 1, totalUnpaid: 100, oldestDueDate: '2026-01-01' },
      { studentId: 'stu_02', studentName: 'Omar', installmentCount: 1, totalUnpaid: 200, oldestDueDate: '2026-02-01' },
    ]));
    deps.alerts.create
      .mockImplementationOnce(() => Promise.reject(new Error('delivery unavailable')))
      .mockImplementationOnce(() => Promise.resolve({ id: 'alert_02' }));

    const result = await service.runOverdueJob({ businessDate: '2026-06-13' });

    expect(result.results[0]).toMatchObject({ studentId: 'stu_01', status: 'failed' });
    expect(result.results[1]).toMatchObject({ studentId: 'stu_02', status: 'claimed', alertId: 'alert_02' });
  });
});
