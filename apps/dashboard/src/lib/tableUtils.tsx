'use client';

import { flexRender } from '@tanstack/react-table';
import EditableCell from '@/lib/EditableCell';

interface BuildColumnsOptions {
  onCellEdit?: (row: any, columnId: string, value: any) => any;
  onCellClick?: (columnId: string, row: any) => void;
}

function isEditableCell(meta: any, row: any) {
  if (typeof meta?.editable === 'function') return Boolean(meta.editable(row));
  return Boolean(meta?.editable);
}

export function buildSmsColumns(columns: any[], opts: BuildColumnsOptions = {}) {
  const { onCellEdit, onCellClick } = opts;
  if (!onCellEdit && !onCellClick) return columns;

  return columns.map((col) => {
    const meta = col.meta || {};
    if (!onCellEdit && !onCellClick && !col.onClick) return col;

    return {
      ...col,
      meta: { ...meta, editable: false },
      cell: (ctx: any) => {
        const editable = Boolean(onCellEdit) && isEditableCell(meta, ctx.row.original);
        const content = col.cell ? flexRender(col.cell, ctx) : ctx.getValue?.();

        if (editable) {
          return <EditableCell cell={ctx.cell} onCellEdit={onCellEdit!} renderCell={col.cell} />;
        }

        const clickFn = col.onClick
          ? () => col.onClick(ctx.row.original)
          : onCellClick
            ? () => onCellClick(ctx.column.id, ctx.row.original)
            : null;

        if (!clickFn) return content;
        return (
          <div className="h-full w-full cursor-pointer" onClick={(e) => { e.stopPropagation(); clickFn(); }}>
            {content}
          </div>
        );
      },
    };
  });
}
