'use client';
import { useState } from 'react';
import Link from 'next/link';
import { NButton, NForm, FormInput, NEmptyState } from 'najm-kit';
import { BookOpen } from 'lucide-react';
import type { MassarRound } from '@sms/contracts';
import { useTranslation } from 'najm-i18n/react';
import { SchoolTable } from '@/components/SchoolTable';
import { useViewerRole } from '@/features/Users/hooks/useViewerRole';
import { useViewingYearKey } from '@/features/AcademicYears/hooks/useViewingAcademicYear';
import { isCountUnknown } from '@/services/apiError';
import { massarPost, useMassarAction, useMassarRead } from '../hooks/useMassar';
import { massarRoundSchema } from '../config/massarSchemas';
import { MassarHeader, tableErrorProps } from './MassarShared';

function Rounds() {
  const { t } = useTranslation(), viewer = useViewerRole();
  const query = useMassarRead<MassarRound[]>('/rounds'), action = useMassarAction();
  const [creating, setCreating] = useState(false);
  const rows = query.data ?? [], manager = viewer.isSchoolWide && viewer.can('manage:massar');
  const card = ({ data: row }: { data: MassarRound }) => <article className="space-y-2 p-4"><Link className="font-medium text-primary" href={`/massar/sheets?roundId=${row.id}`}>{row.termLabel} · {row.examLabel}</Link><p>{t(`massar.roundStatus.${row.status}`)}</p></article>;
  return <div className="flex h-full min-h-0 flex-col gap-4">
    <MassarHeader title={t('massar.rounds')} subtitle={isCountUnknown(query.error, rows, query.isLoading) ? undefined : String(rows.length)} />
    {manager && <NButton disabled={action.pending} onClick={() => setCreating(!creating)}>{t('massar.newRound')}</NButton>}
    {creating && <div className="rounded-xl border border-border p-4"><NForm id="massar-round" schema={massarRoundSchema} defaultValues={{ term: 1, exam: 1, termLabel: 'الدورة الأولى', examLabel: 'الفرض الأول' }} onSubmit={async values => { await action.run(() => massarPost('/rounds', values)); setCreating(false); }}>
      <div className="grid gap-4 sm:grid-cols-2"><FormInput name="term" type="number" formLabel={t('massar.term')} min={1} max={2} /><FormInput name="exam" type="number" formLabel={t('massar.exam')} min={1} max={9} /><FormInput name="termLabel" type="text" formLabel={t('massar.termLabel')} /><FormInput name="examLabel" type="text" formLabel={t('massar.examLabel')} /></div><NButton type="submit" disabled={action.pending}>{t('massar.create')}</NButton>
    </NForm><p className="mt-3 text-sm text-muted-foreground">{t('massar.roundEvidence')}</p></div>}
    <SchoolTable<MassarRound> permissionResource="massar" data={rows} loading={query.isLoading} columns={[
      { accessorKey: 'termLabel', header: t('massar.term') }, { accessorKey: 'examLabel', header: t('massar.exam') },
      { accessorKey: 'status', header: t('massar.status'), cell: ({ row }) => t(`massar.roundStatus.${row.original.status}`) },
      { id: 'progress', header: '', cell: ({ row }) => <Link className="text-primary" href={`/massar/sheets?roundId=${row.original.id}`}>{t('massar.progress')}</Link> },
    ]} renderCard={card} {...tableErrorProps(query.error, query.refetch)} renderEmpty={() => <NEmptyState icon={BookOpen} title={t('massar.noRounds')} />} className="min-h-0 flex-1" />
  </div>;
}
export function MassarRoundsPage() { const key = useViewingYearKey(); return <Rounds key={key} />; }
