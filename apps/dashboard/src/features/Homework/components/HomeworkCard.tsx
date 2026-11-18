'use client'

import React, { useState } from 'react';
import { BookOpen, Building, Calendar, CalendarClock, Check, ClipboardCheck, DoorOpen, Eye, NotebookPen, Paperclip, User } from 'lucide-react';
import { Label, NBadge, NButton, NSectionInfo } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import type { HomeworkCompletionStatus, HomeworkRow } from '@sms/contracts';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';
import { COMPLETION_COLORS } from '../config/homeworkCompletion';
import { useAcknowledgeHomework } from '../hooks/useHomework';
import HomeworkAttachments from './HomeworkAttachments';

/** The class and its target sections, as "1AC - A, B". */
export function homeworkPlacementLabel(row: Pick<HomeworkRow, 'class' | 'section' | 'targetSections'>) {
  const sections = row.targetSections?.length
    ? row.targetSections.map((section) => section.name).join(', ')
    : row.section?.name;
  return [row.class?.name, sections].filter(Boolean).join(' - ');
}

/**
 * How the follow-up went: the three counts once opened, a short line in a list
 * card, where a phone has no room for the counts.
 */
function completionSummary(counts: NonNullable<HomeworkRow['completionCounts']>, detailed: boolean, t: (key: string, params?: Record<string, unknown>) => string) {
  if (!counts.reviewed) return t('homework.completion.notReviewed');
  const missed = counts.incomplete + counts.notDone;
  if (!detailed) return missed ? t('homework.completion.missed', { count: missed }) : t('homework.completion.allDone');
  return t('homework.completion.summary', { done: counts.reviewed - missed, incomplete: counts.incomplete, notDone: counts.notDone });
}

/** The teacher's follow-up of one pupil, with their remark when there is one. */
const CompletionBadge = ({ status, note }: { status: HomeworkCompletionStatus; note: string | null }) => {
  const { t } = useTranslation();
  return (
    <span className="flex flex-wrap items-center gap-1">
      <NBadge color={COMPLETION_COLORS[status]} look="soft" label={t(`homework.completion.status.${status}`)} />
      {note && <span className="text-xs text-muted-foreground">{note}</span>}
    </span>
  );
};

// A parent confirms they saw the homework, once per child. The dialog shows
// a row read earlier, so a confirmation is kept here until the list reloads.
const ParentAcknowledgment = ({ homework }: { homework: HomeworkRow }) => {
  const { t } = useTranslation();
  const { displayDateOnly } = useSchoolFormat();
  const acknowledge = useAcknowledgeHomework();
  const [justSeen, setJustSeen] = useState<Record<string, string>>({});
  if (!homework.children?.length) return null;

  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3">
      {homework.children.map((child) => {
        const seenAt = child.seenAt ?? justSeen[child.id];
        return (
          <div key={child.id} className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex flex-wrap items-center gap-2 text-sm">
              <span>
                <span className="text-muted-foreground">{t('homework.card.child')} </span>
                <span className="font-medium">{child.name}</span>
              </span>
              {child.completion && <CompletionBadge status={child.completion.status} note={child.completion.note} />}
            </span>
            {seenAt ? (
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <Check className="h-4 w-4 text-primary" aria-hidden />
                {t('homework.card.seenOn', { date: displayDateOnly(seenAt) })}
              </span>
            ) : (
              <NButton
                type="button"
                size="sm"
                disabled={acknowledge.isPending}
                onClick={async () => {
                  const result = await acknowledge.mutateAsync({ id: homework.id, studentId: child.id }).catch(() => null);
                  const at = result?.data?.seenAt;
                  if (at) setJustSeen((current) => ({ ...current, [child.id]: at }));
                }}
              >
                <Eye className="h-4 w-4" aria-hidden />
                {t('homework.card.markSeen')}
              </NButton>
            )}
          </div>
        );
      })}
    </div>
  );
};

/**
 * One homework. In a list it names its files by count; opened (`detailed`),
 * it shows them, and a parent can mark it seen.
 */
const HomeworkCard = ({ data, detailed = false }: { data: HomeworkRow; detailed?: boolean }) => {
  const { t } = useTranslation();
  const { displayDateOnly } = useSchoolFormat();
  const homework = data;
  const subjectName = homework.subject?.code ? `${homework.subject.name} (${homework.subject.code})` : homework.subject?.name;
  const subject = subjectName && homework.subSubject ? `${subjectName} · ${homework.subSubject}` : subjectName;
  const placement = homeworkPlacementLabel(homework);
  const attachments = homework.attachments ?? [];

  return (
    <div className="flex items-start gap-4 p-4">
      <div className="shrink-0">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 dark:bg-primary">
          <NotebookPen className="h-6 w-6 text-primary dark:text-white" />
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <Label className="text-md font-bold">{homework.title}</Label>

        {homework.content && (
          <div className="whitespace-pre-wrap text-sm text-muted-foreground">{homework.content}</div>
        )}

        <div className="space-y-2">
          {subject && (
            <NSectionInfo icon={BookOpen} iconColor="text-primary" label={t('homework.table.subject')} value={subject} valueColor="text-primary" />
          )}
          {homework.teacher?.name && (
            <NSectionInfo icon={User} iconColor="text-muted-foreground" label={t('homework.table.teacher')} value={homework.teacher.name} valueColor="text-foreground font-medium" />
          )}
          {placement && (
            <NSectionInfo icon={detailed ? Building : DoorOpen} iconColor="text-muted-foreground" label={t('homework.table.class')} value={placement} valueColor="text-foreground font-medium" />
          )}
          <NSectionInfo icon={Calendar} iconColor="text-muted-foreground" label={t('homework.card.givenOn')} value={displayDateOnly(homework.date)} valueColor="text-foreground font-medium" />
          <NSectionInfo
            icon={CalendarClock}
            iconColor="text-muted-foreground"
            label={t('homework.card.dueOn')}
            value={homework.dueOn ? displayDateOnly(homework.dueOn) : t('homework.card.noDueDate')}
            valueColor="text-foreground font-medium"
          />
          {!detailed && attachments.length > 0 && (
            <NSectionInfo icon={Paperclip} iconColor="text-muted-foreground" label={t('homework.table.attachments')} value={String(attachments.length)} valueColor="text-foreground font-medium" />
          )}
          {homework.completionCounts && (
            <NSectionInfo
              icon={ClipboardCheck}
              iconColor="text-muted-foreground"
              label={t('homework.table.followUp')}
              value={completionSummary(homework.completionCounts, detailed, t)}
              valueColor="text-foreground font-medium"
            />
          )}
          {homework.completion && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <ClipboardCheck className="h-4 w-4 text-muted-foreground" aria-hidden />
              <span className="text-muted-foreground">{t('homework.table.followUp')}</span>
              <CompletionBadge status={homework.completion.status} note={homework.completion.note} />
            </div>
          )}
          {homework.studentCount != null && (
            <NSectionInfo
              icon={Eye}
              iconColor="text-muted-foreground"
              label={t('homework.card.seenByParents')}
              value={t('homework.card.seenCount', { seen: homework.seenCount ?? 0, total: homework.studentCount })}
              valueColor="text-foreground font-medium"
            />
          )}
        </div>

        {detailed && <HomeworkAttachments homeworkId={homework.id} attachments={attachments} />}
        {detailed && <ParentAcknowledgment homework={homework} />}
      </div>
    </div>
  );
};

export default HomeworkCard;
