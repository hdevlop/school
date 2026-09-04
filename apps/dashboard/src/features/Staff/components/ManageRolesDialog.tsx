"use client";

import React, { useMemo } from 'react';
import { z } from 'zod';
import { Badge, Button, FormInput, NForm, NFormSectionHeader } from 'najm-kit';
import { useConfirmDelete } from '@/hooks/useConfirmDelete';
import { Briefcase, Pencil, Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'najm-i18n/react';
import { useStaffRoles, useStaffRoleMutations } from '../hooks/useStaffRoles';
import { toast } from 'sonner';

const roleSchema = z.object({
  code: z.string().min(1),
  label: z.string().min(1),
  labels: z.object({
    fr: z.string().optional().or(z.literal('')),
    ar: z.string().optional().or(z.literal('')),
    es: z.string().optional().or(z.literal('')),
  }).optional(),
  category: z.string().optional().or(z.literal('')),
  sortOrder: z.coerce.number().int().min(0).optional().default(0),
  active: z.boolean().optional().default(true),
  createAccessRole: z.boolean().optional().default(false),
});

const cleanRolePayload = (data) => {
  const labels = Object.fromEntries(
    Object.entries(data.labels || {})
      .map(([key, value]) => [key, String(value || '').trim()])
      .filter(([, value]) => value),
  );

  return {
    ...data,
    category: data.category || null,
    labels: Object.keys(labels).length > 0 ? labels : null,
  };
};

const RoleEditorForm = ({ role = null, onSubmit, formId }) => {
  const { t } = useTranslation();
  const defaults = {
    code: role?.code || '',
    label: role?.label || '',
    category: role?.category || '',
    sortOrder: role?.sortOrder ?? 0,
    active: role?.active ?? true,
    labels: {
      fr: role?.labels?.fr || '',
      ar: role?.labels?.ar || '',
      es: role?.labels?.es || '',
    },
  };
  return (
    <NForm id={formId} schema={roleSchema} defaultValues={defaults} onSubmit={onSubmit}>
      <div className="grid grid-cols-2 gap-3">
        <FormInput name="code" type="text" formLabel={t('staffRoles.form.code')} placeholder={t('staffRoles.form.codePlaceholder')} required disabled={!!role} />
        <FormInput name="label" type="text" formLabel={t('staffRoles.form.label')} placeholder={t('staffRoles.form.labelPlaceholder')} required />
        <FormInput name="labels.fr" type="text" formLabel={t('staffRoles.form.labelFr')} placeholder={t('staffRoles.form.labelFrPlaceholder')} />
        <FormInput name="labels.ar" type="text" formLabel={t('staffRoles.form.labelAr')} placeholder={t('staffRoles.form.labelArPlaceholder')} />
        <FormInput name="labels.es" type="text" formLabel={t('staffRoles.form.labelEs')} placeholder={t('staffRoles.form.labelEsPlaceholder')} />
        <FormInput name="category" type="text" formLabel={t('staffRoles.form.category')} placeholder={t('staffRoles.form.categoryPlaceholder')} />
        <FormInput name="sortOrder" type="number" formLabel={t('staffRoles.form.sortOrder')} />
      </div>
      <div className="flex justify-end pt-2">
        <Button type="submit" form={formId} size="sm">
          {role ? t('staffRoles.dialogs.updateButton') : t('staffRoles.dialogs.createButton')}
        </Button>
      </div>
    </NForm>
  );
};

const ManageRolesDialog = () => {
  const { t } = useTranslation();
  const { staffRoles, refetch } = useStaffRoles();
  const { create: createRole, update: updateRole, remove: removeRole } = useStaffRoleMutations();
  const { openDialog, confirmDelete, pop } = useConfirmDelete();

  const items = useMemo(() => (staffRoles || []).map((role) => ({
    code: role.code,
    label: role.label,
    labels: role.labels,
    category: role.category,
    isSystem: role.isSystem,
    active: role.active,
    sortOrder: role.sortOrder,
  })), [staffRoles]);

  const onAdd = () => {
    const formId = 'role-create-form';
    openDialog({
      title: t('staffRoles.dialogs.createTitle'),
      children: <RoleEditorForm formId={formId} onSubmit={async (data) => {
        try {
          await createRole({ ...cleanRolePayload(data), active: data.active ?? true });
          refetch();
          pop();
        } catch (e) {
          toast.error(e?.response?.data?.message || e?.message);
        }
      }} />,
      width: 'lg',
      showButtons: false,
    });
  };

  const onEdit = (role) => {
    const formId = `role-edit-form-${role.code}`;
    openDialog({
      title: `${t('staffRoles.dialogs.editTitle')} - ${role.code}`,
      children: <RoleEditorForm role={role} formId={formId} onSubmit={async (data) => {
        try {
          await updateRole({ code: role.code, ...cleanRolePayload(data) });
          refetch();
          pop();
        } catch (e) {
          toast.error(e?.response?.data?.message || e?.message);
        }
      }} />,
      width: 'lg',
      showButtons: false,
    });
  };

  const onDelete = (role) => {
    confirmDelete({
      itemName: role.label || role.code,
      confirmText: t('staffRoles.dialogs.deleteButton'),
      onConfirm: async () => {
        try {
          await removeRole(role.code);
          refetch();
        } catch (e) {
          toast.error(e?.response?.data?.message || e?.message);
        }
      },
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <NFormSectionHeader icon={Briefcase} title={t('staffRoles.dialogs.manageTitle')} />
      <div className="flex justify-end">
        <Button onClick={onAdd} size="sm" className="gap-1">
          <Plus className="h-4 w-4" />
          {t('staffRoles.form.addNewRole')}
        </Button>
      </div>
      <div className="border rounded-md divide-y">
        {(items || []).map((role) => (
          <div key={role.code} className="flex items-center justify-between px-3 py-2">
            <div className="flex flex-col">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm">{role.label}</span>
                <Badge variant="outline" className="text-xs font-mono">{role.code}</Badge>
                {role.isSystem && <Badge className="bg-amber-100 text-amber-800 text-xs">{t('staffRoles.table.system')}</Badge>}
                {!role.active && <Badge className="bg-slate-200 text-slate-700 text-xs">{t('common.inactive') || 'Inactive'}</Badge>}
              </div>
              {role.category && <span className="text-xs text-muted-foreground">{role.category}</span>}
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={() => onEdit(role)} aria-label="edit">
                <Pencil className="h-4 w-4" />
              </Button>
              {!role.isSystem && (
                <Button variant="ghost" size="sm" onClick={() => onDelete(role)} className="text-red-600" aria-label="delete">
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">{t('staff.noData')}</div>
        )}
      </div>
    </div>
  );
};

export default ManageRolesDialog;
