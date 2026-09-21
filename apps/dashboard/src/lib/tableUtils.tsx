'use client';

import { flexRender } from '@tanstack/react-table';

interface BuildColumnsOptions {
  onCellClick?: (columnId: string, row: any) => void;
}

export function buildSmsColumns(columns: any[], opts: BuildColumnsOptions = {}) {
  const { onCellClick } = opts;
  if (!onCellClick && !columns.some((column) => column.onClick)) return columns;

  return columns.map((col) => {
    if (!onCellClick && !col.onClick) return col;

    return {
      ...col,
      cell: (ctx: any) => {
        const content = col.cell ? flexRender(col.cell, ctx) : ctx.getValue?.();

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
