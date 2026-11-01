'use client';

import { useMemo } from 'react';
import { NButton, NTable, useTableStore, type NTableProps } from 'najm-kit';
import { Eye, Pencil, Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'najm-i18n/react';
import type { ColumnDef } from '@tanstack/react-table';
import { withSchoolExports } from '@/shared/tableExport';
import { useViewerRole } from '@/features/Users/hooks/useViewerRole';
import { canPerformAction, permissionMenuItem, protectMenuItems } from '@/shared/actionPermissions';

function DeleteSelection({ onDelete, loading, disabled }: { onDelete: (ids: string[]) => void; loading?: boolean; disabled?: boolean }) {
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
      disabled={disabled}
      onClick={disabled ? undefined : () => onDelete(ids)}
      leftIcon={<Trash2 className="size-5" />}
    />
  );
}

/** School's permissions and export policy; exporting, printing and import remain Najm's. */
export function SchoolTable<T = any>({
  classNameColumns,
  showDeleteSelection = true,
  permissionResource,
  deletePermission,
  ...props
}: Omit<NTableProps<T>, 'columns'> & {
  columns: ReadonlyArray<ColumnDef<NoInfer<T>, any>>;
  classNameColumns?: readonly string[];
  showDeleteSelection?: boolean;
  /** The resource named by this table's create/update/delete API guards. */
  permissionResource?: string;
  /** Some actions (such as voiding a payment) use update rather than delete. */
  deletePermission?: string;
}) {
  const viewer = useViewerRole();
  const { t } = useTranslation();
  const allowed = (action: string) => !permissionResource || canPerformAction(viewer,
    action === 'delete' && deletePermission ? deletePermission : `${action}:${permissionResource}`);
  const canCreate = allowed('create');
  const canUpdate = allowed('update');
  const canDelete = allowed('delete');
  const blockedCreate = Boolean(props.onCreate && props.showAddButton !== false && !canCreate);
  // Najm owns menus and their rendering; School supplies disabled action items.
  const defaultMenu = permissionResource && !props.menu && (props.onView || props.onEdit || props.onDelete) ? { row: (row: T) => [
    ...(props.onView ? [{ label: t('common.view'), icon: Eye, onSelect: () => props.onView?.(row) }] : []),
    ...(props.onEdit ? [permissionMenuItem(viewer, `update:${permissionResource}`, {
      label: t('common.edit'), icon: Pencil, onSelect: () => props.onEdit?.(row),
    })] : []),
    ...(props.onDelete ? [permissionMenuItem(viewer, deletePermission ?? `delete:${permissionResource}`, {
      label: t('common.delete'), icon: Trash2, danger: true, separatorBefore: true, onSelect: () => props.onDelete?.(row),
    })] : []),
  ] } : undefined;
  const menu = typeof props.menu === 'function' ? { row: props.menu } : props.menu;
  const guardedMenu = menu ? {
    ...menu,
    row: menu.row ? (row: T) => protectMenuItems(viewer, menu.row!(row)) : undefined,
    background: menu.background ? () => protectMenuItems(viewer, menu.background!()) : undefined,
    header: menu.header ? () => protectMenuItems(viewer, menu.header!()) : undefined,
  } : defaultMenu;
  const columns = useMemo(() => withSchoolExports(props.columns, classNameColumns), [props.columns, classNameColumns]);
  return (
    <NTable
      {...props}
      columns={columns}
      // Every list exports (Excel, CSV) and prints from the settings menu; import stays opt-in.
      showExportButton={props.showExportButton ?? true}
      showPrintButton={props.showPrintButton ?? true}
      toolbarActionDisplay={props.toolbarActionDisplay ?? 'settings'}
      onCreate={canCreate ? props.onCreate : undefined}
      showAddButton={blockedCreate ? false : props.showAddButton}
      onEdit={canUpdate ? props.onEdit : undefined}
      onDelete={canDelete ? props.onDelete : undefined}
      onBulkDelete={canDelete ? props.onBulkDelete : undefined}
      onCellEdit={canUpdate ? props.onCellEdit : undefined}
      onDataChange={canCreate ? props.onDataChange : undefined}
      showImportButton={canCreate ? props.showImportButton : false}
      menu={guardedMenu}
      menuButton={defaultMenu ? true : props.menuButton}
      classNames={{
        ...props.classNames,
        header: `${props.classNames?.header ?? ''} [&_.lucide-settings]:text-foreground`,
        pagination: `${props.classNames?.pagination ?? ''} pr-24`,
      }}
      renderToolbar={blockedCreate || (showDeleteSelection && props.onBulkDelete) ? state => <>
        {blockedCreate && <NButton data-school-create-action variant="outline" size="icon-lg" rounded="lg" disabled aria-label={props.addButtonText || t('common.create')}><Plus className="size-5" /></NButton>}
        {showDeleteSelection && props.onBulkDelete && <DeleteSelection onDelete={props.onBulkDelete} loading={props.loading} disabled={!canDelete} />}
        {props.renderToolbar?.(state)}
      </> : props.renderToolbar}
    />
  );
}
