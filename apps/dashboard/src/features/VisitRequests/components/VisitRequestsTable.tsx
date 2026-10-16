'use client';
import { NPageHeader, NButton, NForm, FormInput, useDialog } from 'najm-kit';
import { SchoolTable as NTable } from '@/components/SchoolTable';
import { useTranslation } from 'najm-i18n/react';
import { usePermissions } from 'najm-auth/client/react';
import { useVisitRequests } from '../hooks/useVisitRequests';
import { FEATURE_ICONS } from '@/shared/featureIcons';
import { isCountUnknown, hasFailedToLoad } from '@/services/apiError';
import { VISIT_REQUEST_STATUS_VALUES } from '@sms/contracts';
import { z } from 'zod';
import { useState } from 'react';

const staffSchema = z.object({ status: z.enum(VISIT_REQUEST_STATUS_VALUES), staffNote: z.string().max(2000) });
function StaffForm({ row }: { row: VisitRequestRow }) {
  const { t } = useTranslation(); const { pop } = useDialog();
  return <NForm id="visit-request-staff" schema={staffSchema} defaultValues={{ status: row.status as typeof VISIT_REQUEST_STATUS_VALUES[number], staffNote: row.staffNote || '' }} onSubmit={input => pop(input)}>
    <p className="text-sm text-muted-foreground">{row.message}</p><FormInput name="status" type="select" formLabel={t('visitRequests.status')} items={VISIT_REQUEST_STATUS_VALUES.map(value => ({ value, label: t(`status.${value}`) }))} />
    <FormInput name="staffNote" type="textarea" formLabel={t('visitRequests.staffNote')} maxLength={2000} />
  </NForm>;
}

interface VisitRequestRow { id: string; parentName: string; phone: string; email: string | null; message: string | null; status: string; staffNote: string | null; createdAt: string }
function VisitRequestCard({ data }: { data: VisitRequestRow }) {
  const { t } = useTranslation();
  return <article className="space-y-2 p-4"><h2 className="font-semibold">{data.parentName}</h2><p>{t(`status.${data.status}`)}</p><a className="block text-primary" href={`tel:${data.phone}`}>{data.phone}</a>{data.email && <a className="block break-all text-primary" href={`mailto:${data.email}`}>{data.email}</a>}<p className="text-sm text-muted-foreground">{data.message}</p></article>;
}
export function VisitRequestsTable() {
  const { t } = useTranslation();
  const { can } = usePermissions();
  const { openDialog } = useDialog();
  const { data, error, isLoading, updateRequest } = useVisitRequests();
  const [status, setStatus] = useState('');
  const rows: VisitRequestRow[] = Array.isArray(data) ? data : [];
  const failed = hasFailedToLoad(error, rows);
  const edit = (row: VisitRequestRow) => openDialog({ title: row.parentName,
    children: <StaffForm row={row} />, primaryButton: { form: 'visit-request-staff', text: t('visitRequests.save'), onClick: async input => { await updateRequest({ id: row.id, ...input }); } } });
  const columns = [
    { accessorKey: 'parentName', header: t('visitRequests.form.name') }, { accessorKey: 'phone', header: t('visitRequests.form.phone') },
    { accessorKey: 'email', header: t('visitRequests.form.email') }, { accessorKey: 'status', header: t('visitRequests.status'), cell: ({ row }: { row: { original: VisitRequestRow } }) => t(`status.${row.original.status}`) },
    { accessorKey: 'message', header: t('visitRequests.form.message') },
    ...(can('update:visit-requests') ? [{ id: 'edit', header: '', cell: ({ row }: { row: { original: VisitRequestRow } }) => <NButton variant="outline" onClick={() => edit(row.original)}>{t('visitRequests.save')}</NButton> }] : []),
  ];
  return <div className="flex h-full min-h-0 flex-col gap-4"><NPageHeader icon={FEATURE_ICONS.visitRequests} title={t('visitRequests.title')} subtitle={isCountUnknown(error, rows, isLoading) ? undefined : String(rows.length)} />
    <label className="flex items-center gap-3 text-sm">{t('visitRequests.status')}<select className="rounded-lg border border-border bg-background px-3 py-2" value={status} onChange={event=>setStatus(event.target.value)}><option value="">{t('common.all')}</option>{VISIT_REQUEST_STATUS_VALUES.map(value=><option key={value} value={value}>{t(`status.${value}`)}</option>)}</select></label>
    <NTable data={status ? rows.filter(row=>row.status===status) : rows} columns={columns} loading={isLoading} onEdit={can('update:visit-requests') ? edit : undefined} renderCard={VisitRequestCard} error={failed ? error : null} renderError={() => <p role="alert">{t('visitRequests.loadFailed')}</p>} renderEmpty={() => <p>{t('visitRequests.empty')}</p>} className="min-h-0 flex-1" />
  </div>;
}
