import { describe, expect, it } from 'bun:test';
import { deleteSelection, type DeleteSelectionProgress } from '@/shared/deleteSelection';

describe('selected record deletion', () => {
  it('continues past protected records and preserves their failure messages', async () => {
    const requests: string[] = [];
    const progress: DeleteSelectionProgress[] = [];
    const result = await deleteSelection(['unpaid', 'paid', 'another', 'unpaid'], async id => {
      requests.push(id);
      if (id === 'paid') throw new Error('Student has payment history');
    }, update => progress.push(update));
    expect(requests).toEqual(['unpaid', 'paid', 'another']);
    expect(result.deleted).toEqual(['unpaid', 'another']);
    expect(result.failed).toEqual([{ id: 'paid', message: 'Student has payment history' }]);
    expect(progress).toEqual([
      { total: 3, processed: 0, deleted: 0, failed: 0 },
      { total: 3, processed: 1, deleted: 1, failed: 0 },
      { total: 3, processed: 2, deleted: 1, failed: 1 },
      { total: 3, processed: 3, deleted: 2, failed: 1 },
    ]);
  });

  it('does not count a pending deletion as completed', async () => {
    const progress: DeleteSelectionProgress[] = [];
    let finish!: () => void;
    const pending = new Promise<void>(resolve => { finish = resolve; });
    const deletion = deleteSelection(['student'], () => pending, update => progress.push(update));
    expect(progress).toEqual([{ total: 1, processed: 0, deleted: 0, failed: 0 }]);
    finish();
    await deletion;
    expect(progress.at(-1)).toEqual({ total: 1, processed: 1, deleted: 1, failed: 0 });
  });
});
