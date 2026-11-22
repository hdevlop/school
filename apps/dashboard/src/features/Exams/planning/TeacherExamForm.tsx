'use client';

import { useState, type FormEvent } from 'react';
import { Check, Pencil } from 'lucide-react';
import { useViewerRole } from '@/features/Users/hooks/useViewerRole';
import { useLevelSubSubjectsSheet } from '@/features/Subjects/components/LevelSubSubjects';
import { ComboboxInput, MultiSelectInput, NButton, NLoadingState, SelectInput, Textarea } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { toast } from 'sonner';
import { compareClassNames, foldSubjectName, massarPlanningControls, toOfficialClassName, type ExamPlanningEntry } from '@sms/contracts';
import { isDateOnly } from '@sms/contracts/academic-years';
import { useDialog } from '@/shared/useDialog';
import { isAuthorizationError } from '@/services/apiError';
import { useExamPlanning } from './useExamPlanning';
import { usePlanningSubjects } from './PlanningSubjects';
import { plannableInClass, planningTextLanguage } from './examPlanningModel';

const controlKey = (control: { term: number; exam: number }) => `${control.term}-${control.exam}`;
const MAX_LESSONS = 40, MAX_LESSON_LENGTH = 500;
const lessonLines = (text: string) => text.split('\n').map(line => line.trim()).filter(Boolean);

/**
 * A teacher adds an exam of one of their subjects from the Exams page. The
 * school opens each Contrôle by planning its days in Planning; the teacher
 * picks the Contrôle (the latest by default), a class and subject they teach,
 * and the sub-subjects the sitting covers, each with its lessons. Each
 * sub-subject is saved as its own Planning entry, so each gets its own exam
 * and marks, and Planning and the A4 calendar show them too. The school sets
 * the day and time: a new entry takes the Contrôle's first day with no time.
 * The server allows a teacher only their own subjects and keeps the school's
 * schedule (ExamPlanningValidator).
 */
