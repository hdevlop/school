import { describe, expect, it } from 'bun:test';
import { removableUserIds } from '@/features/Users/config/bulkRemoval';
import { deleteSelection } from '@/shared/deleteSelection';

describe('bulk removal of login accounts', () => {
  it('keeps the current login and removes duplicate selected IDs without changing the selection', () => {
    const selected = ['current-admin', 'parent', 'student', 'parent'];
    expect(removableUserIds(selected, 'current-admin')).toEqual(['parent', 'student']);
    expect(selected).toEqual(['current-admin', 'parent', 'student', 'parent']);
  });

  it('has nothing to remove when only the current login or no rows are selected', () => {
    expect(removableUserIds(['current-admin'], 'current-admin')).toEqual([]);
    expect(removableUserIds([], 'current-admin')).toEqual([]);
  });

  it('uses the normal delete operation and retains each refusal for retry', async () => {
    const requests: string[] = [];
    const result = await deleteSelection(removableUserIds(['current-admin', 'allowed', 'protected'], 'current-admin'), async id => {
      requests.push(id);
      if (id === 'protected') throw new Error('Account cannot be removed');
    });
    expect(requests).toEqual(['allowed', 'protected']);
    expect(result.deleted).toEqual(['allowed']);
    expect(result.failed).toEqual([{ id: 'protected', message: 'Account cannot be removed' }]);
  });
});
