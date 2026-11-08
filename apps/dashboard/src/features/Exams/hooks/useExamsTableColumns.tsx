import { useMemo } from 'react';
import { formatTimeRangeDuration, NBadge } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { foldSubjectName } from '@sms/contracts';
import { EXAM_STATUS_COLORS } from '../examBadgeColors';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';

import { exportLabel } from '@/shared/tableExport';

type Named = { title?: string | null; subject?: { name?: string | null } | null };
type NamedRef = { id?: string; name?: string | null } | null;
/** An exam as the list reads it. */
export type ExamRow = Named & { id: string; date: string; planningEntryId?: string | null; class?: NamedRef; section?: NamedRef; teacher?: NamedRef; sectionIds?: string[] | null;
  startTime?: string | null; endTime?: string | null; duration?: number | null };

/** The exam's own name (a Planning sub-subject, a manual title), else its subject's. */
export const examTitle = (exam: Named) => exam.title?.trim() || exam.subject?.name || '';

/** The subject under the title, only when it says something the title does not. */
export const examSubjectLine = (exam: Named) => {
  const subject = exam.subject?.name ?? '';
  return subject && foldSubjectName(subject) !== foldSubjectName(examTitle(exam)) ? subject : '';
};

/**
 * Planning makes one exam per section, each on that section's teaching
 * assignment (its teacher marks it). A list shows each Planning exam once,
 * with every section it covers; `members` are the exams the row stands for.
 */
export function groupPlannedExams<T extends { id: string; date: string; planningEntryId?: string | null }>(exams: T[]): Array<T & { members?: T[] }> {
  const groups = new Map<string, T[]>(), rows: Array<T & { members?: T[] }> = [];
  for (const exam of exams) {
    if (!exam.planningEntryId) { rows.push(exam); continue; }
    const group = groups.get(exam.planningEntryId);
    if (group) { group.push(exam); continue; }
    const members = [exam];
    groups.set(exam.planningEntryId, members);
    rows.push({ ...exam, members });
  }
  return rows;
}

const sectionNames = (row: { section?: { name?: string | null } | null; members?: Array<{ section?: { name?: string | null } | null }> }) =>
  [...new Set((row.members ?? [row]).map(member => member.section?.name).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b));
const teacherNames = (row: { teacher?: { name?: string | null } | null; members?: Array<{ teacher?: { name?: string | null } | null }> }) =>
  [...new Set((row.members ?? [row]).map(member => member.teacher?.name).filter(Boolean) as string[])];

/** Both, for search and export: "Lecture · Français". */
export const examName = (exam: Named) => [examTitle(exam), examSubjectLine(exam)].filter(Boolean).join(' · ');

/**
 * Columns a newcomer reads at a glance: what, who, when and how long, out
 * of what, and where it stands. Type, duration and the passing mark live in the exam's
 * details and form.
 */
export const useExamsTableColumns = () => {
  const { t } = useTranslation();
  const { displayDate } = useSchoolFormat();

  return useMemo(() => [
    {
      accessorKey: 'title',
      header: t('exams.table.exam'),
      enableSorting: true,
      // Search finds the subject as well as the title.
      filterFn: (row, _columnId, value) => examName(row.original).toLocaleLowerCase().includes(String(value ?? '').trim().toLocaleLowerCase()),
      meta: { exportValue: (row) => examName(row) },
      cell: ({ row }) => (
        // Each line keeps the column's alignment; only the words inside follow
        // their own language, so Arabic and French names line up.
        <div className="min-w-0 text-start">
          <div className="truncate text-sm font-medium"><bdi dir="auto">{examTitle(row.original)}</bdi></div>
          {/* The subject, then a teacher only when one is assigned: an empty slot is not an error. */}
          {(examSubjectLine(row.original) || teacherNames(row.original).length > 0) && <div className="truncate text-xs text-muted-foreground">
            {[examSubjectLine(row.original), ...teacherNames(row.original)].filter(Boolean).map((part, index) => <span key={index}>{index > 0 && ' · '}<bdi dir="auto">{part}</bdi></span>)}
          </div>}
        </div>
      ),
      size: 340,
    },
    {
      accessorKey: 'class',
      header: t('exams.table.class'),
      enableSorting: false,
      cell: ({ row }) => {
        const className = row.original.class?.name;
        if (!className) return <span className="text-muted-foreground">—</span>;
        // "CE1 A, B": every section the row covers.
        const sections = row.original.members ? sectionNames(row.original) : [];
        const sectionName = row.original.section?.name;
        const additionalSections = Math.max((row.original.sectionIds?.length || 0) - (sectionName ? 1 : 0), 0);
        const sectionLabel = sections.length ? sections.join(', ') : sectionName ? `${sectionName}${additionalSections ? ` +${additionalSections}` : ''}` : '';
        return <div className="text-sm font-medium">{[className, sectionLabel].filter(Boolean).join(' ')}</div>;
      },
    },
    {
      accessorKey: 'date',
      header: t('exams.table.date'),
      enableSorting: true,
      cell: ({ getValue }) => {
        const value = getValue();
        return value ? <div className="text-sm">{displayDate(value, { weekday: 'short', day: 'numeric', month: 'short' })}</div> : <span className="text-muted-foreground">—</span>;
      },
    },
    {
      // "08:30 – 10:00" and its length; an exam with no time shows its length only.
      id: 'time',
      accessorFn: (row) => row.startTime ?? '',
      header: t('exams.table.time'),
      enableSorting: true,
      cell: ({ row }) => {
        const { startTime, endTime, duration } = row.original;
        const units = { hourShort: t('common.hourShort'), minuteShort: t('common.minuteShort') };
        const from = startTime?.slice(0, 5), to = endTime?.slice(0, 5);
        return (
          <div className="flex items-center gap-2 text-sm tabular-nums">
            {from && to ? <span>{from} – {to}</span> : <span className="text-muted-foreground">—</span>}
            {duration ? <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{formatTimeRangeDuration(Number(duration), units)}</span> : null}
          </div>
        );
      },
      size: 190,
    },
    {
      accessorKey: 'totalMarks',
      header: t('exams.table.outOf'),
      enableSorting: true,
      cell: ({ row }) => <div className="text-sm font-medium tabular-nums">{Number(row.original.totalMarks)}</div>,
      size: 110,
    },
    {
      accessorKey: 'status',
      meta: { exportValue: exportLabel(code => t(`exams.status.${code}`)) },
      header: t('exams.table.status'),
      enableSorting: true,
      enableColumnFilter: true,
      cell: ({ getValue }) => {
        const status = getValue() as string;
        return <NBadge color={EXAM_STATUS_COLORS[status]} label={t(`exams.status.${status}`)} look="soft" />;
      },
      size: 140,
    },
  ], [t, displayDate]);
};
