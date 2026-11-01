import { SCHEDULE_VALUES } from '@sms/contracts';
import type { Schedule } from '@sms/contracts';
import type { FeeRosterSelection } from '../utils/feeRosterSelection';
import { resolveFeeEntryFilters } from './feeNavigation';

export type FeeListFilters = {
  selection: FeeRosterSelection | null;
  statusFilter: string;
  scheduleFilter?: Schedule;
  searchText: string;
};

type FilterStorage = Pick<Storage, 'getItem' | 'setItem'>;

const STATUS_FILTERS = ['__all__', 'overdue', 'paying', 'paid'];

export const DEFAULT_FEE_LIST_FILTERS: FeeListFilters = { selection: null, statusFilter: '__all__', searchText: '' };

/** Class and section IDs belong to one year, so each year keeps its own filters. */
export function feeListFiltersKey(accountId: string, yearKey: string) {
  return `school:fee-filters:${encodeURIComponent(accountId)}:${encodeURIComponent(yearKey)}`;
}

export function parseFeeListFilters(value: string | null): FeeListFilters | undefined {
  if (!value) return undefined;
  let raw: unknown;
  try {
    raw = JSON.parse(value);
  } catch {
    return undefined;
  }
  if (!raw || typeof raw !== 'object') return undefined;
  const { selection, statusFilter, scheduleFilter, searchText } = raw as Record<string, unknown>;
  const validSelection = selection === null || (
    !!selection && typeof selection === 'object'
    && typeof (selection as FeeRosterSelection).classId === 'string'
    && typeof (selection as FeeRosterSelection).sectionId === 'string'
  );
  if (!validSelection || typeof statusFilter !== 'string' || !STATUS_FILTERS.includes(statusFilter)) return undefined;
  if (scheduleFilter !== undefined && !SCHEDULE_VALUES.includes(scheduleFilter as Schedule)) return undefined;
  if (typeof searchText !== 'string') return undefined;
  return {
    selection: selection ? { classId: (selection as FeeRosterSelection).classId, sectionId: (selection as FeeRosterSelection).sectionId } : null,
    statusFilter,
    ...(scheduleFilter ? { scheduleFilter: scheduleFilter as Schedule } : {}),
    searchText,
  };
}

/** A `?status=` link (the dashboard's overdue card) wins; otherwise the tab's last filters. */
export function resolveFeeListFilters(status: string | null, remembered?: FeeListFilters): FeeListFilters {
  const entry = resolveFeeEntryFilters(status);
  if (entry.statusFilter !== '__all__') return { ...DEFAULT_FEE_LIST_FILTERS, ...entry };
  return remembered ?? DEFAULT_FEE_LIST_FILTERS;
}

/** Tab-local fee list filters, with memory fallback when storage is blocked. */
export function createFeeListFilterMemory(storage: () => FilterStorage) {
  const fallback = new Map<string, FeeListFilters>();
  return {
    read(key: string): FeeListFilters | undefined {
      const remembered = fallback.get(key);
      if (remembered) return remembered;
      try {
        return parseFeeListFilters(storage().getItem(key));
      } catch {
        return undefined;
      }
    },
    write(key: string, filters: FeeListFilters) {
      fallback.set(key, filters);
      try {
        storage().setItem(key, JSON.stringify(filters));
      } catch {
        // The memory fallback retains the filters across client navigation.
      }
    },
  };
}
