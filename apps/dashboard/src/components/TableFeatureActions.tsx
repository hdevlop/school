'use client';

import { useState } from 'react';
import { ChevronDown, Code, FolderOpen, LayoutGrid, List, Plus, Settings, Trash2 } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel,
  DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger,
  NButton, useResolvedToolbarLabels, useTableStore, type ContextMenuItem, type NTableProps,
} from 'najm-kit';
import type { Table } from '@tanstack/react-table';
import { useTranslation } from 'najm-i18n/react';

type ViewMode = NonNullable<NTableProps['mode']>;

function ActionItem({ action, disabled, count }: { action: ContextMenuItem; disabled: boolean; count?: number }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = action.icon;
  return <>
    <NButton type="button" variant="ghost" disabled={disabled || action.disabled}
      aria-expanded={action.submenu ? expanded : undefined}
      onClick={() => action.submenu ? setExpanded(value => !value) : action.onSelect?.()}>
      {Icon && <Icon className="size-4 shrink-0" aria-hidden />}
      {action.label}
      {action.submenu && <ChevronDown className={`ms-auto size-4 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`} aria-hidden />}
      {!action.submenu && count !== undefined && <span data-menu-count="">{count}</span>}
    </NButton>
    {expanded && action.submenu && <div data-menu-submenu="">
      {action.submenu.map((item, index) => <ActionItem key={index} action={item} disabled={disabled || !!action.disabled} />)}
    </div>}
  </>;
}

function TableOptions({ disabled }: { disabled: boolean }) {
  const labels = useResolvedToolbarLabels(useTableStore.use.toolbarLabels());
  const table: Table<any> | null = useTableStore.use.table();
  const showView = useTableStore.use.showViewToggle();
  const showColumns = useTableStore.use.showColumnVisibility();
  const available: readonly ViewMode[] | undefined = useTableStore.use.availableModes();
  const view: ViewMode = useTableStore.use.viewMode();
  const setView = useTableStore.use.setViewMode();
  const cards = useTableStore.use.CardComponent();
  const json = useTableStore.use.jsonValue();
  const renderJson = useTableStore.use.renderJson();
  const columns = showColumns ? table?.getAllColumns().filter(column => column.getCanHide()) ?? [] : [];
  const modes = showView ? [
    { value: 'table' as const, label: labels.modeTable ?? 'Table', icon: List, enabled: true },
    { value: 'cards' as const, label: labels.modeCards ?? 'Cards', icon: LayoutGrid, enabled: !!cards },
    { value: 'json' as const, label: labels.modeJson ?? 'JSON', icon: Code, enabled: json !== undefined || !!renderJson },
    { value: 'files' as const, label: labels.modeFiles ?? 'Files', icon: FolderOpen, enabled: true },
  ].filter(mode => mode.enabled && (!available || available.includes(mode.value))) : [];
  if (!modes.length && !columns.length) return null;

  return <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <NButton type="button" variant="ghost" disabled={disabled}>
        <Settings className="size-4 shrink-0" aria-hidden />{labels.settings ?? 'Table settings'}
      </NButton>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="max-h-[65dvh] w-56 overflow-y-auto">
      {modes.length > 0 && <>
        <DropdownMenuLabel>{labels.view ?? 'View'}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={view} onValueChange={setView}>
          {modes.map(({ value, label, icon: Icon }) => <DropdownMenuRadioItem key={value} value={value} aria-label={labels.modeOption?.(label)}>
            <Icon className="size-4" aria-hidden />{label}
          </DropdownMenuRadioItem>)}
        </DropdownMenuRadioGroup>
      </>}
      {modes.length > 0 && columns.length > 0 && <DropdownMenuSeparator />}
      {columns.length > 0 && <>
        <DropdownMenuLabel>{labels.columns ?? 'Columns'}</DropdownMenuLabel>
        {columns.map(column => <DropdownMenuCheckboxItem key={column.id} checked={column.getIsVisible()} onCheckedChange={checked => column.toggleVisibility(!!checked)}>
          {typeof column.columnDef.header === 'string' ? column.columnDef.header : column.id}
        </DropdownMenuCheckboxItem>)}
      </>}
    </DropdownMenuContent>
  </DropdownMenu>;
}

/** Reads the current Najm table's own commands, after School's permission checks. */
export function TableFeatureActions({ onDelete, canDelete }: { onDelete?: (ids: string[]) => void; canDelete: boolean }) {
  const { t } = useTranslation();
  const actions: ContextMenuItem[] = useTableStore.use.toolbarActions();
  const labels = useResolvedToolbarLabels(useTableStore.use.toolbarLabels());
  const table: Table<any> | null = useTableStore.use.table();
  const loading = useTableStore.use.isLoading();
  const error = useTableStore.use.error();
  const selection: Record<string, boolean> = useTableStore.use.rowSelection();
  const showAdd = useTableStore.use.showAddButton();
  const onAdd = useTableStore.use.onAddClick();
  const addLabel = useTableStore.use.addButtonText();
  const disabled = !!loading || !!error;
  const rowCount = table?.getFilteredRowModel().rows.length ?? 0;
  const hasRows = rowCount > 0;
  const ids = table?.getFilteredSelectedRowModel().rows.filter(row => selection[row.id])
    .map(row => String(row.original.id)) ?? [];
  // Bringing data in comes before taking it out, as in the desktop toolbar's reading order.
  const ordered = [...actions].sort((a, b) => Number(b.label === labels.import) - Number(a.label === labels.import));

  return <>
    {showAdd && onAdd && <NButton type="button" variant="ghost" data-menu-primary="" disabled={disabled} onClick={onAdd}>
      <Plus className="size-4 shrink-0" aria-hidden />{addLabel || labels.create || t('common.create')}
    </NButton>}
    {ordered.length > 0 && <p data-menu-label="">{t('common.menuData')}</p>}
    {ordered.map((action, index) => <ActionItem key={index} action={action}
      count={action.label === labels.print && hasRows ? rowCount : undefined}
      disabled={disabled || (!hasRows && action.label !== labels.import)} />)}
    <TableOptions disabled={disabled} />
    {onDelete && ids.length > 0 && <NButton type="button" variant="ghost" className="text-destructive" disabled={disabled || !canDelete} onClick={() => onDelete(ids)}>
      <Trash2 className="size-4 shrink-0" aria-hidden />{t('common.deleteSelected', { count: ids.length })}
    </NButton>}
  </>;
}
