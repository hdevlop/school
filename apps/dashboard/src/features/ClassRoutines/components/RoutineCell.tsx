'use client';

import { DoorOpen, UserRound } from 'lucide-react';
import { useTranslation } from 'najm-i18n/react';
import { describeRoutineContent, type RoutineContentGroup } from '@sms/contracts/routines';
import { colorFor } from '../utils/subjectColors';

export default function RoutineCell({
  subjectId,
  subjectName,
  teacherName,
  roomNumber,
  contentGroups = [],
  color = colorFor({ id: subjectId }),
}: {
  subjectId: string;
  subjectName: string;
  teacherName?: string;
  roomNumber?: string | null;
  contentGroups?: RoutineContentGroup[];
  color?: string;
}) {
  const { t } = useTranslation();
  const summary = describeRoutineContent(contentGroups, subjectName, t('classRoutines.ui.content.or'));

  return (
    <div className={`flex h-full min-h-24 min-w-0 flex-col ${color}`} title={contentGroups.length ? `${subjectName}: ${summary}` : subjectName}>
      {contentGroups.length ? (
        // The lines between groups take the sheet's direction; only the labels
        // take their own, or an Arabic label would put its line on its far side.
        <div className="flex min-h-20 flex-1 items-stretch divide-x divide-dashed divide-current/30" aria-label={summary}>
          {contentGroups.map((group, index) => group.kind === 'fixed' ? (
            <span key={index} className="flex min-w-0 flex-1 items-center justify-center break-words px-1 py-2 text-center text-xs font-bold leading-tight">
              <span dir="auto" className="min-w-0">{group.label}</span>
            </span>
          ) : (
            <span key={index} className="relative flex min-h-20 min-w-24 flex-[1.3] overflow-hidden" aria-label={`${group.options[0]} ${t('classRoutines.ui.content.or')} ${group.options[1]}`}>
              <svg className="pointer-events-none absolute inset-0 h-full w-full text-current/45" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                <line x1="0" y1="0" x2="100" y2="100" stroke="currentColor" strokeWidth="0.8" />
              </svg>
              {/* The line always runs top-left to bottom-right, so the labels
                  take physical sides, whatever their script's direction. */}
              <span dir="auto" className="absolute inset-x-1 top-1 max-h-[42%] overflow-hidden break-words text-right text-xs font-bold leading-tight">{group.options[0]}</span>
              <span className="sr-only">{t('classRoutines.ui.content.or')}</span>
              <span dir="auto" className="absolute inset-x-1 bottom-1 max-h-[42%] overflow-hidden break-words text-left text-xs font-bold leading-tight">{group.options[1]}</span>
            </span>
          ))}
        </div>
      ) : (
        <span dir="auto" className="flex min-h-20 flex-1 items-center justify-center px-2 text-center text-[0.95rem] font-bold leading-tight">{subjectName}</span>
      )}
      {/* The section's own room is every lesson's; a cell names only a different one. */}
      {teacherName || roomNumber ? (
        <div className="flex flex-wrap items-center justify-between gap-1 border-t border-dashed border-current/20 px-1.5 py-0.5 text-[0.7rem] font-medium opacity-70">
          {teacherName && <span className="flex min-w-0 items-center gap-1"><UserRound className="h-3 w-3 shrink-0" aria-hidden="true" /><span className="break-words" dir="auto">{teacherName}</span></span>}
          {roomNumber && <span className="flex items-center gap-1"><DoorOpen className="h-3 w-3" aria-hidden="true" />{roomNumber}</span>}
        </div>
      ) : null}
    </div>
  );
}
