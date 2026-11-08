'use client';

import { useState, type ReactNode } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, BookPlus, ChevronDown, Sparkles } from 'lucide-react';
import { cn, DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger, NButton, NSheet } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { foldSubjectName } from '@sms/contracts';
import { api } from '@/services/http';
import { useYearScopedDetail } from '@/features/AcademicYears/hooks/useYearScopedQuery';
import { withAcademicYear } from '@/features/AcademicYears/utils/yearScope';

type Subject = { id: string; name: string; subSubjects: Array<{ id: string; name: string }> };
// missing: names this year's Planning uses that are neither a subject nor a sub-subject; they have no exam.
type PlanningSubjects = { subjects: Subject[]; missing: Array<{ name: string; suggestedSubjectId: string | null }> };

/** What Planning picks a subject from, and the names it uses that Subjects does not have yet. */
export function usePlanningSubjects(enabled: boolean) {
  const client = useQueryClient();
  const read = useYearScopedDetail({ resource: 'exam-planning', parts: ['subjects'], fetch: async () => (await api.get('/exam-planning/subjects')).data, enabled });
  const mutation = useMutation({
    mutationFn: (add: Array<{ name: string; subjectId: string }>) => withAcademicYear(read.academicYear, async () => (await api.put('/exam-planning/subjects', { add })).data),
    // New sub-subjects make exams: Planning, Subjects and the Exams page all reload.
    onSuccess: () => Promise.all(['exam-planning', 'exams', 'subjects'].map(key => client.invalidateQueries({ queryKey: [key] }))),
  });
  const data = read.data as PlanningSubjects | null;
  return { data, missing: data?.missing ?? [], add: mutation.mutateAsync, adding: mutation.isPending };
}

const STORED = '__stored__', WHOLE = '__whole__';

/**
 * A Planning entry's subject in two short lists: the subject, then one of its
 * sub-subjects (or the whole subject). The entry stores the chosen name. A
 * stored name Subjects does not have stays shown, marked, so opening an entry
 * never changes it silently.
 */
export function planningSubjectPicker(subjects: Subject[] | undefined, current: string, labels: { notInSubjects: string; wholeSubject: string }) {
  const list = subjects ?? [], folded = foldSubjectName(current);
  const own = list.find(subject => foldSubjectName(subject.name) === folded);
  const parent = own ?? list.find(subject => subject.subSubjects.some(part => foldSubjectName(part.name) === folded));
  const part = own ? undefined : parent?.subSubjects.find(item => foldSubjectName(item.name) === folded);
  const stored = !parent && current.trim() ? [{ value: STORED, label: `${current} · ${labels.notInSubjects}` }] : [];
  return {
    subjectItems: [...stored, ...list.map(subject => ({ value: subject.id, label: subject.name }))],
    subjectValue: parent?.id ?? (stored.length ? STORED : ''),
    partItems: parent?.subSubjects.length ? [{ value: WHOLE, label: labels.wholeSubject }, ...parent.subSubjects.map(item => ({ value: item.name, label: item.name }))] : [],
    partValue: parent ? part?.name ?? WHOLE : '',
    /** The name to store for a subject picked in the first list: the subject itself. */
    subjectName: (id: string) => list.find(subject => subject.id === id)?.name ?? null,
    /** The name to store for a pick in the second list. */
    partName: (value: string) => value === WHOLE ? parent?.name ?? null : value,
  };
}

const count = 'rounded-full bg-muted px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground';

