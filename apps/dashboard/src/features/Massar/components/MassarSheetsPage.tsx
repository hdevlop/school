'use client';
import { useState } from 'react';
import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import { NButton, NEmptyState } from 'najm-kit';
import { MASSAR_SHEET_STATUS_VALUES, type MassarBlockedClass, type MassarRound, type MassarSheetRow, type MassarSetup } from '@sms/contracts';
import { useTranslation } from 'najm-i18n/react';
import { SchoolTable } from '@/components/SchoolTable';
import { useViewerRole } from '@/features/Users/hooks/useViewerRole';
import { useViewingYearKey } from '@/features/AcademicYears/hooks/useViewingAcademicYear';
import { isCountUnknown } from '@/services/apiError';
import { downloadMassar, massarPost, useMassarAction, useMassarRead } from '../hooks/useMassar';
import { MassarHeader, massarControlClass, tableErrorProps } from './MassarShared';

function Sheets({ initialRoundId }: { initialRoundId?: string }) {
  const { t } = useTranslation(), viewer = useViewerRole(), action = useMassarAction();
  const [roundId, setRound] = useState(initialRoundId ?? ''), [status, setStatus] = useState(''), [className, setClass] = useState(''), [missing, setMissing] = useState(false), [selected, setSelected] = useState<string[]>([]), [exporting, setExporting] = useState(false);
  const manager = viewer.isSchoolWide && viewer.can('manage:massar');
  const query = useMassarRead<MassarSheetRow[]>(`/sheets${roundId ? `?roundId=${encodeURIComponent(roundId)}` : ''}`), rounds = useMassarRead<MassarRound[]>('/rounds');
  const setup = useMassarRead<MassarSetup>('/setup', manager);
  const blocked = useMassarRead<MassarBlockedClass[]>(`/rounds/${roundId}/blocked-classes`, manager && !!roundId);
  const rows = (query.data ?? []).filter(row => viewer.role !== 'teacher' || !!roundId || row.roundStatus !== 'closed'), visible = rows.filter(row => (!status || row.status === status) && (!className || row.className === className) && (!missing || row.missing > 0));
  const exportingRows = selected.length ? visible.filter(row => selected.includes(row.id)) : visible;
  const chosenRound = rounds.data?.find(round => round.id === roundId);
  const download = async (empty: boolean) => { await action.run(() => downloadMassar('/export', { sheetIds: exportingRows.map(row => row.id), empty }, 'massar.zip')); setExporting(false); };
  const card = ({ data: row }: { data: MassarSheetRow }) => <article className="space-y-2 p-4"><Link href={`/massar/sheets/${row.id}`} className="font-medium text-primary">{row.className} · {row.subjectName}</Link><p>{row.termLabel} · {row.examLabel}</p><p>{row.teacherName || t('massar.noTeacher')}</p><p>{t(`massar.sheetStatus.${row.status}`)} · {t('massar.missing')}: {row.missing}/{row.total}</p>{manager && <label className="flex min-h-10 items-center gap-2"><input type="checkbox" checked={selected.includes(row.id)} onChange={event => setSelected(event.target.checked ? [...selected, row.id] : selected.filter(id => id !== row.id))} />{t('massar.select')}</label>}</article>;
  return <div className="flex h-full min-h-0 flex-col gap-4"><MassarHeader title={t(viewer.role === 'teacher' ? 'massar.mySheets' : 'massar.allSheets')} subtitle={isCountUnknown(query.error, rows, query.isLoading) ? undefined : String(rows.length)} />
    <div className="flex flex-wrap items-end gap-3">
      <label className="grid gap-1 text-sm">{t('massar.round')}<select className={massarControlClass} value={roundId} onChange={event => { setRound(event.target.value); setSelected([]); setExporting(false); }}><option value="">{t('massar.all')}</option>{rounds.data?.map(round => <option key={round.id} value={round.id}>{round.termLabel} · {round.examLabel}</option>)}</select></label>
      <label className="grid gap-1 text-sm">{t('massar.class')}<select className={massarControlClass} value={className} onChange={event => setClass(event.target.value)}><option value="">{t('massar.all')}</option>{[...new Set(rows.map(row => row.className))].map(name => <option key={name}>{name}</option>)}</select></label>
      <label className="grid gap-1 text-sm">{t('massar.status')}<select className={massarControlClass} value={status} onChange={event => setStatus(event.target.value)}><option value="">{t('massar.all')}</option>{MASSAR_SHEET_STATUS_VALUES.map(value => <option key={value} value={value}>{t(`massar.sheetStatus.${value}`)}</option>)}</select></label>
      <label className="flex min-h-10 items-center gap-2 text-sm"><input type="checkbox" checked={missing} onChange={event => setMissing(event.target.checked)} />{t('massar.missingOnly')}</label>
    </div>
    {rounds.error && <p role="alert">{t('massar.loadFailed')}</p>}
    {manager && roundId && <div className="space-y-2">
      {blocked.error && <p role="alert">{t('massar.loadFailed')}</p>}
      {blocked.data?.map(cls => <p key={cls.className} role="alert" className="rounded-lg border border-destructive/30 p-3 text-sm">{t('massar.blockedClass', { name: cls.className, count: cls.unmatchedCount })} <Link className="text-primary underline" href="/massar/setup">{t('massar.setup')}</Link></p>)}
    </div>}
    {roundId && <div className="flex flex-wrap gap-2"><NButton variant="outline" disabled={action.pending} onClick={() => action.run(() => downloadMassar(`/rounds/${roundId}/progress.csv`, undefined, 'massar-progress.csv'))}>{t('massar.downloadProgress')}</NButton>
      {manager && <><NButton disabled={!exportingRows.length || action.pending || !!query.error || chosenRound?.status === 'closed'} onClick={() => setExporting(true)}>{t('massar.export')}</NButton><NButton variant="outline" disabled={action.pending} onClick={() => action.run(() => massarPost(`/rounds/${roundId}/${chosenRound?.status === 'closed' ? 'reopen' : 'close'}`))}>{t(chosenRound?.status === 'closed' ? 'massar.reopen' : 'massar.closeRound')}</NButton></>}
    </div>}
    {exporting && <div className="space-y-3 rounded-xl border border-border p-4"><p>{t('massar.exportReview', { count: exportingRows.length, missing: exportingRows.reduce((n, row) => n + row.missing, 0) })}</p><ul className="max-h-40 overflow-auto text-sm">{exportingRows.filter(row => row.missing > 0).map(row => <li key={row.id}>{row.className} · {row.subjectName}: {row.missing} {t('massar.missing')}</li>)}</ul><p className="text-sm text-muted-foreground">{t('massar.exportGate')}</p><div className="flex flex-wrap gap-2"><NButton disabled={action.pending} onClick={() => download(true)}>{t('massar.emptyZip')}</NButton><NButton disabled={action.pending || !setup.data?.filledExportVerified} onClick={() => download(false)}>{t('massar.filledZip')}</NButton><NButton variant="outline" disabled={action.pending} onClick={() => setExporting(false)}>{t('massar.cancel')}</NButton></div></div>}
    <SchoolTable<MassarSheetRow> permissionResource="massar" data={visible} loading={query.isLoading} columns={[
      ...(manager ? [{ id: 'select', header: t('massar.select'), cell: ({ row }: { row: { original: MassarSheetRow } }) => <input type="checkbox" aria-label={`${t('massar.select')} ${row.original.className} ${row.original.subjectName}`} checked={selected.includes(row.original.id)} onChange={event => setSelected(event.target.checked ? [...selected, row.original.id] : selected.filter(id => id !== row.original.id))} /> }] : []),
      { accessorKey: 'className', header: t('massar.class') }, { accessorKey: 'subjectName', header: t('massar.subject'), cell: ({ row }) => <Link className="text-primary" href={`/massar/sheets/${row.original.id}`}>{row.original.subjectName}</Link> },
      { id: 'round', header: t('massar.round'), cell: ({ row }) => `${row.original.termLabel} · ${row.original.examLabel}` },
      { accessorKey: 'teacherName', header: t('massar.teacher'), cell: ({ row }) => row.original.teacherName || t('massar.noTeacher') },
      { accessorKey: 'status', header: t('massar.status'), cell: ({ row }) => t(`massar.sheetStatus.${row.original.status}`) }, { accessorKey: 'missing', header: t('massar.missing') },
    ]} renderCard={card} {...tableErrorProps(query.error, query.refetch)} renderEmpty={() => <NEmptyState icon={BookOpen} title={t('massar.noSheets')} />} className="min-h-0 flex-1" />
  </div>;
}
export function MassarSheetsPage(props: { initialRoundId?: string }) { const key = useViewingYearKey(); return <Sheets key={key} {...props} />; }
