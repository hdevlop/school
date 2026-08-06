import { describe, expect, it, mock } from 'bun:test';

const { RolloverService } = await import('@server/modules/financial/rollover/RolloverService');

const dto = {
  fromYear: '2025-2026',
  toYear: '2026-2027',
  copyDiscounts: true,
  includeOneTimeFees: false,
  dryRun: true,
  idempotencyKey: '11111111-1111-4111-8111-111111111111',
};

function createService() {
  const repository = {
    getActiveStudents: mock(() => Promise.resolve([{ id: 'stu_01', name: 'Sara', classId: 'cls_01', enrollmentDate: '2026-09-15', status: 'active' }])),
    getSourceFeesForRollover: mock(() => Promise.resolve([{
      sourceFeeId: 'fee_old', studentId: 'stu_01', feeTypeId: 'ft_01', schedule: 'quarterly',
      discountAmount: '10.00', discountReason: 'Sibling', notes: 'Keep', feeTypeName: 'Tuition',
      feeTypeCategory: 'tuition', feeTypeAmount: '500.00', paymentType: 'recurring', feeTypeStatus: 'active',
    }])),
    getExistingFeeIdsForYear: mock(() => Promise.resolve([])),
    getRunByIdempotencyKey: mock(() => Promise.resolve(null)),
    createRun: mock((data) => Promise.resolve({ id: 'run_01', ...data })),
    createRunItem: mock(() => Promise.resolve({ id: 'item_01' })),
    completeRun: mock((id, data) => Promise.resolve({ id, ...data })),
    getRunById: mock(() => Promise.resolve(null)),
    listRunItems: mock(() => Promise.resolve([])),
  };
  const feeService = { create: mock(() => Promise.resolve({ id: 'fee_new' })) };
  const settings = {
    getAdminSettings: mock(() => Promise.resolve({ id: 'settings_01', startMonth: 'september', endMonth: 'june' })),
    update: mock(() => Promise.resolve({})),
  };
  const audit = { record: mock(() => Promise.resolve({ id: 'audit_01' })) };
  return { service: new RolloverService(repository as any, feeService as any, settings as any, audit as any), repository, feeService, settings };
}

describe('RolloverService', () => {
  it('previews actual source-year fee assignments and preserves their schedule', async () => {
    const { service, repository } = createService();
    const run = await service.preview({ ...dto, classIds: ['cls_01'] } as any, 'usr_01');
    const preview = run.preview;

    expect(repository.getActiveStudents).toHaveBeenCalledWith(['cls_01']);
    expect(repository.getSourceFeesForRollover).toHaveBeenCalledWith('2025-2026', ['stu_01'], undefined);
    expect(preview.proposedFees).toBe(1);
    expect(preview.details.proposedFees[0]).toMatchObject({ schedule: 'quarterly', discountAmount: 10 });
  });

  it('marks a partial commit failed and does not update settings', async () => {
    const { service, repository, feeService, settings } = createService();
    const previewedRun = await service.preview(dto as any);
    const preview = { details: { proposedFees: [{
      sourceFeeId: 'fee_old', studentId: 'stu_01', studentName: 'Sara', feeTypeId: 'ft_01', feeTypeName: 'Tuition',
      schedule: 'monthly', baseAmount: 500, discountAmount: 0, discountReason: null, notes: null,
      effectiveDate: '2026-09-15', grossAmount: 5000, netAmount: 5000,
    }], duplicatesToSkip: [] } };
    repository.getRunByIdempotencyKey.mockImplementation(() => Promise.resolve({
      ...previewedRun,
      status: 'previewed',
      dryRun: true,
      preview,
    }));
    feeService.create.mockImplementation(() => Promise.reject(new Error('fee failed')));

    const result = await service.commit({ ...dto, runId: 'run_01', confirmSettingsUpdate: true } as any, 'usr_01');
    expect(result.status).toBe('failed');
    expect(settings.update).not.toHaveBeenCalled();
  });
});