/** Adds the Planning names Subjects lacks as sub-subjects, grouped by the subject each goes under. */
export function PlanningMissingSubjects({ open, onOpenChange, state }: { open: boolean; onOpenChange: (open: boolean) => void; state: ReturnType<typeof usePlanningSubjects> }) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<Record<string, string>>({});
  const missing = state.missing, subjects = state.data?.subjects ?? [];
  const chosen = (name: string, suggested: string | null) => draft[name] ?? suggested ?? null;
  const unchosen = missing.filter(item => !chosen(item.name, item.suggestedSubjectId));
  const groups = subjects.map(subject => ({ subject, items: missing.filter(item => chosen(item.name, item.suggestedSubjectId) === subject.id) })).filter(group => group.items.length);
  const ready = missing.length - unchosen.length;

  const close = () => { if (!state.adding) { setDraft({}); onOpenChange(false); } };
  const save = async () => {
    // A name with no subject chosen stays missing; the rest are added.
    await state.add(missing.flatMap(item => { const subjectId = chosen(item.name, item.suggestedSubjectId); return subjectId ? [{ name: item.name, subjectId }] : []; }));
    setDraft({}); onOpenChange(false);
  };

  const chip = (item: PlanningSubjects['missing'][number], withArrow = false) => <DropdownMenu key={item.name}>
    <DropdownMenuTrigger asChild>
      <button type="button" disabled={state.adding} aria-label={t('examPlanning.subjects.move', { name: item.name })}
        className={cn('inline-flex max-w-full items-center gap-1 rounded-full border px-3 py-1 text-sm transition-colors hover:bg-accent disabled:opacity-60', item.name in draft ? 'border-border bg-background font-medium' : 'border-dashed border-muted-foreground/50')}>
        <bdi dir="auto" className="truncate">{item.name}</bdi>{withArrow && <ChevronDown className="size-3.5 shrink-0 opacity-70" />}
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start" className="max-h-[60dvh] w-64 overflow-y-auto">
      <DropdownMenuLabel dir="auto" className="truncate">{item.name}</DropdownMenuLabel>
      <DropdownMenuRadioGroup value={chosen(item.name, item.suggestedSubjectId) ?? ''} onValueChange={value => setDraft({ ...draft, [item.name]: value })}>
        {subjects.map(subject => <DropdownMenuRadioItem key={subject.id} value={subject.id}><bdi dir="auto">{subject.name}</bdi></DropdownMenuRadioItem>)}
      </DropdownMenuRadioGroup>
    </DropdownMenuContent>
  </DropdownMenu>;

  const group = (key: string, title: ReactNode, items: PlanningSubjects['missing']) => <section key={key} dir="auto" className="space-y-2 px-4 py-3">
    <div className="flex items-center justify-between gap-2"><h3 className="min-w-0 truncate text-sm font-semibold">{title}</h3><span className={count}>{items.length}</span></div>
    <div className="flex flex-wrap gap-2">{items.map(item => chip(item))}</div>
  </section>;

  return <NSheet open={open} onOpenChange={value => { if (!value) close(); }} icon={BookPlus} title={t('examPlanning.subjects.title')} description={t('examPlanning.subjects.description')}
    footer={<div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="inline-block h-3 w-5 shrink-0 rounded-full border border-dashed border-muted-foreground/50" />{t('examPlanning.subjects.legend')}</span>
      <div className="flex gap-2"><NButton variant="outline" disabled={state.adding} onClick={close}>{t('common.cancel')}</NButton><NButton loading={state.adding} disabled={state.adding || !ready} onClick={() => { void save(); }}>{t('examPlanning.subjects.add', { count: ready })}</NButton></div>
    </div>}>
    {!missing.length ? <p className="text-sm text-muted-foreground">{t('examPlanning.subjects.empty')}</p>
      : <div className="-mx-4 divide-y border-y">
        <p className="flex items-center gap-2 px-4 py-2.5 text-sm text-muted-foreground"><Sparkles className="size-4 shrink-0" />{t('examPlanning.subjects.summary', { suggested: ready, choose: unchosen.length })}</p>
        {unchosen.length > 0 && <section className="space-y-2 bg-amber-500/10 px-4 py-3">
          <div className="flex items-center justify-between gap-2"><h3 className="flex items-center gap-1.5 text-sm font-semibold text-amber-600 dark:text-amber-400"><AlertTriangle className="size-4" />{t('examPlanning.subjects.notLinked')}</h3><span className={count}>{unchosen.length}</span></div>
          <div className="flex flex-wrap gap-2">{unchosen.map(item => chip(item, true))}</div>
        </section>}
        {groups.map(({ subject, items }) => group(subject.id, <bdi dir="auto">{subject.name}</bdi>, items))}
      </div>}
  </NSheet>;
}
