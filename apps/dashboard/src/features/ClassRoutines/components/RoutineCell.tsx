'use client';

import { DoorOpen, UserRound } from 'lucide-react';
import { useTranslation } from 'najm-i18n/react';
import { describeRoutineContent, type RoutineContentGroup } from '@sms/contracts/routines';

const accents = [
  'bg-sky-100 text-sky-950 dark:bg-sky-950/55 dark:text-sky-100',
  'bg-amber-100 text-amber-950 dark:bg-amber-950/55 dark:text-amber-100',
  'bg-emerald-100 text-emerald-950 dark:bg-emerald-950/55 dark:text-emerald-100',
  'bg-rose-100 text-rose-950 dark:bg-rose-950/55 dark:text-rose-100',
  'bg-violet-100 text-violet-950 dark:bg-violet-950/55 dark:text-violet-100',
  'bg-cyan-100 text-cyan-950 dark:bg-cyan-950/55 dark:text-cyan-100',
];

const colorFor = (subjectId: string) => accents[[...subjectId].reduce((total, char) => total + char.charCodeAt(0), 0) % accents.length];

export default function RoutineCell({
  subjectId,
  subjectName,
  teacherName,
  roomNumber,
  defaultRoom,
  contentGroups = [],
}: {
  subjectId: string;
  subjectName: string;
  teacherName?: string;
  roomNumber?: string | null;
  defaultRoom?: string | null;
  contentGroups?: RoutineContentGroup[];
}) {
  const { t } = useTranslation();
  const summary = describeRoutineContent(contentGroups, subjectName, t('classRoutines.ui.content.or'));

  return (
    <div className={`flex h-full min-h-20 min-w-0 flex-col ${colorFor(subjectId)}`} title={contentGroups.length ? `${subjectName}: ${summary}` : subjectName}>
      {contentGroups.length ? (
        <div className="flex min-h-16 flex-1 items-stretch divide-x divide-dotted divide-current/35 rtl:divide-x-reverse" aria-label={summary}>
          {contentGroups.map((group, index) => group.kind === 'fixed' ? (
            <span key={index} dir="auto" className="flex min-w-0 flex-1 items-center justify-center break-words px-1.5 py-2 text-center text-[11px] font-semibold leading-tight">
              {group.label}
            </span>
          ) : (
            <span key={index} className="relative flex min-h-20 min-w-24 flex-[1.3] overflow-hidden" aria-label={`${group.options[0]} ${t('classRoutines.ui.content.or')} ${group.options[1]}`}>
              <svg className="pointer-events-none absolute inset-0 h-full w-full text-current/45" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                <line x1="0" y1="0" x2="100" y2="100" stroke="currentColor" strokeWidth="0.8" />
              </svg>
              <span dir="auto" className="absolute inset-x-1 top-1 max-h-[42%] overflow-hidden break-words text-end text-[10px] font-semibold leading-tight">{group.options[0]}</span>
              <span className="sr-only">{t('classRoutines.ui.content.or')}</span>
              <span dir="auto" className="absolute inset-x-1 bottom-1 max-h-[42%] overflow-hidden break-words text-start text-[10px] font-semibold leading-tight">{group.options[1]}</span>
            </span>
          ))}
        </div>
      ) : (
        <span dir="auto" className="flex min-h-16 flex-1 items-center justify-center px-2 text-center text-xs font-bold leading-tight">{subjectName}</span>
      )}
      {teacherName ? (
        <div className="flex items-center gap-2 border-t border-current/15 px-1.5 py-1 text-[10px] opacity-75">
          <span className="flex min-w-0 items-center gap-1"><UserRound className="h-3 w-3 shrink-0" /><span className="truncate">{teacherName}</span></span>
          <span className="ms-auto flex shrink-0 items-center gap-1"><DoorOpen className="h-3 w-3" />{roomNumber || defaultRoom || t('classRoutines.ui.grid.noRoom')}</span>
        </div>
      ) : null}
    </div>
  );
}
