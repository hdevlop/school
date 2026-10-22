import type { NTableProps } from 'najm-kit';

type TableMode = NonNullable<NTableProps['mode']>;
type ModeStorage = Pick<Storage, 'getItem' | 'setItem'>;

export function tableModeKey(accountId: string, feature: string) {
  return `school:table-mode:${encodeURIComponent(accountId)}:${encodeURIComponent(feature)}`;
}

function readTableMode(value: string | null): TableMode | undefined {
  return value === 'table' || value === 'cards' || value === 'json' ? value : undefined;
}

/** Store only the layout choice, with memory fallback when storage is blocked. */
export function createTableModePreferences(storage: () => ModeStorage) {
  const fallback = new Map<string, TableMode>();
  return {
    read(key: string, defaultMode: TableMode = 'cards'): TableMode {
      const remembered = fallback.get(key);
      if (remembered) return remembered;
      try {
        return readTableMode(storage().getItem(key)) ?? defaultMode;
      } catch {
        return defaultMode;
      }
    },
    write(key: string, mode: TableMode) {
      fallback.set(key, mode);
      try {
        storage().setItem(key, mode);
      } catch {
        // The memory fallback retains the layout across client navigation.
      }
    },
  };
}
