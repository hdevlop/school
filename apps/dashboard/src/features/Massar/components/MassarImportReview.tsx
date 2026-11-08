'use client';
import { useState } from 'react';
import { ArrowLeftRight, BookOpen, PencilLine, RefreshCw, UserPlus, Users } from 'lucide-react';
import { NajmScroll, NButton } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { canEditStudentPlacement } from '@sms/contracts/access-control';
import type { MassarImportPreview, MassarMappings, MassarPreviewStudent, MassarSetup, MassarStudentDecisions } from '@sms/contracts';
import { useViewerRole } from '@/features/Users/hooks/useViewerRole';
import { classOrder } from '../config/massarModel';
import { MassarBadge, MassarSelect } from './MassarShared';
import styles from './Massar.module.css';

type PreviewClass = MassarImportPreview['classes'][number];
type Row = { cls: PreviewClass; student: MassarPreviewStudent };
type Addition = 'M' | 'F' | 'skip';
const displayDate = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date) ? date.split('-').reverse().join('/') : date;

/** One Massar subject across every level that uses it: chosen once. */
function subjectGroups(preview: MassarImportPreview, mappings: MassarMappings) {
  const groups = new Map<string, { code: string; name: string; subjectId: string | null }>();
  for (const subject of preview.subjects) {
    const chosen = mappings.subjects.find(item => item.level === subject.level && item.code === subject.code)?.subjectId ?? null;
    const group = groups.get(subject.code) ?? { code: subject.code, name: subject.name, subjectId: chosen };
    if (group.subjectId !== chosen) group.subjectId = null;
    groups.set(subject.code, group);
  }
  return [...groups.values()];
}

/**
 * The import check. Problems are grouped by the decision they need ("same
 * student?", "not in School yet", "different in School"); every decision is only marked here and is
 * applied by the server with the import itself.
 */
