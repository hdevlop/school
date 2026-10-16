"use client";

import React, { useMemo } from 'react';
import { z } from 'zod';
import { Badge, Button, FormInput, NForm } from 'najm-kit';
import { useDialog } from '@/shared/useDialog';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'najm-i18n/react';
import { useViewerRole } from '@/features/Users/hooks/useViewerRole';
import { useZones } from '../hooks/useZones';

type T = (key: string) => string;

const createZoneSchema = (t: T) => z.object({
  name: z.string().trim().min(1, t('staff.validation.required')).max(100, t('staff.validation.tooLong')),
  building: z.string().optional().or(z.literal('')),
  floor: z.string().optional().or(z.literal('')),
  description: z.string().optional().or(z.literal('')),
});

const cleanZonePayload = (data) => ({
  ...data,
  building: data.building || null,
  floor: data.floor || null,
  description: data.description || null,
});

const ZoneEditorForm = ({ zone = null, formId, onSubmit }) => {
  const { t } = useTranslation();
  const zoneSchema = useMemo(() => createZoneSchema(t), [t]);
  const defaults = {
    name: zone?.name || '',
    building: zone?.building || '',
    floor: zone?.floor || '',
    description: zone?.description || '',
  };

  return (
    <NForm id={formId} schema={zoneSchema} defaultValues={defaults} onSubmit={onSubmit}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <FormInput name="name" type="text" formLabel={t('staffScopes.form.name')} required />
        <FormInput name="building" type="text" formLabel={t('staffScopes.form.building')} />
        <FormInput name="floor" type="text" formLabel={t('staffScopes.form.floor')} />
        <div className="md:col-span-2">
          <FormInput name="description" type="textarea" formLabel={t('staffScopes.form.description')} />
        </div>
      </div>
      <div className="flex justify-end pt-3">
        <Button type="submit" form={formId} size="sm">
          {zone ? t('staffScopes.dialogs.updateZone') : t('staffScopes.dialogs.createZone')}
        </Button>
      </div>
    </NForm>
  );
};

const ManageScopesDialog = () => {
  const { t } = useTranslation();
  const { can } = useViewerRole();
  const { zones, refetch: refetchZones, createZone, updateZone, deleteZone } = useZones();
  const { openDialog, confirmDelete, pop } = useDialog();

  const orderedZones = useMemo(() => [...(zones || [])].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''))), [zones]);

  const refreshZones = () => {
    refetchZones();
  };

  const openZoneForm = (zone = null) => {
    const formId = zone ? `zone-edit-${zone.id}` : 'zone-create';
    openDialog({
      title: zone ? `${t('staffScopes.dialogs.editZone')} - ${zone.name}` : t('staffScopes.dialogs.createZoneTitle'),
      children: <ZoneEditorForm zone={zone} formId={formId} onSubmit={async (data) => {
        try {
          if (zone) await updateZone({ id: zone.id, ...cleanZonePayload(data) });
          else await createZone(cleanZonePayload(data));
          refreshZones();
          pop();
        } catch {
          // The CRUD command already announced the refusal; stay open to correct it.
        }
      }} />,
      width: 'lg',
      showButtons: false,
    });
  };

  const confirmZoneDelete = (zone) => {
    confirmDelete({
      title: t('common.delete'),
      warningText: t('common.deleteConfirm'),
      cancelText: t('common.cancel'),
      itemName: zone.name,
      confirmText: t('staffScopes.dialogs.deleteZone'),
      onConfirm: async () => {
        try {
          await deleteZone(zone.id);
          refreshZones();
        } catch {
          // The CRUD command already announced the refusal.
        }
      },
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {can('create:staff') && (
        <div className="flex justify-end">
          <Button size="sm" className="gap-1" onClick={() => openZoneForm()}>
            <Plus className="h-4 w-4" />
            {t('staffScopes.form.addZone')}
          </Button>
        </div>
      )}

      <div className="divide-y rounded-md border">
        {orderedZones.map((zone) => (
          <div key={zone.id} className="flex items-center justify-between gap-3 px-3 py-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="truncate text-sm font-medium">{zone.name}</span>
                <Badge variant="outline" className="text-xs font-mono">{zone.id}</Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                {[zone.building, zone.floor].filter(Boolean).join(' · ') || t('staffScopes.empty.location')}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {can('update:staff') && (
                <Button variant="ghost" size="sm" onClick={() => openZoneForm(zone)} aria-label={`${t('common.edit')} ${zone.name}`}>
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
              {can('delete:staff') && (
                <Button variant="ghost" size="sm" onClick={() => confirmZoneDelete(zone)} className="text-red-600" aria-label={`${t('common.delete')} ${zone.name}`}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
        {orderedZones.length === 0 && (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">{t('staffScopes.empty.zones')}</div>
        )}
      </div>
    </div>
  );
};

export default ManageScopesDialog;
