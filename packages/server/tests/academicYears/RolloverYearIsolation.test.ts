import { expect, test } from 'bun:test';
import { RolloverService } from '../../src/modules/financial/rollover/RolloverService';
import { RolloverValidator } from '../../src/modules/financial/rollover/RolloverValidator';

test('financial rollover cannot activate the academic year', async () => {
  const service = new RolloverService({} as any, {} as any, {} as any, {} as any, {} as any, new RolloverValidator());
  await expect(service.commit({ confirmSettingsUpdate: true } as any, 'admin-1'))
    .rejects.toThrow();
});
