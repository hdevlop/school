import { describe, expect, it } from 'bun:test';
import { deleteSelection } from '@/shared/deleteSelection';

describe('selected record deletion', () => {
  it('continues past protected records and preserves their failure messages', async () => {
    const requests: string[] = [];
    const result = await deleteSelection(['unpaid', 'paid', 'another', 'unpaid'], async id => {
      requests.push(id);
      if (id === 'paid') throw new Error('Student has payment history');
    });
    expect(requests).toEqual(['unpaid', 'paid', 'another']);
    expect(result.deleted).toEqual(['unpaid', 'another']);
    expect(result.failed).toEqual([{ id: 'paid', message: 'Student has payment history' }]);
  });
});
