'use client';

import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { BookOpen, Pencil } from 'lucide-react';
import { NButton, NEmptyState, NErrorState, NForbiddenState, NPageHeaderActions } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { compareClassNames, toOfficialClassName } from '@sms/contracts';
import { SchoolPageHeader as NPageHeader } from '@/components/SchoolPageHeader';
import { SchoolTable as NTable } from '@/components/SchoolTable';
import { FEATURE_ICONS } from '@/shared/featureIcons';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';
import { hasFailedToLoad, isAuthorizationError, isCountUnknown } from '@/services/apiError';
import { useViewerRole } from '@/features/Users/hooks/useViewerRole';
import { useExamPlanning } from '@/features/Exams/planning/useExamPlanning';
import { usePlanningSubjects } from '@/features/Exams/planning/PlanningSubjects';
import { planningTextLanguage } from '@/features/Exams/planning/examPlanningModel';
import { useLevelSubSubjectsSheet } from './LevelSubSubjects';

/** One subject a teacher teaches in one class, with the sub-subjects (components) that class is taught. */
type TaughtRow = { id: string; subjectId: string; subjectName: string; nameAr?: string | null; className: string; subSubjects: string[] };

const ClassBadge = ({ name }: { name: string }) =>
  <span dir="ltr" className="inline-flex rounded-md bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">{toOfficialClassName(name)}</span>;

/** The subject's name, with its Arabic name under it: each reads in its own direction, both start on the same side. */
const SubjectName = ({ row, large = false }: { row: TaughtRow; large?: boolean }) => <div className="flex min-w-0 flex-col">
  <span className={`truncate ${large ? 'text-base font-semibold' : 'text-sm font-medium'}`}><bdi dir="auto">{row.subjectName}</bdi></span>
  {row.nameAr && row.nameAr !== row.subjectName && <span className="truncate text-xs text-muted-foreground"><bdi dir="rtl">{row.nameAr}</bdi></span>}
</div>;

/** The class's components as tags, laid out right to left when they are Arabic. */
function Components({ names }: { names: string[] }) {
  const { t } = useTranslation();
  if (!names.length) return <span className="text-xs text-muted-foreground">{t('subjects.mine.noSubSubjects')}</span>;
  return <div dir={planningTextLanguage(names) === 'ar' ? 'rtl' : 'ltr'} className="flex flex-wrap gap-1.5">
    {names.map(name => <bdi key={name} dir="auto" className="rounded-full border bg-background px-2.5 py-0.5 text-xs">{name}</bdi>)}
  </div>;
}

/**
 * A teacher's Matières: only the subjects they teach in the selected year, a
 * row per class, with the components that class is taught, which they edit
 * from the row. A table on wide screens, cards on
 * narrow ones. Read from Planning's year-scoped data (GET /exam-planning,
 * /exam-planning/subjects), which names the subjects each teacher teaches in
 * each class.
 */
export default function TeacherSubjects() {
  const { t } = useTranslation();
  const viewer = useViewerRole();
  const canEdit = viewer.can('update:sub-subjects');
  const levelSheet = useLevelSubSubjectsSheet();
  const planning = useExamPlanning();
  const subjects = usePlanningSubjects(true);
  const loading = planning.isLoading || subjects.isLoading;
  const error = planning.error ?? subjects.error ?? null;

  const rows = useMemo<TaughtRow[] | undefined>(() => {
    if (!planning.classes || !subjects.data) return undefined;
    return [...planning.classes].sort((a, b) => compareClassNames(a.name, b.name)).flatMap(cls => {
      const mine = new Set(subjects.plannable?.[cls.id] ?? []);
      return (subjects.forClass(cls.name) ?? []).filter(subject => mine.has(subject.id)).map(subject => ({
        id: `${cls.id}:${subject.id}`, subjectId: subject.id, subjectName: subject.name, nameAr: subject.nameAr,
        className: cls.name, subSubjects: subject.subSubjects.map(part => part.name),
      }));
    }).sort((a, b) => a.subjectName.localeCompare(b.subjectName) || compareClassNames(a.className, b.className));
  }, [planning.classes, subjects]);

  const edit = (row: TaughtRow) => levelSheet.open({ id: row.subjectId, name: row.subjectName }, row.className);
  const editButton = (row: TaughtRow) => canEdit && <NButton type="button" variant="ghost" size="sm" className="h-8 gap-1.5 px-2 text-xs"
    leftIcon={<Pencil className="size-3.5" />} aria-label={`${t('subjects.levels.edit')} · ${row.subjectName} · ${toOfficialClassName(row.className)}`}
    onClick={event => { event.stopPropagation(); edit(row); }}>{t('common.edit')}</NButton>;

  const columns: ColumnDef<TaughtRow>[] = [
    { accessorKey: 'subjectName', size: 240, header: t('subjects.table.name'), enableSorting: true, cell: ({ row }) => <SubjectName row={row.original} /> },
    { accessorKey: 'className', size: 110, header: t('assessments.form.class'), enableSorting: true, cell: ({ row }) => <ClassBadge name={row.original.className} /> },
    { id: 'subSubjects', size: 560, header: t('subjects.table.subSubjects'), enableSorting: false, accessorFn: row => row.subSubjects.join(' '),
      cell: ({ row }) => <div className="py-1"><Components names={row.original.subSubjects} /></div> },
    ...(canEdit ? [{ id: 'edit', size: 110, header: '', enableSorting: false, cell: ({ row }) => <div className="flex justify-end">{editButton(row.original)}</div> } satisfies ColumnDef<TaughtRow>] : []),
  ];

  // The table frames each card; its content needs no border of its own.
  const card = ({ data }: { data: TaughtRow }) => <div className="flex flex-col gap-3 p-4">
    <div className="flex items-center gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary" aria-hidden="true"><BookOpen className="size-5" /></span>
      <div className="min-w-0 flex-1"><SubjectName row={data} large /></div>
      <ClassBadge name={data.className} />
    </div>
    <div className="rounded-lg bg-muted/40 p-2.5"><Components names={data.subSubjects} /></div>
    {canEdit && <NButton type="button" variant="outline" size="sm" className="w-full" leftIcon={<Pencil className="size-3.5" />}
      aria-label={`${t('subjects.levels.edit')} · ${data.subjectName} · ${toOfficialClassName(data.className)}`}
      onClick={event => { event.stopPropagation(); edit(data); }}>{t('subjects.levels.edit')}</NButton>}
  </div>;

  return <div className="flex h-full w-full flex-col gap-2">
    <NPageHeader icon={FEATURE_ICONS.subjects} title={t('navigation.subjects')}
      subtitle={isCountUnknown(error, rows, loading) ? undefined : t('subjects.subtitle.mine', { count: new Set(rows?.map(row => row.subjectId)).size })}>
      <NPageHeaderActions><PageHeaderGlobalActions /></NPageHeaderActions>
    </NPageHeader>
    <NTable
      exportTitle={t('navigation.subjects')}
      responsiveSkeleton
      data={rows ?? []}
      columns={columns}
      loading={loading}
      error={hasFailedToLoad(error, rows) ? error : null}
      renderError={currentError => isAuthorizationError(currentError) ? <NForbiddenState surface="panel" /> : <NErrorState surface="panel" />}
      renderCard={card}
      showDeleteSelection={false}
      renderEmpty={() => <NEmptyState surface="panel" icon={FEATURE_ICONS.subjects} title={t('subjects.mine.emptyTitle')} description={t('subjects.mine.emptyDescription')} />}
    />
    {levelSheet.sheet}
  </div>;
}
