'use client';
import type { MassarBlockedClass, MassarSheetRow } from '@sms/contracts';
import { useTranslation } from 'najm-i18n/react';
import { overview, sheetState, classOrder } from '../config/massarModel';
import { MassarBadge } from './MassarShared';
import styles from './Massar.module.css';

export function SheetBadge({ sheet }: { sheet: MassarSheetRow }) {
  const { t } = useTranslation(), state = sheetState(sheet);
  return <MassarBadge status={state}>{t(`massar.flow.status.${state}`, { count: sheet.total - sheet.missing, total: sheet.total })}{state === 'late' && sheet.missing < sheet.total ? ` ${sheet.total - sheet.missing}/${sheet.total}` : ''}</MassarBadge>;
}
export function MassarOverview({ sheets, blocked, select, fix, disabled }: { sheets: MassarSheetRow[]; blocked: MassarBlockedClass[]; select: (sheet: MassarSheetRow) => void; fix?: (className: string) => void; disabled?: boolean }) {
  const { t } = useTranslation(), model = overview(sheets);
  const classes = [...new Set([...model.classes, ...blocked.map(cls => cls.className)])].sort(classOrder);
  const cell = (sheet: MassarSheetRow) => <button type="button" className={styles.overviewCell} disabled={disabled} onClick={() => select(sheet)} aria-label={`${sheet.className} · ${sheet.subjectName}`}><SheetBadge sheet={sheet} />{model.subjects.length === 1 && <small>{sheet.teacherName ?? t('massar.flow.noTeacher')}</small>}</button>;
  const waiting = (name: string) => <div className={styles.waitingPill}><span>{t('massar.flow.waiting', { count: blocked.find(cls => cls.className === name)?.unmatchedCount ?? 0 })}</span>{fix && <button type="button" className={styles.textButton} onClick={() => fix(name)}>{t('massar.flow.fix')}</button>}</div>;
  return <section className={styles.overview} aria-label={t('massar.flow.overview')}>
    <div className={styles.overviewHead}><h2>{t('massar.flow.doneCount', { count: model.done, total: sheets.length })}</h2><div className={styles.doneBar} aria-hidden><span style={{ width: `${sheets.length ? Math.round(model.done / sheets.length * 100) : 0}%` }} /></div></div>
    {sheets.some(sheet => sheetState(sheet) === 'late') && <p className={styles.lateSummary}>{t('massar.flow.lateCount', { count: sheets.filter(sheet => sheetState(sheet) === 'late').length })}</p>}
    <div className={styles.desktopOverview}><table className={styles.overviewTable}><thead><tr><th>{t('massar.class')}</th>{model.subjects.map(subject => <th key={subject}><bdi>{subject}</bdi></th>)}</tr></thead><tbody>{classes.map(name => <tr key={name}><th scope="row"><bdi>{name}</bdi></th>{blocked.some(cls => cls.className === name) ? <td colSpan={Math.max(1, model.subjects.length)}>{waiting(name)}</td> : model.subjects.map(subject => { const sheet = sheets.find(sheet => sheet.className === name && sheet.subjectName === subject); return <td key={subject}>{sheet ? cell(sheet) : <span aria-label={t('massar.flow.unavailable')}>—</span>}</td>; })}</tr>)}</tbody></table></div>
    <div className={styles.mobileOverview}>{classes.map(name => <article className={styles.panel} key={name}><h3><bdi>{name}</bdi></h3>{blocked.some(cls => cls.className === name) ? waiting(name) : sheets.filter(sheet => sheet.className === name).map(sheet => <div className={styles.mobileSubject} key={sheet.id}><span dir="auto">{sheet.subjectName}</span>{cell(sheet)}</div>)}</article>)}</div>
    <div className={styles.missingTeachers}><h3>{t('massar.flow.missingTeachers')}</h3>{model.missing.length ? model.missing.map(([teacher, pending]) => <div key={teacher ?? 'unassigned'}><strong>{teacher ?? t('massar.flow.noTeacher')}</strong><div className={styles.pendingList}>{pending.map(sheet => <button className={styles.pendingChip} type="button" key={sheet.id} disabled={disabled} onClick={() => select(sheet)}><bdi>{sheet.className}</bdi> · <span dir="auto">{sheet.subjectName}</span></button>)}</div></div>) : <p>{t('massar.flow.allDone')}</p>}</div>
  </section>;
}
