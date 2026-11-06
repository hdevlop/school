'use client';
import { useState, type KeyboardEvent } from 'react';
import { NButton } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { type MassarSheetDetail, type MassarMark } from '@sms/contracts';
import { useViewerRole } from '@/features/Users/hooks/useViewerRole';
import { useViewingYearKey } from '@/features/AcademicYears/hooks/useViewingAcademicYear';
import { downloadMassar, massarPost, massarPut, useMassarAction, useMassarRead } from '../hooks/useMassar';
import { massarEntrySchema } from '../config/massarSchemas';
import { MassarHeader, MassarLoadError } from './MassarShared';

function SheetGrid({ data, refresh }: { data: MassarSheetDetail; refresh: () => unknown }) {
  const { t } = useTranslation(), viewer = useViewerRole(), action = useMassarAction();
  const [draft, setDraft] = useState<Record<string, MassarMark>>(() => Object.fromEntries(data.students.flatMap(student => data.components.map(component => {
    const key = `${student.id}:${component.code}`;
    return [key, data.marks.find(mark => mark.studentId === student.id && mark.componentCode === component.code) ?? { studentId: student.id, componentCode: component.code, mark: null, absence: 'none' }];
  }))));
  const [dirty, setDirty] = useState(false);
  const schema = massarEntrySchema(data.maxMark, t), marks = Object.values(draft);
  const invalid = marks.some(mark => !schema.safeParse(mark).success), editable = data.canEdit && viewer.can('update:massar-marks');
  const update = (key: string, value: Partial<MassarMark>) => { setDraft({ ...draft, [key]: { ...draft[key], ...value } }); setDirty(true); };
  const keyboard = (event: KeyboardEvent<HTMLInputElement>, row: number, col: number) => {
    let nextRow = row, nextCol = col;
    if (event.key === 'Enter' || event.key === 'ArrowDown') nextRow += event.shiftKey ? -1 : 1;
    else if (event.key === 'ArrowUp') nextRow--;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') nextCol += (event.key === 'ArrowRight' ? 1 : -1) * (getComputedStyle(event.currentTarget).direction === 'rtl' ? -1 : 1);
    else return;
    const input = event.currentTarget.closest('table')?.querySelector<HTMLInputElement>(`[data-row="${nextRow}"][data-col="${nextCol}"]`);
    if (input) { event.preventDefault(); input.focus(); input.select(); }
  };
  const save = async () => { await action.run(() => massarPut(`/sheets/${data.sheet.id}/marks`, { revision: data.sheet.revision, marks })); setDirty(false); };
  return <div className="flex min-h-0 flex-1 flex-col gap-4">
    <div className="flex flex-wrap items-center gap-3 text-sm"><span>{data.sheet.className} · {data.sheet.subjectName}</span><span>{data.round.termLabel} · {data.round.examLabel}</span><span>{t('massar.maxMark')}: {data.maxMark}</span><span>{t(`massar.sheetStatus.${data.sheet.status}`)}</span></div>
    <div className="flex flex-wrap gap-2">
      {editable && <><NButton disabled={action.pending || !dirty || invalid} onClick={save}>{t('massar.save')}</NButton><NButton variant="outline" disabled={action.pending || dirty || invalid} onClick={() => action.run(() => massarPost(`/sheets/${data.sheet.id}/submit`, { revision: data.sheet.revision }))}>{t('massar.submit')}</NButton></>}
      {data.canReopen && <NButton variant="outline" disabled={action.pending || dirty} onClick={() => action.run(() => massarPost(`/sheets/${data.sheet.id}/reopen`, { revision: data.sheet.revision }))}>{t('massar.reopen')}</NButton>}
      <NButton variant="outline" disabled={action.pending} onClick={() => action.run(() => downloadMassar(`/sheets/${data.sheet.id}/empty.xlsx`))}>{t('massar.printSheet')}</NButton>
      {!dirty && <NButton variant="ghost" disabled={action.pending} onClick={() => { void refresh(); }}>{t('massar.retry')}</NButton>}
    </div>
    <p className="text-sm text-muted-foreground">{t(editable ? 'massar.keyboardHelp' : 'massar.readOnly')}</p>
    {dirty && <p role="status" className="text-sm">{t('massar.unsaved')}</p>}
    {invalid && <p role="alert" className="text-sm text-destructive">{t('massar.errors.invalidMark')}</p>}
    <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-border"><table className="w-full border-collapse text-sm">
      <thead className="sticky top-0 z-20 bg-muted"><tr><th className="sticky start-0 z-30 min-w-44 bg-muted p-3 text-start">{t('massar.student')}</th>{data.components.map(component => <th key={component.code} className="min-w-36 whitespace-pre-wrap p-3 text-start">{component.name}</th>)}</tr></thead>
      <tbody>{data.students.map((student, row) => <tr key={student.id} className="border-t border-border"><th className="sticky start-0 z-10 bg-background p-3 text-start font-normal"><span className="block">{student.position + 1}. {student.name}</span><span className="text-xs text-muted-foreground" dir="ltr">{student.studentCode}</span></th>{data.components.map((component, col) => {
        const key = `${student.id}:${component.code}`, mark = draft[key], valid = schema.safeParse(mark).success;
        return <td key={component.code} className="p-2 align-top"><input data-row={row} data-col={col} className={`w-24 rounded-md border bg-background px-2 py-2 ${valid ? 'border-border' : 'border-destructive'}`} type="number" inputMode="decimal" min={0} max={data.maxMark} step="any" value={mark.mark === null ? '' : mark.mark} disabled={!editable || action.pending} aria-invalid={!valid} aria-label={`${student.name} ${component.name}`} onKeyDown={event => keyboard(event, row, col)} onChange={event => update(key, { mark: event.target.value === '' ? null : Number(event.target.value) })} />
          <label className="mt-2 flex items-center gap-2 text-xs"><input type="checkbox" checked={mark.absence === 'justified'} disabled={!editable || action.pending} onChange={event => update(key, { absence: event.target.checked ? 'justified' : 'none' })} />{t('massar.justified')}</label></td>;
      })}</tr>)}</tbody>
    </table></div>
  </div>;
}
function Sheet({ id }: { id: string }) {
  const { t } = useTranslation(), query = useMassarRead<MassarSheetDetail>(`/sheets/${encodeURIComponent(id)}`);
  return <div className="flex h-full min-h-0 flex-col gap-4"><MassarHeader title={t('massar.sheet')} />{query.error ? <MassarLoadError retry={query.refetch} /> : !query.data ? <p role="status">{t('massar.loading')}</p> : <SheetGrid key={`${id}:${query.data.sheet.revision}`} data={query.data} refresh={query.refetch} />}</div>;
}
export function MassarSheetPage({ id }: { id: string }) { const key = useViewingYearKey(); return <Sheet key={`${key}:${id}`} id={id} />; }