export function MassarImportReview({ preview, setup, pending, cancel, commit, recheck }: {
  preview: MassarImportPreview; setup: MassarSetup; pending: boolean;
  cancel: () => Promise<void>; commit: (data: MassarMappings & MassarStudentDecisions) => Promise<void>; recheck: () => Promise<void>;
}) {
  const { t } = useTranslation(), viewer = useViewerRole();
  const [mappings, setMappings] = useState<MassarMappings>(preview), [subjectEdit, setSubjectEdit] = useState<string[]>([]);
  const [same, setSame] = useState<Record<string, boolean>>({}), [added, setAdded] = useState<Record<string, Addition>>({});
  // Massar is the reference: a different class or birth date follows Massar unless kept.
  const [kept, setKept] = useState<Record<string, boolean>>({}), [confirming, setConfirming] = useState(false);
  const canDecide = viewer.can('update:students'), canAdd = viewer.can('create:students'), canFix = canDecide && canEditStudentPlacement(viewer.role);
  const students = preview.classes.reduce((count, cls) => count + cls.students.length, 0);
  const subjects = subjectGroups(preview, mappings);
  const schoolSubject = (group: { subjectId: string | null }) => setup.appSubjects.find(app => app.id === group.subjectId);
  // A subject without a School match is a decision, at the top; it stays there once chosen, so the row does not jump away.
  const [toChoose] = useState(() => subjects.filter(group => !schoolSubject(group)).map(group => group.code));
  const unchosen = subjects.filter(group => !schoolSubject(group));
  const choosing = subjects.filter(group => toChoose.includes(group.code) || subjectEdit.includes(group.code) || !schoolSubject(group));
  const chosen = subjects.filter(group => !choosing.includes(group));
  const levelCount = (code: string) => preview.subjects.filter(subject => subject.code === code).length;
  const classes = [...preview.classes].sort((a, b) => classOrder(a.name, b.name));
  const unmatched: Row[] = classes.flatMap(cls => cls.students.filter(student => !student.studentId).map(student => ({ cls, student })));
  const matchRows = unmatched.filter(row => row.student.suggestion);
  // A rejected suggestion leaves a Massar student School does not have yet.
  const newRows = unmatched.filter(row => !row.student.suggestion || same[row.student.studentCode] === false);
  const resolved = (row: Row) => same[row.student.studentCode] === true || ['M', 'F'].includes(added[row.student.studentCode] ?? '');
  const mapped = (cls: PreviewClass) => !!mappings.classes.find(item => item.name === cls.name)?.classId;
  const waiting = classes.filter(cls => !mapped(cls) || unmatched.some(row => row.cls === cls && !resolved(row)));
  const ready = classes.filter(cls => mapped(cls) && !unmatched.some(row => row.cls === cls));
  const canImport = preview.hasCleanTemplate && preview.acceptedCount > 0;
  // Rows nobody answered: importing leaves their classes waiting, so the import asks first.
  const isUndecided = (row: Row) => row.student.suggestion && same[row.student.studentCode] !== false ? canDecide && same[row.student.studentCode] === undefined : canAdd && !added[row.student.studentCode];
  const undecided = unmatched.filter(isUndecided), asking = confirming && (undecided.length > 0 || unchosen.length > 0);
  // The birth date always follows Massar; only the class and the Arabic name can be kept.
  const choosable = (row: Row) => !!row.student.school && (row.student.school.placeDiffers || row.student.school.nameDiffers);
  const fixRows: Row[] = classes.flatMap(cls => cls.students.filter(student => student.school && (student.studentId || same[student.studentCode] === true)).map(student => ({ cls, student })));

  const chooseSubject = (code: string, subjectId: string) => setMappings({
    ...mappings, subjects: mappings.subjects.map(item => item.code === code ? { ...item, subjectId: subjectId || null } : item),
  });
  const decide = (code: string, value: boolean) => setSame({ ...same, [code]: value });
  const acceptStrong = () => setSame({ ...same, ...Object.fromEntries(matchRows.filter(row => row.student.suggestion!.strong).map(row => [row.student.studentCode, true])) });
  const submit = () => commit({
    ...mappings,
    matches: matchRows.filter(row => same[row.student.studentCode] === true).map(row => ({ studentCode: row.student.studentCode, studentId: row.student.suggestion!.studentId })),
    additions: newRows.flatMap(row => { const gender = added[row.student.studentCode]; return gender === 'M' || gender === 'F' ? [{ studentCode: row.student.studentCode, gender }] : []; }),
    fixes: canFix ? fixRows.filter(row => choosable(row) && !kept[row.student.studentCode]).map(row => row.student.studentCode) : [],
  });
  const placeName = (classId: string | null, sectionId: string | null) =>
    `${setup.appClasses.find(item => item.id === classId)?.name ?? '—'} ${setup.appSections.find(item => item.id === sectionId)?.name ?? ''}`.trim();
  const schoolClassName = (cls: PreviewClass) => {
    const mapping = mappings.classes.find(item => item.name === cls.name);
    const schoolClass = setup.appClasses.find(item => item.id === mapping?.classId), section = setup.appSections.find(item => item.id === mapping?.sectionId);
    return schoolClass ? `${schoolClass.name} ${section?.name ?? ''}`.trim() : t('massar.flow.matchClass');
  };
  const classTag = (cls: PreviewClass) => <bdi className={styles.classTag} title={schoolClassName(cls)}>{cls.name}</bdi>;

  // Information only: active School students that no Massar file lists, for the registrar to check.
  const info = classes.flatMap(cls => cls.missing.map(student => ({ key: `${cls.name}:out:${student.studentCode}`, cls: schoolClassName(cls), name: student.name, title: student.studentCode })));

  return <section className={styles.importReview}>
      <header className={styles.reviewHead}>
        <p className={styles.reviewSummary}>{t('massar.flow.importSummary', { files: preview.acceptedCount, classes: preview.classes.length, students })}</p>
        <MassarBadge status="ready">✓ {t('massar.flow.countReady', { count: ready.length })}</MassarBadge>
        {unmatched.length > 0 && <MassarBadge status="warning">⏸ {t('massar.flow.countToFix', { count: unmatched.length })}</MassarBadge>}
        {preview.refused.length > 0 && <MassarBadge status="error">✗ {t('massar.flow.countRefused', { count: preview.refused.length })}</MassarBadge>}
        {unchosen.length > 0 && <MassarBadge status="warning">⏸ {t('massar.flow.countSubjects', { count: unchosen.length })}</MassarBadge>}
      </header>

      {!preview.hasCleanTemplate && <p role="alert" className={styles.notice} data-tone="warning">{t('massar.errors.noCleanTemplate')}</p>}

    <NajmScroll axis="y" autoHide="scroll" className={styles.reviewScroll}>
      <div className={styles.reviewDecisions}>
      {choosing.length > 0 && <div className={styles.decisionBlock}>
        <div className={styles.blockTitle}>
          <span><BookOpen aria-hidden className={styles.blockIcon} /><strong>{t('massar.flow.subjectsTitle')}</strong> <span className={styles.subtle}>· {t('massar.flow.subjectsHelp')}</span></span>
        </div>
        {choosing.map(group => {
          const found = schoolSubject(group);
          return <div className={styles.decisionRow} key={group.code} data-undecided={asking && !found}>
            <bdi className={styles.classTag}>{group.code}</bdi>
            <div className={styles.decisionText}><bdi dir="auto">{group.name}</bdi><small className={styles.subtle}>{t('massar.flow.subjectLevels', { count: levelCount(group.code) })}</small></div>
            <div className={styles.subjectSelect}>
              <MassarSelect ariaLabel={`${group.name} · ${t('massar.ui.schoolSubject')}`} value={group.subjectId ?? ''} disabled={pending} onChange={value => chooseSubject(group.code, value)}
                items={[{ value: '', label: t('massar.flow.matchSubject') }, ...setup.appSubjects.map(app => ({ value: app.id, label: app.name }))]} />
            </div>
          </div>;
        })}
      </div>}

      {matchRows.length > 0 && <div className={styles.decisionBlock}>
        <div className={styles.blockTitle}>
          <span><Users aria-hidden className={styles.blockIcon} /><strong>{t('massar.flow.matchesTitle')}</strong> <span className={styles.subtle}>· {t('massar.flow.matchesHelp')}</span></span>
          {canDecide && matchRows.some(row => row.student.suggestion!.strong) && <button type="button" className={styles.linkButton} disabled={pending} onClick={acceptStrong}>{t('massar.flow.acceptStrong')}</button>}
        </div>
        {matchRows.map(({ cls, student }) => {
          const suggestion = student.suggestion!, choice = same[student.studentCode];
          return <div className={styles.decisionRow} key={student.studentCode} data-undecided={asking && isUndecided({ cls, student })}>
            {classTag(cls)}
            <div className={styles.decisionText}>
              <div className={styles.decisionNames}>
                <bdi dir="auto" title={`${t('massar.flow.massarSide')} · ${student.studentCode} · ${displayDate(student.dateOfBirth)}`}>{student.name}</bdi>
                <ArrowLeftRight aria-hidden className={styles.matchArrow} />
                <bdi dir="auto" title={`${t('massar.flow.schoolSide')} · ${suggestion.studentCode}`}>{suggestion.name}</bdi>
              </div>
              <small className={suggestion.strong ? styles.reasonStrong : styles.subtle}>{suggestion.reasons.map(reason => t(`massar.flow.reason.${reason}`)).join(' · ')}</small>
            </div>
            {canDecide && <div className={styles.segmented} role="group" aria-label={t('massar.flow.matchesTitle')}>
              <button type="button" aria-pressed={choice === true} data-tone="ok" disabled={pending} title={t('massar.flow.sameStudentHelp', { code: student.studentCode })} onClick={() => decide(student.studentCode, true)}>{choice === true ? '✓ ' : ''}{t('massar.flow.same')}</button>
              <button type="button" aria-pressed={choice === false} disabled={pending} onClick={() => decide(student.studentCode, false)}>{t('massar.flow.different')}</button>
            </div>}
          </div>;
        })}
      </div>}

      {newRows.length > 0 && <div className={styles.decisionBlock}>
        <div className={styles.blockTitle}>
          <span><UserPlus aria-hidden className={styles.blockIcon} /><strong>{t('massar.flow.newTitle')}</strong> <span className={styles.subtle}>· {t('massar.flow.newHelp')}</span></span>
        </div>
        {newRows.map(({ cls, student }) => {
          const choice = added[student.studentCode];
          return <div className={styles.decisionRow} key={student.studentCode} data-undecided={asking && isUndecided({ cls, student })}>
            {classTag(cls)}
            <div className={styles.decisionText}><bdi dir="auto" title={`${student.studentCode} · ${displayDate(student.dateOfBirth)}`}>{student.name}</bdi>
              <small className={styles.subtle}>{student.studentCode} · {displayDate(student.dateOfBirth)}</small></div>
            {canAdd && <div className={styles.segmented} role="group" aria-label={t('massar.flow.newTitle')}>
              {(['M', 'F', 'skip'] as const).map(value => <button key={value} type="button" aria-pressed={choice === value} data-tone={value === 'skip' ? undefined : 'ok'} disabled={pending} onClick={() => setAdded({ ...added, [student.studentCode]: value })}>
                {t(value === 'M' ? 'massar.flow.addBoy' : value === 'F' ? 'massar.flow.addGirl' : 'massar.flow.skip')}</button>)}
            </div>}
          </div>;
        })}
      </div>}

      {fixRows.length > 0 && <div className={styles.decisionBlock}>
        <div className={styles.blockTitle}>
          <span><PencilLine aria-hidden className={styles.blockIcon} /><strong>{t('massar.flow.fixTitle')}</strong> <span className={styles.subtle}>· {t(canFix ? 'massar.flow.fixHelp' : 'massar.flow.fixReadOnly')}</span></span>
        </div>
        {fixRows.map(({ cls, student }) => {
          const school = student.school!, keep = kept[student.studentCode] === true;
          const changes = [
            school.placeDiffers && t('massar.flow.classChange', { from: placeName(school.classId, school.sectionId), to: schoolClassName(cls) }),
            school.dateDiffers && t('massar.flow.birthDateChange', { from: school.dateOfBirth ? displayDate(school.dateOfBirth) : '—', to: displayDate(student.dateOfBirth) }),
            school.nameDiffers && t('massar.flow.arabicNameChange', { from: school.arabicName ?? '—', to: student.name }),
          ].filter(Boolean).join(' · ');
          return <div className={styles.decisionRow} key={student.studentCode}>
            {classTag(cls)}
            <div className={styles.decisionText}><bdi dir="auto" title={student.studentCode}>{student.suggestion?.name ?? student.name}</bdi><small className={styles.subtle}>{changes}</small></div>
            {canFix && choosable({ cls, student }) && <div className={styles.segmented} role="group" aria-label={t('massar.flow.fixTitle')}>
              <button type="button" aria-pressed={!keep} data-tone="ok" disabled={pending} onClick={() => setKept({ ...kept, [student.studentCode]: false })}>{!keep ? '✓ ' : ''}{t('massar.flow.useMassar')}</button>
              <button type="button" aria-pressed={keep} disabled={pending} onClick={() => setKept({ ...kept, [student.studentCode]: true })}>{t('massar.flow.keepSchool')}</button>
            </div>}
          </div>;
        })}
      </div>}

      {/* Subjects taken from last year's files that these files confirm; marks on parts Massar does not have go. */}
      {preview.subjects.some(subject => subject.confirms) && <div className={styles.reviewBlock}>
        <h3>{t('massar.flow.confirmsTitle', { count: preview.subjects.filter(subject => subject.confirms).length })}</h3>
        {preview.subjects.filter(subject => subject.confirms && subject.lostMarks).map(subject => <p key={`${subject.level}:${subject.code}`} role="alert" className={styles.notice} data-tone="warning">
          {t('massar.flow.lostMarks', { name: subject.name, level: subject.level, count: subject.lostMarks })}</p>)}
      </div>}

      {preview.refused.length > 0 && <div className={styles.reviewBlock}>
        <h3>{t('massar.flow.refusedFiles', { count: preview.refused.length })}</h3>
        {preview.refused.map((file, index) => <details className={styles.reviewMore} key={index}><summary>{t('massar.flow.fileRefused', { name: file.name })}</summary><p role="alert">{t(`massar.errors.${file.key}`)}</p><p>{t('massar.flow.exportAgain')}</p></details>)}
      </div>}
      </div>
    </NajmScroll>

    {(ready.length > 0 || chosen.length > 0 || info.length > 0) && <NajmScroll axis="y" autoHide="scroll" className={styles.reviewStatus}>
      <div className={styles.reviewStatusContent}>
      {ready.length > 0 && <details className={styles.reviewBlock} open={unmatched.length === 0}>
        <summary><h3>{t('massar.flow.readyClasses', { count: ready.length })}</h3></summary>
        <div className={styles.readyList}>{ready.map(cls => <span key={cls.name} className={styles.readyChip}>✓ <bdi>{cls.name}</bdi> <span className={styles.subtle}>→ {schoolClassName(cls)}</span></span>)}</div>
      </details>}

      {chosen.length > 0 && <details className={styles.reviewBlock} open={unmatched.length === 0}>
        <summary><h3>{t('massar.flow.subjectsDone', { count: chosen.length })}</h3></summary>
        <div className={styles.readyList}>{chosen.map(group => <button type="button" key={group.code} className={`${styles.readyChip} ${styles.chipButton}`} disabled={pending}
          title={t('massar.flow.changeSubject', { name: group.name })} onClick={() => setSubjectEdit([...subjectEdit, group.code])}>
          ✓ <bdi dir="auto">{group.name}</bdi> <span className={styles.subtle}>→ <bdi dir="auto">{schoolSubject(group)!.name}</bdi></span></button>)}</div>
      </details>}

      {info.length > 0 && <details className={styles.reviewBlock}>
        <summary><h3>{t('massar.flow.notInMassarTitle', { count: info.length })}</h3></summary>
        <p className={styles.subtle}>{t('massar.flow.notInMassarHelp')}</p>
        <ul className={styles.infoList}>{info.map(item => <li key={item.key} title={item.title}><bdi>{item.cls}</bdi> · <bdi dir="auto">{item.name}</bdi></li>)}</ul>
      </details>}
      </div>
    </NajmScroll>}

    <footer className={styles.reviewFooter}>
      {asking ? <>
        <div role="alert" className={styles.warnText}>
          {undecided.length > 0 && <p>{t('massar.flow.undecidedWarning', { count: undecided.length, classes: waiting.length })}</p>}
          {unchosen.length > 0 && <p>{t('massar.flow.subjectsUndecided', { count: unchosen.length })}</p>}
        </div>
        <div className={styles.actions}>
          <NButton variant="outline" disabled={pending} onClick={() => setConfirming(false)}>{t('massar.flow.answerFirst')}</NButton>
          <NButton disabled={!canImport || pending} loading={pending} onClick={() => { void submit(); }}>{t('massar.flow.importAnyway')}</NButton>
        </div>
      </> : <>
        <p>{waiting.length > 0 ? t('massar.flow.waitingAfter', { count: waiting.length }) : t('massar.ui.previewOnly')}</p>
        <div className={styles.actions}>
          <NButton variant="ghost" leftIcon={RefreshCw} disabled={pending} onClick={() => { void recheck(); }}>{t('massar.flow.recheck')}</NButton>
          <NButton variant="outline" disabled={pending} onClick={() => { void cancel(); }}>{t('massar.ui.back')}</NButton>
          <NButton disabled={!canImport || pending} loading={pending} onClick={() => { if (undecided.length || unchosen.length) setConfirming(true); else void submit(); }}>{t('massar.flow.importClasses', { count: preview.classes.length })}</NButton>
        </div>
      </>}
    </footer>
  </section>;
}
