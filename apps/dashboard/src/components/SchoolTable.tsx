'use client';

import { useMemo } from 'react';
import { NButton, NTable, useTableStore, type NTableProps } from 'najm-kit';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import { useTranslation } from 'najm-i18n/react';
import type { ColumnDef } from '@tanstack/react-table';
import { withSchoolExports } from '@/shared/tableExport';
import { useViewerRole } from '@/features/Users/hooks/useViewerRole';
import { canPerformAction, permissionMenuItem, protectMenuItems } from '@/shared/actionPermissions';
import { MobileFeatureActions, useFeatureActions } from '@/shared/FeatureActions';
import { TableFeatureActions } from './TableFeatureActions';
import styles from './SchoolTable.module.css';

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

/** Text and search filters take a full row on phones; selects, comboboxes and dates share one. */
function isTextFilter(filter: { type?: string; value?: unknown; options?: unknown }) {
  return filter.type === 'text' || filter.type === 'search'
    || (!filter.type && typeof filter.value === 'string' && !filter.options);
}

/** School's permissions and export policy; exporting, printing and import remain Najm's. */
export function SchoolTable<T = any>({
  classNameColumns,
  showDeleteSelection = true,
  permissionResource,
  deletePermission,
  mobileContextualActions = true,
  inlinePhoneFilters = true,
  ...props
}: Omit<NTableProps<T>, 'columns'> & {
  columns: ReadonlyArray<ColumnDef<NoInfer<T>, any>>;
  classNameColumns?: readonly string[];
  showDeleteSelection?: boolean;
  /** The resource named by this table's create/update/delete API guards. */
  permissionResource?: string;
  /** Some actions (such as voiding a payment) use update rather than delete. */
  deletePermission?: string;
  mobileContextualActions?: boolean;
  /**
   * Phones show every filter in rows above the list instead of one filter and
   * a filter button. Off for a page that lays out its own phone filters.
   */
  inlinePhoneFilters?: boolean;
}) {
  const featureActions = useFeatureActions();
  const contextual = !!featureActions && mobileContextualActions;
  const inlineFilters = inlinePhoneFilters && !!props.filters?.length;
  // Najm renders every filter in one row and hides it on phones; tagging each
  // wrapper lets that row lay selects three abreast and text full width there,
  // the same while a skeleton stands in for the control during loading.
  const filters = useMemo(() => inlineFilters ? props.filters?.map(filter => ({
    ...filter,
    className: `${filter.className ?? ''} ${isTextFilter(filter) ? styles.textFilter : styles.selectFilter}`,
  })) : props.filters, [props.filters, inlineFilters]);
  const viewer = useViewerRole();
  const { t } = useTranslation();
  const allowed = (action: string) => !permissionResource || canPerformAction(viewer,
    action === 'delete' && deletePermission ? deletePermission : `${action}:${permissionResource}`);
  const canCreate = allowed('create');
  const canUpdate = allowed('update');
  const canDelete = allowed('delete');
  // Importing asks for edit as well as add, as the import routes do.
  const canImport = canCreate && canUpdate;
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
      className={`${props.className ?? ''} ${styles.root} ${contextual ? styles.contextual : ''} ${inlineFilters ? styles.inlineFilters : ''}`}
      filters={filters}
      headerSlot={contextual ? <>
        <MobileFeatureActions><div className="md:hidden"><TableFeatureActions onDelete={showDeleteSelection ? props.onBulkDelete : undefined} canDelete={canDelete} /></div></MobileFeatureActions>
        {props.headerSlot}
      </> : props.headerSlot}
      columns={columns}
      // Every list exports (Excel, CSV) and prints from the settings menu; import stays opt-in.
      showExportButton={props.showExportButton ?? true}
      showPrintButton={props.showPrintButton ?? true}
      toolbarActionDisplay={props.toolbarActionDisplay ?? 'settings'}
      onCreate={canCreate ? props.onCreate : undefined}
      showAddButton={canCreate ? props.showAddButton : false}
      onEdit={canUpdate ? props.onEdit : undefined}
      onDelete={canDelete ? props.onDelete : undefined}
      onBulkDelete={canDelete ? props.onBulkDelete : undefined}
      onCellEdit={canUpdate ? props.onCellEdit : undefined}
      onDataChange={canImport ? props.onDataChange : undefined}
      showImportButton={canImport ? props.showImportButton : false}
      menu={guardedMenu}
      menuButton={defaultMenu ? true : props.menuButton}
      classNames={{
        ...props.classNames,
        header: `${props.classNames?.header ?? ''} [&_.lucide-settings]:text-foreground`,
        pagination: `${props.classNames?.pagination ?? ''} pr-24`,
      }}
      renderToolbar={showDeleteSelection && props.onBulkDelete ? state => <>
        {showDeleteSelection && props.onBulkDelete && <span className={contextual ? 'hidden md:contents' : 'contents'}><DeleteSelection onDelete={props.onBulkDelete} loading={props.loading} disabled={!canDelete} /></span>}
        {props.renderToolbar?.(state)}
      </> : props.renderToolbar}
    />
  );
}
