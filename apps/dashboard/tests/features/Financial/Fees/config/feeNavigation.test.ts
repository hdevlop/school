import { describe, expect, it } from 'bun:test';
import { OVERDUE_FEES_HREF, resolveFeeEntryFilters } from '@/features/Financial/Fees/config/feeNavigation';
import { resolveFeeRosterSelection } from '@/features/Financial/Fees/utils/feeRosterSelection';

describe('dashboard fee navigation', () => {
  it('opens overdue fees across all classes and sections, rather than the default class', () => {
    const href = new URL(OVERDUE_FEES_HREF, 'https://school.example');
    expect(href.pathname).toBe('/fees');
    const filters = resolveFeeEntryFilters(href.searchParams.get('status'));
    expect(filters.statusFilter).toBe('overdue');
    expect(resolveFeeRosterSelection(
      [{ id: 'cp', name: 'CP' }], [{ id: 'cp-a', classId: 'cp', name: 'A' }], filters.selection,
    )).toEqual({ classId: 'all', sectionId: '' });
  });

  it.each([null, '', 'unknown'])('keeps the default roster and All status for %s', status => {
    expect(resolveFeeEntryFilters(status)).toEqual({ statusFilter: '__all__', selection: null });
  });

  it.each(['paid', 'paying'])('accepts the supported %s status', status => {
    expect(resolveFeeEntryFilters(status)).toEqual({ statusFilter: status, selection: { classId: 'all', sectionId: '' } });
  });
});
