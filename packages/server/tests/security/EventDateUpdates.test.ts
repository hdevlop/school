import { describe, expect, it } from 'bun:test';
import { EventValidator } from '../../src/modules/events/EventValidator';
import { EventService } from '../../src/modules/events/EventService';

function harness(current = { startDate: '2026-10-20', endDate: '2026-10-20', startTime: null, endTime: null, registrationDeadline: null }) {
  const writes: unknown[] = [];
  const repository = {
    getById: async () => current,
    overlapsSelectedYear: () => true,
    create: async (data: unknown) => { writes.push(data); return data; },
    update: async (_id: string, data: unknown) => { writes.push(data); return data; },
  };
  const validator = new EventValidator(repository as never, {} as never);
  Object.assign(validator, { et: (key: string) => key });
  return { service: new EventService(repository as never, validator), writes };
}

describe('event dates with optional times', () => {
  it('creates a date-only event without crashing on absent times', async () => {
    const { service, writes } = harness();
    await service.create({ title: 'Lecture Atlas', type: 'academic', startDate: '2026-10-20', endDate: '2026-10-20' });
    expect(writes).toHaveLength(1);
  });

  it('refuses reversed date-only partial updates without writing', async () => {
    const { service, writes } = harness();
    await expect(service.update('owned', { endDate: '2026-10-19' })).rejects.toThrow('endDateBeforeStart');
    await expect(service.update('owned', { startDate: '2026-10-21' })).rejects.toThrow('endDateBeforeStart');
    expect(writes).toHaveLength(0);
  });

  it('validates registration deadlines even when times are absent', async () => {
    const { service, writes } = harness();
    await expect(service.update('owned', { registrationDeadline: '2026-10-21' })).rejects.toThrow('registrationDeadlineAfterStart');
    expect(writes).toHaveLength(0);
  });

  it('refuses reversed same-day times and allows explicitly clearing one', async () => {
    const { service, writes } = harness({ startDate: '2026-10-20', endDate: '2026-10-20', startTime: '09:00', endTime: '10:00', registrationDeadline: null });
    await expect(service.update('owned', { endTime: '08:00' })).rejects.toThrow('endTimeBeforeStart');
    await expect(service.update('owned', { startTime: '11:00', endTime: null })).resolves.toEqual({ startTime: '11:00', endTime: null });
    expect(writes).toHaveLength(1);
  });

  it('accepts overnight multi-day events and valid date-only edits', async () => {
    const { service, writes } = harness();
    await service.update('owned', { endDate: '2026-10-21', startTime: '22:00', endTime: '01:00' });
    await service.update('owned', { title: 'Lecture Atlas 2' });
    expect(writes).toHaveLength(2);
  });
});
