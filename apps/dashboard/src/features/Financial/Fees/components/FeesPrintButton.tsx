'use client';

import { NButton, useResolvedToolbarLabels, useTableStore, type ContextMenuItem } from 'najm-kit';
import { Printer } from 'lucide-react';
import { useEffect, type RefObject } from 'react';
import type { Table } from '@tanstack/react-table';

export function FeesPrintButton({ loading, tableRef }: { loading: boolean; tableRef?: RefObject<Table<any> | null> }) {
  const table = useTableStore.use.table();
  useEffect(() => {
    if (!tableRef) return;
    tableRef.current = table;
    return () => { tableRef.current = null; };
  }, [table, tableRef]);
  const actions: ContextMenuItem[] = useTableStore.use.toolbarActions();
  const labels = useResolvedToolbarLabels(useTableStore.use.toolbarLabels());
  const action = actions.find(item => item.label === (labels.print ?? 'Print'));
  if (!action) return null;
  return (
    <NButton
      type="button"
      variant="outline"
      size="icon-lg"
      aria-label={action.label}
      title={action.label}
      disabled={loading}
      onClick={() => action.onSelect?.()}
      leftIcon={<Printer className="size-4" />}
    />
  );
}
