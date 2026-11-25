'use client';

import { CheckCircle2, ChevronRight, Circle, Plus, Trash2 } from 'lucide-react';
import { cn, NButton } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { foldSubjectName, resolvePlanningSubject, type ExamPlanningEntry } from '@sms/contracts';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';
import { planningTextLanguage } from './examPlanningModel';

type Subject = { id: string; name: string; nameAr?: string | null; subSubjects: ReadonlyArray<{ name: string }> };

/**
 * Step two of Planning, the teacher's: their subjects in one class for the
 * Contrôle picked, each with its exams (the whole subject, or a sub-subject
 * each) and their lessons. A subject is ready once an exam of it has lessons.
 * The school gives each exam its day and time: an exam it has not placed
 * yet says so (`toPlace`), one it has shows when it is. The page keeps the
 * drafts and saves them; the server allows a teacher only their own subjects
 * and keeps the school's schedule (ExamPlanningValidator).
 */
export function TeacherLessons({ subjects, entries, selectedId, saving, onSelect, onAdd, onDelete }: {
  /** The subjects this teacher plans in the class, as its level teaches them. */
  subjects: readonly Subject[];
  /** Their exams in the Contrôle. */
  entries: readonly ExamPlanningEntry[];
  selectedId?: string | null;
  saving: boolean;
  onSelect: (entry: ExamPlanningEntry) => void;
  onAdd: (subject: Subject) => void;
  onDelete: (entry: ExamPlanningEntry) => void;
}) {
  const { t } = useTranslation();
  const { displayDate } = useSchoolFormat();
  const parts = subjects.flatMap(subject => subject.subSubjects.map(part => ({ subjectId: subject.id, name: part.name })));
  const subjectOf = (entry: ExamPlanningEntry) => resolvePlanningSubject(entry.subject.trim(), parts, subjects);
  const rows = subjects.map(subject => ({ subject, exams: entries.filter(entry => subjectOf(entry) === subject.id) }));
  const lessonCount = (entry: ExamPlanningEntry) => entry.lessons.filter(line => line.trim()).length;
  const ready = rows.filter(row => row.exams.some(entry => lessonCount(entry) > 0)).length;
  const isWhole = (subject: Subject, entry: ExamPlanningEntry) => foldSubjectName(entry.subject) === foldSubjectName(subject.name)
    || (!!subject.nameAr && foldSubjectName(entry.subject) === foldSubjectName(subject.nameAr));

  if (!subjects.length) return <p className="text-sm text-muted-foreground">{t('examPlanning.noTeachingClasses')}</p>;
  return (
    <div className="flex max-w-2xl flex-col gap-2">
      <p className="text-xs font-medium tabular-nums text-muted-foreground" role="status">{t('examPlanning.readyCount', { count: ready, total: rows.length })}</p>
      <ul className="divide-y rounded-xl border">
        {rows.map(({ subject, exams }) => {
          const done = exams.some(entry => lessonCount(entry) > 0);
          return (
            <li key={subject.id} className="flex flex-col py-1">
              <div className="flex items-center gap-2 px-3 py-1">
                {done ? <CheckCircle2 className="size-4 shrink-0 text-emerald-600" aria-label={t('examPlanning.ready')} />
                  : <Circle className="size-4 shrink-0 text-muted-foreground" aria-hidden />}
                <span className="min-w-0 flex-1 text-sm font-medium" dir="auto">{subject.name}</span>
                <NButton type="button" size="icon-sm" variant="ghost" disabled={saving} leftIcon={<Plus className="size-4" />}
                  aria-label={t('examPlanning.addExamOf', { subject: subject.name })} title={t('examPlanning.addExamOf', { subject: subject.name })}
                  onClick={() => onAdd(subject)} />
              </div>
              {exams.map(entry => {
                const count = lessonCount(entry);
                const when = entry.toPlace ? null : [displayDate(entry.date, { weekday: 'short', day: 'numeric', month: 'short' }),
                  entry.startTime && entry.endTime ? `${entry.startTime}–${entry.endTime}` : null].filter(Boolean).join(' · ');
                return (
                  <div key={entry.id} className={cn('flex items-center gap-1 ps-7 pe-1', selectedId === entry.id && 'bg-primary/5')}>
                    <button type="button" disabled={saving} onClick={() => onSelect(entry)} aria-pressed={selectedId === entry.id}
                      className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-start text-xs hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <span className="min-w-0 flex-1 truncate" lang={planningTextLanguage(entry.subject)} dir="auto">
                        <span className="font-medium">{isWhole(subject, entry) ? t('examPlanning.wholeSubject') : entry.subject}</span>
                        <span className={cn('ms-2', count ? 'text-muted-foreground' : 'text-amber-700 dark:text-amber-400')}>
                          {count ? t('examPlanning.lessonCount', { count }) : t('examPlanning.noLessons')}
                        </span>
                      </span>
                      <span className={cn('shrink-0 whitespace-nowrap tabular-nums', entry.toPlace ? 'rounded border border-dashed px-1.5 text-muted-foreground' : 'text-foreground')}>
                        {when ?? t('examPlanning.toPlace')}
                      </span>
                      <ChevronRight className="size-3.5 shrink-0 text-muted-foreground rtl:rotate-180" aria-hidden />
                    </button>
                    <NButton type="button" size="icon-sm" variant="ghost" disabled={saving} leftIcon={<Trash2 className="size-3.5 text-destructive" />}
                      aria-label={`${t('common.delete')} · ${entry.subject}`} title={t('common.delete')} onClick={() => onDelete(entry)} />
                  </div>
                );
              })}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
