'use client';

import { useContext, useLayoutEffect, useRef, type RefObject } from 'react';
import { NTable, TableStoreContext, useNTableDefaults, type NTableProps } from 'najm-kit';
import type { ColumnDef, Table } from '@tanstack/react-table';
import { downloadSchoolTable } from '@/shared/tableExport';

type TableSource<T> = RefObject<(() => Table<T> | null) | null>;

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
  ...props
}: Omit<NTableProps<T>, 'columns'> & {
  columns: ReadonlyArray<ColumnDef<NoInfer<T>, any>>;
  classNameColumns?: readonly string[];
}) {
  const defaults = useNTableDefaults();
  const source = useRef<(() => Table<T> | null) | null>(null);
  const exportEnabled = props.showExportButton ?? Boolean((props.dataActions ?? defaults.dataActions) || props.onExport);
  const schoolExport = exportEnabled && !props.onExport;
  return (
    <NTable
      {...props}
      onExport={schoolExport ? () => {
        const table = source.current?.();
        if (table) downloadSchoolTable(table, classNameColumns);
      } : props.onExport}
      renderToolbar={schoolExport ? state => <>
        <ExportSource sourceRef={source} />
        {props.renderToolbar?.(state)}
      </> : props.renderToolbar}
    />
  );
}
