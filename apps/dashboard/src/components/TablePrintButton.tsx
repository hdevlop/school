'use client';

import { NButton, useResolvedToolbarLabels, useTableStore, type ContextMenuItem } from 'najm-kit';
import { Printer } from 'lucide-react';
import { useEffect, type RefObject } from 'react';
import type { Table } from '@tanstack/react-table';

/** Uses Najm's print action so the button prints the table's current view. */
export function TablePrintButton({ loading, tableRef }: { loading: boolean; tableRef?: RefObject<Table<any> | null> }) {
  const table = useTableStore.use.table();
  useEffect(() => {
    if (!tableRef) return;
    tableRef.current = table;
    return () => { tableRef.current = null; };
  }, [table, tableRef]);
  const actions: ContextMenuItem[] = useTableStore.use.toolbarActions();
  const labels = useResolvedToolbarLabels(useTableStore.use.toolbarLabels());
  const printAction = actions.find(action => action.label === (labels.print ?? 'Print'));
  if (loading) {
    return (
      <div aria-hidden="true" className="hidden h-10 w-10 items-center justify-center rounded-md border border-input md:inline-flex">
        <span className="h-4 w-4 animate-pulse rounded-full bg-muted" />
      </div>
    );
  }
  if (!printAction) return null;

  return (
    <NButton
      type="button"
      variant="outline"
      size="icon"
      className="hidden h-10 w-10 md:inline-flex"
      aria-label={printAction.label}
      title={printAction.label}
      onClick={() => printAction.onSelect?.()}
      leftIcon={<Printer className="h-4 w-4" />}
    />
  );
}
