'use client';

import { useContext, useLayoutEffect, useRef, type RefObject } from 'react';
import { NButton, NTable, TableStoreContext, useNTableDefaults, useTableStore, type NTableProps } from 'najm-kit';
import { Trash2 } from 'lucide-react';
import { useTranslation } from 'najm-i18n/react';
import type { ColumnDef, Table } from '@tanstack/react-table';
import { downloadSchoolTable } from '@/shared/tableExport';

type TableSource<T> = RefObject<(() => Table<T> | null) | null>;

function DeleteSelection({ onDelete, loading }: { onDelete: (ids: string[]) => void; loading?: boolean }) {
  const table = useTableStore.use.table();
  const selection = useTableStore.use.rowSelection();
  const { t } = useTranslation();
  const ids = table?.getFilteredSelectedRowModel().rows
    .filter(row => selection[row.id])
    .map(row => (row.original as { id: string }).id) ?? [];
  if (loading || !ids.length) return null;
  const label = t('common.deleteSelected', { count: ids.length });
  return (
    <NButton
      type="button"
      variant="destructive"
      size="icon-lg"
      rounded="lg"
      aria-label={label}
      title={label}
      onClick={() => onDelete(ids)}
    >
      <Trash2 aria-hidden="true" className="size-5" />
    </NButton>
  );
}

/** Reads Najm's existing table; School keeps no second table or selection state. */
function ExportSource<T>({ sourceRef }: { sourceRef: TableSource<T> }) {
  const store = useContext(TableStoreContext);
  useLayoutEffect(() => {
    sourceRef.current = store ? () => store.getState().table : null;
    return () => { sourceRef.current = null; };
  }, [store, sourceRef]);
  return null;
}

/** School's file-export policy; rendering, printing and import remain Najm's. */
export function SchoolTable<T = any>({
  classNameColumns,
  showDeleteSelection = true,
  ...props
}: Omit<NTableProps<T>, 'columns'> & {
  columns: ReadonlyArray<ColumnDef<NoInfer<T>, any>>;
  classNameColumns?: readonly string[];
  showDeleteSelection?: boolean;
}) {
  const defaults = useNTableDefaults();
  const source = useRef<(() => Table<T> | null) | null>(null);
  const exportEnabled = props.showExportButton ?? Boolean((props.dataActions ?? defaults.dataActions) || props.onExport);
  const schoolExport = exportEnabled && !props.onExport;
  return (
    <NTable
      {...props}
      classNames={{ ...props.classNames, pagination: `${props.classNames?.pagination ?? ''} pr-24` }}
      onExport={schoolExport ? () => {
        const table = source.current?.();
        if (table) downloadSchoolTable(table, classNameColumns);
      } : props.onExport}
      renderToolbar={schoolExport || (showDeleteSelection && props.onBulkDelete) ? state => <>
        {schoolExport && <ExportSource sourceRef={source} />}
        {showDeleteSelection && props.onBulkDelete && <DeleteSelection onDelete={props.onBulkDelete} loading={props.loading} />}
        {props.renderToolbar?.(state)}
      </> : props.renderToolbar}
    />
  );
}