export function TeacherExamForm() {
  const { t } = useTranslation();
  const { pop } = useDialog();
  const viewer = useViewerRole();
  const canEditLists = viewer.can('update:sub-subjects');
  const levelSheet = useLevelSubSubjectsSheet();
  const { classes: catalog, isLoading, error, save, isSaving } = useExamPlanning();
  const planningSubjects = usePlanningSubjects(true);
  const classes = [...(catalog ?? [])].sort((a, b) => compareClassNames(a.name, b.name));
  const controls = massarPlanningControls(classes.map(cls => ({ classId: cls.id, months: cls.months })));
  const myClasses = classes.filter(cls => cls.visible && plannableInClass(planningSubjects.plannable, cls.id)?.size !== 0);

  const [pickedControl, setPickedControl] = useState<string | null>(null);
  const [pickedClass, setPickedClass] = useState<string | null>(null);
  const [subjectId, setSubjectId] = useState('');
  // The names this sitting covers (a sub-subject, or the whole subject), each with its lessons.
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const control = controls.find(item => controlKey(item) === pickedControl) ?? controls.at(-1);
  const cls = myClasses.find(item => item.id === pickedClass) ?? myClasses[0];
  const allowed = cls ? plannableInClass(planningSubjects.plannable, cls.id) : null;
  // The class's own sub-subject lists (its level is its name), the school's otherwise.
  const classSubjects = cls ? planningSubjects.forClass(cls.name) : undefined;
  const subjects = (allowed ? classSubjects?.filter(item => allowed.has(item.id)) : classSubjects) ?? [];
  const subject = subjects.find(item => item.id === subjectId);
  const hasParts = !!subject?.subSubjects.length;
  // The whole subject first, then its sub-subjects; a subject without any is planned whole.
  const choices = subject ? [{ name: subject.name, label: t('examPlanning.wholeSubject'), whole: true }, ...subject.subSubjects.map(part => ({ name: part.name, label: part.name, whole: false }))] : [];
  const chosen = !subject ? [] : hasParts ? choices.filter(choice => choice.name in picked).map(choice => choice.name) : [subject.name];
  // The Contrôle's first day; the school moves each exam to its real day and time.
  const date = control?.examFrom ?? '';
  const month = date.slice(0, 7);
  // A name this class already has an exam of in the Contrôle is not planned twice.
  const plannedNames = new Set((cls?.months[month] ?? []).map(entry => foldSubjectName(entry.subject)));
  // The whole subject is planned under its name or its Arabic name.
  const isPlanned = (name: string) => plannedNames.has(foldSubjectName(name))
    || (!!subject?.nameAr && name === subject.name && plannedNames.has(foldSubjectName(subject.nameAr)));
  const invalid = !chosen.length || !isDateOnly(date)
    || chosen.some(isPlanned)
    || chosen.some(name => { const lines = lessonLines(picked[name] ?? ''); return lines.length > MAX_LESSONS || lines.some(line => line.length > MAX_LESSON_LENGTH); });

  if (isLoading || planningSubjects.isLoading) return <NLoadingState surface="panel" label={t('common.loading')} />;
  const message = error || planningSubjects.error ? t('examPlanning.loadFailed')
    : !control ? `${t('examPlanning.noControlTitle')}. ${t('examPlanning.noControlDescription')}`
    : !cls ? t('examPlanning.noTeachingClasses') : null;
  if (message) return <div className="flex flex-col gap-4">
    <p className="text-sm text-muted-foreground" role="status">{message}</p>
    <div className="flex justify-end"><NButton type="button" variant="outline" onClick={() => { void pop(); }}>{t('common.close')}</NButton></div>
  </div>;

  // Names already planned in this class's Contrôle are left out of the list and named under it.
  const open = choices.filter(choice => !isPlanned(choice.name));
  const taken = choices.filter(choice => isPlanned(choice.name));
  const pick = (values: string[]) => setPicked(current => {
    // The whole subject stands alone: picking it clears the sub-subjects, picking a sub-subject clears it.
    const whole = subject?.name;
    const addedWhole = !!whole && values.includes(whole) && !(whole in current);
    const names = addedWhole ? [whole] : values.filter(name => name !== whole || values.length === 1);
    return Object.fromEntries(names.map(name => [name, current[name] ?? '']));
  });
  const setLessons = (name: string, text: string) => setPicked(current => ({ ...current, [name]: text }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (invalid || !cls) return;
    const added: ExamPlanningEntry[] = chosen.map(name => ({
      id: crypto.randomUUID(), date, subject: name, lessons: lessonLines(picked[name] ?? ''),
    }));
    try {
      await save({ classId: cls.id, month, entries: [...(cls.months[month] ?? []), ...added] });
      toast.success(t('examPlanning.saved'));
      void pop();
    } catch (failure) {
      // A refused save says why (a subject this teacher does not teach there); anything else is generic.
      toast.error(isAuthorizationError(failure) && failure instanceof Error && failure.message ? failure.message : t('examPlanning.saveFailed'));
    }
  };

  const label = 'text-sm font-medium';
  const lessonsBox = (name: string, title?: string) => {
    const text = picked[name] ?? '';
    const id = `teacher-exam-lessons-${foldSubjectName(name)}`;
    return <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-muted-foreground" htmlFor={id}>{title ? <span dir="auto">{title} · </span> : null}{t('assessmentPlanning.lessons')} · {t('examPlanning.oneLessonPerLine')}</label>
      <Textarea id={id} className="min-h-24" dir="auto" lang={planningTextLanguage(text)} disabled={isSaving} value={text} onChange={event => setLessons(name, event.target.value)} />
    </div>;
  };
  // The sheet sits beside the form, not in it: its fields must not submit the exam.
  return <><form id="teacher-exam-form" className="flex flex-col gap-4" onSubmit={submit} noValidate>
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="flex flex-col gap-1.5"><span className={label}>{t('examPlanning.control')}</span>
        <SelectInput ariaLabel={t('examPlanning.control')} showIcon={false} className="w-full" disabled={isSaving}
          items={controls.map(item => ({ value: controlKey(item), label: `${t('massar.flow.controlNumber', { exam: item.exam })} · ${t('massar.flow.semester', { term: item.term })}` }))}
          value={controlKey(control!)} onChange={value => { setPickedControl(String(value)); setPicked({}); }} /></div>
      <div className="flex flex-col gap-1.5"><span className={label}>{t('assessments.form.class')}</span>
        <SelectInput ariaLabel={t('assessments.form.class')} showIcon={false} className="w-full" disabled={isSaving}
          items={myClasses.map(item => ({ value: item.id, label: toOfficialClassName(item.name) }))}
          value={cls!.id} onChange={value => { setPickedClass(String(value)); setSubjectId(''); setPicked({}); }} /></div>
      <div className="flex flex-col gap-1.5"><span className={label}>{t('assessments.form.subject')}</span>
        <ComboboxInput ariaLabel={t('assessments.form.subject')} placeholder={t('examPlanning.chooseSubject')} showIcon={false} className="w-full" disabled={isSaving}
          items={subjects.map(item => ({ value: item.id, label: item.name }))} value={subjectId} onChange={value => { setSubjectId(String(value)); setPicked({}); }} /></div>
      {/* One sitting can cover several sub-subjects; each one picked takes its own lessons below. */}
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className={label}>{t('examPlanning.subSubjects')}</span>
          {/* The list is this class's (its level): a teacher edits it for the subjects they teach there. */}
          {subject && canEditLists && <button type="button" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline disabled:opacity-50" disabled={isSaving}
            onClick={() => levelSheet.open({ id: subject.id, name: subject.name }, cls!.name)}><Pencil className="size-3" aria-hidden="true" />{t('subjects.levels.edit')}</button>}
        </div>
        <MultiSelectInput ariaLabel={t('examPlanning.subSubjects')} showIcon={false} className="w-full" maxDisplay={2} disabled={isSaving || !hasParts}
          placeholder={t(subject && !hasParts ? 'examPlanning.noSubSubjects' : 'examPlanning.chooseSubSubject')}
          items={open.map(choice => ({ value: choice.name, label: choice.label }))} value={hasParts ? chosen : []} onChange={pick} />
        {hasParts && taken.length > 0 && <p className="text-xs text-muted-foreground">{t('examPlanning.alreadyPlanned')} : <span dir="auto">{taken.map(choice => choice.label).join('، ')}</span></p>}
      </div>
    </div>
    <p className="text-xs text-muted-foreground" role="note">{t('examPlanning.scheduleNote')}</p>
    {hasParts && chosen.map(name => <div key={name}>{lessonsBox(name, name === subject?.name ? t('examPlanning.wholeSubject') : name)}</div>)}
    {subject && !hasParts && (isPlanned(subject.name)
      ? <p className="text-sm text-muted-foreground" role="status"><span dir="auto">{subject.name}</span> · {t('examPlanning.alreadyPlanned')}</p>
      : lessonsBox(subject.name))}
    {submitted && invalid && <p className="text-sm text-destructive" role="alert">{t('examPlanning.pickSubSubjects')}</p>}
    <div className="flex justify-end gap-2">
      <NButton type="button" variant="outline" disabled={isSaving} onClick={() => { void pop(); }}>{t('common.cancel')}</NButton>
      <NButton type="submit" loading={isSaving} disabled={isSaving} leftIcon={<Check />}>{t('common.save')}</NButton>
    </div>
  </form>{levelSheet.sheet}</>;
}
