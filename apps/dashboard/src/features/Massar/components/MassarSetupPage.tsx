'use client';
import { useState } from 'react';
import { NButton } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import type { MassarImportPreview, MassarMappings, MassarSetup } from '@sms/contracts';
import { useViewingYearKey } from '@/features/AcademicYears/hooks/useViewingAcademicYear';
import { useSchoolToday } from '@/hooks/useSchoolFormat';
import { massarPost, massarPut, previewMassar, useMassarAction, useMassarRead } from '../hooks/useMassar';
import { MassarHeader, MassarLoadError, massarControlClass } from './MassarShared';

function MappingEditor({ setup, initial, submit, pending, commit }: { setup: MassarSetup; initial: MassarMappings; submit: (data: MassarMappings) => Promise<void>; pending: boolean; commit?: boolean }) {
  const { t } = useTranslation(), [draft, setDraft] = useState(initial);
  return <form className="space-y-5" onSubmit={event => { event.preventDefault(); void submit(draft); }}><div className="grid gap-3 lg:grid-cols-2">
    {draft.classes.map((cls, index) => <fieldset key={cls.name} className="grid min-w-0 gap-2 rounded-lg border border-border p-3 sm:grid-cols-2"><legend className="px-1 font-medium">{cls.name}</legend>
      <label className="grid gap-1 text-sm">{t('massar.appClass')}<select className={massarControlClass} value={cls.classId ?? ''} onChange={event => setDraft({ ...draft, classes: draft.classes.map((value, i) => i === index ? { ...value, classId: event.target.value || null, sectionId: null } : value) })}><option value="">{t('massar.unmapped')}</option>{setup.appClasses.map(app => <option key={app.id} value={app.id}>{app.name}</option>)}</select></label>
      <label className="grid gap-1 text-sm">{t('massar.section')}<select className={massarControlClass} value={cls.sectionId ?? ''} onChange={event => setDraft({ ...draft, classes: draft.classes.map((value, i) => i === index ? { ...value, sectionId: event.target.value || null } : value) })}><option value="">{t('massar.unmapped')}</option>{setup.appSections.filter(section => section.classId === cls.classId).map(section => <option key={section.id} value={section.id}>{section.name}</option>)}</select></label>
    </fieldset>)}
  </div><div className="grid gap-3 lg:grid-cols-2">{draft.subjects.map((subject, index) => {
    const name = 'name' in subject ? String(subject.name) : setup.subjects.find(item => item.code === subject.code && setup.levels.find(level => level.id === item.levelId)?.code === subject.level)?.name;
    return <label key={`${subject.level}:${subject.code}`} className="grid min-w-0 gap-1 text-sm">{subject.level} · {name || subject.code}<select className={massarControlClass} value={subject.subjectId ?? ''} onChange={event => setDraft({ ...draft, subjects: draft.subjects.map((value, i) => i === index ? { ...value, subjectId: event.target.value || null } : value) })}><option value="">{t('massar.unmapped')}</option>{setup.appSubjects.map(app => <option key={app.id} value={app.id}>{app.name}</option>)}</select></label>;
  })}</div><NButton type="submit" disabled={pending || draft.classes.some(cls => !!cls.classId !== !!cls.sectionId)}>{t(commit ? 'massar.confirmImport' : 'massar.saveMappings')}</NButton></form>;
}
function Setup() {
  const { t } = useTranslation(), query = useMassarRead<MassarSetup>('/setup'), action = useMassarAction(), today = useSchoolToday();
  const [files, setFiles] = useState<File[]>([]), [preview, setPreview] = useState<MassarImportPreview | null>(null), [previewYear, setPreviewYear] = useState('');
  const [studentId, setStudent] = useState(''), [classId, setClass] = useState(''), [leftOn, setLeftOn] = useState(today);
  const setup = query.data;
  const cancelPreview = async () => {
    if (preview) await action.run(() => massarPost(`/imports/${preview.previewId}/cancel`));
    setPreview(null);
  };
  const choose = async (list: FileList | null) => { const chosen = Array.from(list ?? []); await cancelPreview(); setFiles(chosen); };
  const doPreview = async () => {
    let result: MassarImportPreview | null = null;
    await action.run(async () => {
      if (preview) await massarPost(`/imports/${preview.previewId}/cancel`);
      result = await previewMassar(files);
    });
    setPreview(result); setPreviewYear(query.academicYear ?? '');
  };
  const commit = async (mappings: MassarMappings) => {
    if (!preview || previewYear !== query.academicYear) return;
    await action.run(() => massarPost('/imports/commit', { ...mappings, previewId: preview.previewId, digest: preview.digest, addMissingSheets: true })); setPreview(null); setFiles([]);
  };
  return <div className="h-full space-y-5 overflow-auto pb-8"><MassarHeader title={t('massar.setup')} />
    {query.error ? <MassarLoadError retry={query.refetch} /> : !setup ? <p role="status">{t('massar.loading')}</p> : <>
      <section className="space-y-4 rounded-xl border border-border p-4"><h2 className="font-semibold">{t('massar.importTitle')}</h2><p className="text-sm text-muted-foreground">{t('massar.importHelp')}</p><p className="text-sm">{t(setup.year?.templateReady ? 'massar.templateReady' : 'massar.templateMissing')}</p>
        <div className="flex flex-wrap items-end gap-3"><label className="grid min-w-0 gap-1 text-sm">{t('massar.chooseFiles')}<input className={massarControlClass} type="file" multiple disabled={action.pending} accept=".xlsx,.zip" onChange={event => void choose(event.target.files)} /></label><label className="grid min-w-0 gap-1 text-sm">{t('massar.chooseFolder')}<input className={massarControlClass} type="file" multiple disabled={action.pending} ref={node => { node?.setAttribute('webkitdirectory', ''); }} onChange={event => void choose(event.target.files)} /></label><NButton disabled={!files.length || action.pending} onClick={doPreview}>{t('massar.preview')}</NButton></div>
      </section>
      {preview && <section className="space-y-4 rounded-xl border border-border p-4"><h2 className="font-semibold">{t('massar.previewTitle', { count: preview.acceptedCount })}</h2>
        <NButton variant="outline" disabled={action.pending} onClick={cancelPreview}>{t('massar.cancel')}</NButton>
        {preview.refused.map((file, i) => <p key={i} role="alert" className="break-all text-sm text-destructive">{file.name}: {t(`massar.errors.${file.key}`)}</p>)}
        {!!preview.missingClasses.length && <p>{t('massar.missingClasses')}: {preview.missingClasses.join(', ')}</p>}
        {preview.classes.map(cls => <details key={cls.name} className="rounded-lg bg-muted/40 p-3"><summary>{cls.name} · {t(`massar.change.${cls.change}`)} · {t('massar.studentCount', { count: cls.students.length })}</summary><div className="mt-3 space-y-1 text-sm">
          {cls.students.filter(student => !student.studentId || student.warning).map(student => <p key={student.studentCode}>{student.studentCode} · {student.name} · {t(student.studentId ? 'massar.identityWarning' : 'massar.unmatchedStudent')}</p>)}
          {cls.missing.map(student => <p key={student.studentCode}>{student.studentCode} · {student.name} · {t('massar.notInMassar')}</p>)}
        </div></details>)}
        {preview.subjects.map(subject => <p key={`${subject.level}:${subject.code}`} className="whitespace-pre-wrap text-sm">{subject.level} · {subject.name} · {t(`massar.change.${subject.change}`)}: {subject.components.map(component => component.name).join(' / ')}</p>)}
        {preview.hasCleanTemplate && preview.acceptedCount > 0 ? <MappingEditor key={preview.previewId} setup={setup} initial={preview} pending={action.pending} submit={commit} commit /> : <p role="alert">{t('massar.errors.noCleanTemplate')}</p>}
      </section>}
      {!!setup.classes.length && <section className="space-y-4 rounded-xl border border-border p-4"><h2 className="font-semibold">{t('massar.mappings')}</h2><p className="text-sm text-muted-foreground">{t('massar.mappingHelp')}</p>
        {setup.classes.filter(cls => cls.unmatchedCodes.length).map(cls => <p key={cls.id} role="alert">{cls.name}: {cls.unmatchedCodes.join(', ')} · {t('massar.unmatchedStudent')}</p>)}
        <MappingEditor key={JSON.stringify([setup.classes, setup.subjects])} setup={setup} pending={action.pending} initial={{ classes: setup.classes.map(cls => ({ name: cls.name, classId: cls.classId, sectionId: cls.sectionId })), subjects: setup.subjects.map(subject => ({ level: setup.levels.find(level => level.id === subject.levelId)?.code ?? '', code: subject.code, subjectId: subject.subjectId })) }} submit={async mappings => { await action.run(() => massarPut('/mappings', mappings)); }} />
      </section>}
      {!!setup.classes.length && <section className="space-y-4 rounded-xl border border-border p-4"><h2 className="font-semibold">{t('massar.enrollments')}</h2><p className="text-sm text-muted-foreground">{t('massar.enrollmentHelp')}</p>
        <form className="flex flex-wrap items-end gap-3" onSubmit={event => { event.preventDefault(); void action.run(() => massarPost('/enrollments', { studentId, massarClassId: classId })); }}>
          <label className="grid min-w-0 gap-1 text-sm">{t('massar.student')}<select required className={massarControlClass} value={studentId} onChange={event => setStudent(event.target.value)}><option value="">{t('massar.select')}</option>{setup.appStudents.filter(student => !setup.enrollments.some(row => row.enrollment.studentId === student.id)).map(student => <option key={student.id} value={student.id}>{student.studentCode} · {student.name}</option>)}</select></label>
          <label className="grid gap-1 text-sm">{t('massar.class')}<select required className={massarControlClass} value={classId} onChange={event => setClass(event.target.value)}><option value="">{t('massar.select')}</option>{setup.classes.map(cls => <option key={cls.id} value={cls.id}>{cls.name}</option>)}</select></label><NButton type="submit" disabled={action.pending}>{t('massar.addStudent')}</NButton>
        </form>
        <label className="grid w-fit gap-1 text-sm">{t('massar.leftOn')}<input type="date" required max={today} className={massarControlClass} value={leftOn} onChange={event => setLeftOn(event.target.value)} /></label>
        <div className="grid gap-2 md:grid-cols-2">{setup.enrollments.filter(row => !row.enrollment.leftOn).map(row => <div key={row.enrollment.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/40 p-3 text-sm"><span>{row.studentCode} · {row.enrollment.name}</span><NButton variant="outline" disabled={action.pending || !leftOn} onClick={() => action.run(() => massarPut(`/enrollments/${row.enrollment.id}/leave`, { leftOn }))}>{t('massar.markLeft')}</NButton></div>)}</div>
      </section>}
    </>}
  </div>;
}
export function MassarSetupPage() { const key = useViewingYearKey(); return <Setup key={key} />; }
