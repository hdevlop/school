'use client';
import { useEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent, type ClipboardEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { NajmScroll, NButton } from 'najm-kit';
import { componentLabel } from '../config/componentLabels';
import { LockKeyhole, UserRound } from 'lucide-react';
import { useTranslation } from 'najm-i18n/react';
import { toast } from 'sonner';
import type { MassarSheetDetail } from '@sms/contracts';
import { useViewerRole } from '@/features/Users/hooks/useViewerRole';
import { withAcademicYear } from '@/features/AcademicYears/utils/yearScope';
import { useAcademicYearScope } from '@/features/AcademicYears/hooks/useYearScopedQuery';
import { PlanningPreview } from '@/features/Assessments/planning/PlanningPreview';
import { massarPut, massarPost, useMassarRead, useMassarAction } from '../hooks/useMassar';
import { MassarDraft, cellKey } from '../config/MassarDraft';
import { parseCell, pastedCells, nextCell } from '../config/massarModel';
import { buildMassarDocument, type MassarPaperOptions } from '../config/massarDocument';
import { MassarLoadError } from './MassarShared';
import styles from './Massar.module.css';

// Every column has a fixed width (Massar.module.css): N° 52 + code 132 + name 200, then 112 per mark.
// Unlike Massar's sheet there is no birth date: the marks get the room. The xlsx export keeps it.
const IDENTITY_WIDTH = 384, MARK_WIDTH = 112;
/** School's Latin name of each student, by id: Notes shows it under Massar's Arabic name. */
type LatinNames = ReadonlyMap<string, string>;
/**
 * The students picked on the sheet, whose statements can then be printed: a click (or the focus
 * moving into a row) picks one; Ctrl/⌘ + click adds or removes one (`toggle`).
 */
export type SelectedStudent = { id: string; name: string };
type Selection = { selected?: readonly string[]; onSelect?: (student: SelectedStudent, toggle: boolean) => void };
function EditablePaper({ data, options, onBusy, latinNames, selected, onSelect }: { data: MassarSheetDetail; options: MassarPaperOptions; onBusy: (busy: boolean) => void; latinNames?: LatinNames } & Selection) {
  const { t } = useTranslation(), viewer = useViewerRole(), scope = useAcademicYearScope(), client = useQueryClient(), action = useMassarAction();
  const recoveryKey = `massar-draft:${viewer.userId}:${scope.academicYear}:${data.sheet.id}`;
  // A mouse press focuses a field before its click: the click decides (Ctrl adds), the focus only follows the keyboard.
  const pressing = useRef(false);
  const [engine] = useState(() => {
    const draft = new MassarDraft(data, (revision, marks) => withAcademicYear(scope.academicYear, () => massarPut(`/sheets/${data.sheet.id}/marks`, { revision, marks })));
    try { draft.restore(JSON.parse(sessionStorage.getItem(recoveryKey) ?? 'null')); } catch { /* Storage is optional. */ }
    return draft;
  });
  const state = useSyncExternalStore(engine.subscribe, engine.snapshot, engine.snapshot);
  const [studentIndex, setStudentIndex] = useState(0), [reload, setReload] = useState(false);
  const discardConfirmed = useRef(false);
  const editable = data.canEdit && viewer.can('update:massar-marks');
  const busy = state.dirty || state.saving;
  useEffect(() => { engine.activate(); return () => engine.dispose(); }, [engine]);
  useEffect(() => {
    const persist = () => { try { if (engine.snapshot().dirty) sessionStorage.setItem(recoveryKey, JSON.stringify(engine.recovery())); else sessionStorage.removeItem(recoveryKey); } catch { /* The visible draft still works when storage is unavailable. */ } };
    const unsubscribe = engine.subscribe(persist);
    return () => { persist(); unsubscribe(); };
  }, [engine, recoveryKey]);
  useEffect(() => { engine.sync(data); }, [data, engine]);
  useEffect(() => { onBusy(busy); return () => onBusy(false); }, [busy, onBusy]);
  useEffect(() => {
    if (busy) return;
    void client.invalidateQueries({ queryKey: ['massar'], refetchType: 'none' });
  }, [busy, client]);
  useEffect(() => {
    if (!busy) return;
    const unload = (event: BeforeUnloadEvent) => { if (!discardConfirmed.current) event.preventDefault(); };
    const leave = (event: MouseEvent) => { if ((event.target as HTMLElement)?.closest('a[href]')) { event.preventDefault(); event.stopPropagation(); toast.error(t('massar.flow.finishSaving')); } };
    window.addEventListener('beforeunload', unload); document.addEventListener('click', leave, true);
    return () => { window.removeEventListener('beforeunload', unload); document.removeEventListener('click', leave, true); };
  }, [busy, t]);
  const update = (row: number, col: number, text: string) => {
    const key = cellKey(data.students[row].id, data.components[col].code);
    engine.update({ [key]: /^(a|مبرر)$/i.test(text) ? { text: '', absence: 'justified' } : { text, absence: 'none' } });
  };
  const keyboard = (event: KeyboardEvent<HTMLInputElement>, row: number, col: number) => {
    if (event.key.toLowerCase() === 'a' && !event.ctrlKey && !event.metaKey && !event.altKey) { event.preventDefault(); update(row, col, 'A'); return; }
    const next = nextCell(event.key, row, col, data.students.length, data.components.length, event.shiftKey, true);
    if (!next) return;
    const target = event.currentTarget.closest('table')?.querySelector<HTMLInputElement>(`input[data-row="${next.row}"][data-col="${next.col}"]`);
    if (target) { event.preventDefault(); target.focus(); target.select(); }
  };
  const paste = (event: ClipboardEvent<HTMLInputElement>, row: number, col: number) => {
    event.preventDefault();
    engine.update(Object.fromEntries(pastedCells(event.clipboardData.getData('text/plain'), row, col, data.students.length, data.components.length).map(({ row, col, cell }) => [cellKey(data.students[row].id, data.components[col].code), cell])));
  };
  const field = (row: number, col: number, phone = false) => {
    const student = data.students[row], component = data.components[col], key = cellKey(student.id, component.code), cell = state.cells[key], invalid = !parseCell(cell, data.maxMark);
    // A mark is typed left to right, as a number is, inside the right-to-left Massar sheet.
    return <div className={styles.cellField} data-empty={!cell.text && cell.absence === 'none'}><input type="text" inputMode="decimal" autoComplete="off" dir="ltr" data-row={row} data-col={col} value={cell.absence === 'justified' ? 'مبرر' : cell.text} disabled={!editable} className={styles.markInput} aria-label={`${student.name} · ${component.name}`} aria-invalid={invalid} aria-describedby={invalid ? `invalid-${phone ? 'm' : 'd'}-${row}-${col}` : undefined} onChange={event => update(row, col, event.target.value)} onKeyDown={event => keyboard(event, row, col)} onPaste={event => paste(event, row, col)} />
      {invalid && <small className={styles.invalidMark} id={`invalid-${phone ? 'm' : 'd'}-${row}-${col}`}>{t('massar.flow.maxError', { max: data.maxMark })}</small>}
      {phone && <label className={styles.checkbox}><input type="checkbox" checked={cell.absence === 'justified'} disabled={!editable} onChange={event => engine.update({ [key]: { text: '', absence: event.target.checked ? 'justified' : 'none' } })} />{t('massar.justified')}</label>}
    </div>;
  };
  return <>
    {data.sheet.status === 'exported' && <div className={styles.notice}><LockKeyhole size={18} /><span>{t('massar.flow.status.exported')}</span>{data.canReopen && <NButton size="sm" variant="outline" disabled={action.pending} onClick={() => action.run(() => massarPost(`/sheets/${data.sheet.id}/reopen`, { revision: data.sheet.revision }))}>{t('massar.reopen')}</NButton>}</div>}
    {data.sheet.status === 'changed_after_export' && <p className={styles.notice} data-tone="warning">{t('massar.flow.status.changed_after_export')}</p>}
    {viewer.role === 'supervisor' && <div className={styles.desktopReadonly}><PlanningPreview title={data.sheet.subjectName} html={buildMassarDocument([data], options)} /></div>}
    {/* The sheet reads right to left, as Massar does, whatever the interface language; the arrow keys follow it. */}
    <section className={`${styles.paper} ${viewer.role === 'supervisor' ? styles.supervisedPaper : ''}`} dir="rtl" aria-label={data.sheet.subjectName}>
      {/* The subject is the open tab above (its dot says Massar still has to confirm it); this line says whose sheet it is. */}
      <div className={`${styles.paperMeta} ${styles.paperLine}`}>
        <span><bdi>{data.sheet.className}</bdi> · <span dir="auto">{data.levelLabel}</span> · {t('massar.flow.control', { term: data.round.term, exam: data.round.exam })}</span>
        <span className={styles.sheetTeacher} dir="auto"><UserRound aria-hidden /><span dir="auto">{data.sheet.teacherName ?? t('massar.flow.noTeacher')}</span></span>
      </div>
      {/* As in Massar, every column keeps its width on every subject: a one-part subject is one narrow column, and the sheet starts on the right. */}
      <NajmScroll axis="both" autoHide="leave" className={styles.desktopSheet}><table className={styles.paperTable} data-pick={onSelect ? 'true' : undefined} style={{ width: IDENTITY_WIDTH + data.components.length * MARK_WIDTH }}>
        <colgroup><col className={styles.colNumber} /><col className={styles.colCode} /><col className={styles.colName} />{data.components.map(component => <col key={component.code} className={styles.colMark} />)}</colgroup>
        <thead><tr><th className={styles.stickyNumber}><bdi dir="ltr">N°</bdi></th><th className={styles.stickyCode}>Code Massar</th><th className={styles.stickyName}>{t('massar.student')}</th>{data.components.map(component => <th key={component.code} dir="auto" title={component.name}>{componentLabel(component.name)}</th>)}</tr></thead>
        <tbody>{data.students.map((student, row) => <tr key={student.id} data-selected={selected?.includes(student.id) || undefined}
          onMouseDown={() => { pressing.current = true; }}
          onClick={event => { pressing.current = false; onSelect?.({ id: student.id, name: student.name }, event.ctrlKey || event.metaKey); }}
          onFocus={() => { if (!pressing.current && !selected?.includes(student.id)) onSelect?.({ id: student.id, name: student.name }, false); }}><td className={styles.stickyNumber}>{student.position + 1}</td><td className={styles.stickyCode} dir="ltr">{student.studentCode}</td><th scope="row" className={styles.stickyName} dir="auto" title={[student.name, latinNames?.get(student.id)].filter(Boolean).join(' · ')}>{latinNames?.get(student.id) ? <><bdi lang="ar" dir="rtl" className="block truncate">{student.name}</bdi><bdi dir="ltr" className={styles.latinName}>{latinNames.get(student.id)}</bdi></> : student.name}</th>{data.components.map((component, col) => <td key={component.code}>{field(row, col)}</td>)}</tr>)}</tbody>
      </table></NajmScroll>
      <div className={styles.phoneSheet}>{data.students.length > 0 && <><div className={styles.studentPaging}><NButton variant="outline" size="sm" disabled={!studentIndex} onClick={() => setStudentIndex(studentIndex - 1)}>‹</NButton><div><strong dir="auto">{data.students[studentIndex].name}</strong><small dir="ltr">{data.students[studentIndex].studentCode} · {data.students[studentIndex].dateOfBirth}</small><small>{studentIndex + 1} / {data.students.length}</small></div><NButton variant="outline" size="sm" disabled={studentIndex === data.students.length - 1} onClick={() => setStudentIndex(studentIndex + 1)}>›</NButton></div>{data.components.map((component, col) => <div className={styles.phoneComponent} key={component.code}><span dir="auto">{component.name} <small>/{data.maxMark}</small></span>{field(studentIndex, col, true)}</div>)}</>}</div>
    </section>
    {/* The sheet has no footer: saving is announced to screen readers, and the bar shows only when there is something to do.
        A save on its way is not: typing a mark never brings the bar up. */}
    <span className="sr-only" role="status">{t(state.error || state.invalid ? 'massar.flow.saveFailed' : state.saving || state.dirty ? 'massar.flow.saving' : 'massar.flow.saved')}</span>
    {(state.error || state.invalid || !editable || reload) && <div className={styles.saveBar}><span>{t(state.error || state.invalid ? 'massar.flow.saveFailed' : state.saving || state.dirty ? 'massar.flow.saving' : 'massar.flow.saved')} · {t('massar.ui.completed', { count: state.completed, total: data.students.length * data.components.length })}</span>{state.error && <><span>{state.error}</span><NButton size="sm" variant="outline" onClick={() => engine.retry()}>{t('massar.flow.retrySave')}</NButton></>}{state.invalid && <span className={styles.invalidMark}>{t('massar.flow.maxError', { max: data.maxMark })}</span>}{!editable && <span>{t('massar.readOnly')}</span>}
      {state.error && !reload && <NButton size="sm" variant="ghost" onClick={() => setReload(true)}>{t('massar.flow.discard')}</NButton>}
      {reload && <span>{t('massar.flow.discardConfirm')} <NButton size="sm" variant="outline" disabled={state.saving} onClick={() => { discardConfirmed.current = true; engine.discard(); try { sessionStorage.removeItem(recoveryKey); } catch { /* Optional storage. */ } window.location.reload(); }}>{t('massar.flow.reload')}</NButton><NButton size="sm" variant="ghost" onClick={() => setReload(false)}>{t('massar.cancel')}</NButton></span>}
    </div>}
  </>;
}
export function MassarPaper({ id, options, onBusy, latinNames, selected, onSelect }: { id: string; options: MassarPaperOptions; onBusy: (busy: boolean) => void; latinNames?: LatinNames } & Selection) {
  const query = useMassarRead<MassarSheetDetail>(`/sheets/${encodeURIComponent(id)}`, true, 15000), { t } = useTranslation();
  return query.error ? <MassarLoadError error={query.error} retry={query.refetch} /> : !query.data ? <p role="status" className={styles.sheetLoading}>{t('massar.loading')}</p> : <EditablePaper key={id} data={query.data} options={options} onBusy={onBusy} latinNames={latinNames} selected={selected} onSelect={onSelect} />;
}
