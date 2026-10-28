import type { FeeRosterSelection } from '../utils/feeRosterSelection';

export const OVERDUE_FEES_HREF = '/fees?status=overdue';

export function resolveFeeEntryFilters(status: string | null): {
  statusFilter: string;
  selection: FeeRosterSelection | null;
} {
  const statusFilter = status && ['overdue', 'paying', 'paid'].includes(status) ? status : '__all__';
  return {
    statusFilter,
    selection: statusFilter === '__all__' ? null : { classId: 'all', sectionId: '' },
  };
}
