'use client';

import { useState } from 'react';
import { Button, NPageHeader, NPageHeaderActions, NErrorState, NForbiddenState, NEmptyState, cn, surfaceBorderClasses } from 'najm-kit';
import { Loader2, LockKeyhole, Pencil, Plus, Shield, Trash2 } from 'lucide-react';
import { useTranslation } from 'najm-i18n/react';
import type { AccessRole } from '@sms/contracts/access-control';
import { useDialog } from '@/shared/useDialog';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';
import { isAuthorizationError } from '@/services/apiError';
import { useRoles } from '../hooks/useRoles';
import RoleForm from './RoleForm';
import RolePermissionsDialog from './RolePermissionsDialog';

export default function RolesTable() {
  const { t } = useTranslation();
  const { openDialog, confirmDelete } = useDialog();
  const { roles, createRole, updateRole, deleteRole, error, isRolesLoading, isCreating, isUpdating, isDeleting } = useRoles();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const allRoles: AccessRole[] = roles ?? [];
  const selected = allRoles.find((role) => role.id === selectedId) ?? allRoles[0];
  const locked = selected?.name.toLowerCase() === 'admin';

  const selectRole = (role: AccessRole) => {
    if (selected?.id === role.id) return;
    const change = () => { setDirty(false); setSelectedId(role.id); };
    if (!dirty) return change();
    openDialog({
      title: t('roleAccess.unsavedTitle'),
      children: <p className="text-sm text-muted-foreground">{t('roleAccess.unsavedHint')}</p>,
      primaryButton: { text: t('roleAccess.discard'), onClick: change },
    });
  };
  const add = () => openDialog({
    title: t('roles.dialogs.createTitle'), children: <RoleForm />,
    primaryButton: {
      form: 'role-form', text: t('roles.dialogs.createButton'), loading: isCreating,
      onClick: async (data) => { await createRole(data); },
    },
  });
  const edit = () => {
    if (!selected || locked) return;
    openDialog({
      title: `${t('roles.dialogs.editTitle')} - ${selected.name}`, children: <RoleForm role={selected} />,
      primaryButton: {
        form: 'role-form', text: t('roles.dialogs.updateButton'), loading: isUpdating,
        onClick: async (data) => { await updateRole(data); },
      },
    });
  };
  const remove = () => {
    if (!selected || locked || dirty) return;
    confirmDelete({
      title: t('common.delete'), warningText: t('common.deleteConfirm'), itemName: selected.name,
      confirmText: t('roles.dialogs.deleteButton'), loading: isDeleting,
      onConfirm: async () => { await deleteRole(selected.id); setSelectedId(null); },
    });
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <NPageHeader icon={Shield} title={t('roleAccess.title')}>
        <NPageHeaderActions><PageHeaderGlobalActions /></NPageHeaderActions>
      </NPageHeader>
      {error ? (isAuthorizationError(error) ? <NForbiddenState surface="panel" /> : <NErrorState surface="panel" />)
        : isRolesLoading ? <div className="flex justify-center p-12"><Loader2 className="size-6 animate-spin" aria-label={t('common.loading')} /></div>
        : !allRoles.length ? <NEmptyState surface="panel" icon={Shield} title={t('emptyStates.roles.title')} action={<Button onClick={add}><Plus className="size-4" />{t('roles.dialogs.createButton')}</Button>} />
        : <div className={cn('grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-lg bg-background lg:grid-cols-[210px_minmax(0,1fr)] lg:grid-rows-1', surfaceBorderClasses())}>
          <aside className="flex min-h-0 flex-col border-solid border-border border-b-[length:var(--border-width)] bg-muted/20 lg:border-b-0 lg:border-e-[length:var(--border-width)]">
            <nav aria-label={t('navigation.roles')} className="flex max-h-40 flex-wrap gap-1 overflow-y-auto px-2 pt-3 pb-2 lg:max-h-none lg:flex-1 lg:flex-col lg:flex-nowrap">
              {allRoles.map((role) => <button key={role.id} type="button" onClick={() => selectRole(role)} aria-pressed={selected.id === role.id}
                className={`flex min-h-10 cursor-pointer items-center justify-between gap-2 rounded-md px-3 py-2 text-start text-sm capitalize transition-colors lg:w-full ${selected.id === role.id ? 'bg-primary/10 font-medium text-primary' : 'hover:bg-accent'}`}>
                <span className="break-words">{role.name}</span>{role.name.toLowerCase() === 'admin' && <LockKeyhole className="size-3.5 shrink-0" aria-label={t('roleAccess.locked')} />}
              </button>)}
            </nav>
            <div className="shrink-0 p-3">
              <Button variant="outline" className="w-full" onClick={add}><Plus className="size-4" />{t('roles.dialogs.createButton')}</Button>
            </div>
          </aside>
          <div className="min-h-0 min-w-0 overflow-y-auto p-3 sm:p-5">
            <RolePermissionsDialog key={selected.id} role={selected} onDirtyChange={setDirty} actions={<>
              <Button size="icon" variant="outline" className="size-10" disabled={locked || isUpdating || dirty} onClick={edit} aria-label={t('roles.dialogs.editTitle')} title={t('roles.dialogs.editTitle')}><Pencil className="size-4" /></Button>
              <Button size="icon" variant="outline" className="size-10" disabled={locked || isDeleting || dirty} onClick={remove} aria-label={t('common.delete')} title={t('common.delete')}><Trash2 className="size-4" /></Button>
            </>} />
          </div>
        </div>}
    </div>
  );
}
