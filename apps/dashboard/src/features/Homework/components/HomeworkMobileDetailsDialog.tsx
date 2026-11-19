'use client';

import type { ReactNode } from 'react';
import { AlarmClock, ArrowLeft, BookOpen, Building, Calendar, Eye, NotebookPen, Paperclip, SquareCheckBig, User, X, type LucideIcon } from 'lucide-react';
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, NajmScroll } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import type { HomeworkRow } from '@sms/contracts';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';
import HomeworkAttachments from './HomeworkAttachments';
import { CompletionBadge, homeworkSectionNames, ParentAcknowledgment } from './HomeworkCard';

const closeControl = 'grid size-11 place-items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

function DetailTile({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 items-start gap-2.5 rounded-xl border border-border/70 bg-muted/35 p-2.5 max-[359px]:gap-2 max-[359px]:p-2">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/12 text-primary max-[359px]:size-7">
        <Icon className="size-4" aria-hidden />
      </span>
      <dl className="min-w-0 space-y-1">
        <dt className="text-xs leading-tight text-muted-foreground">{label}</dt>
        <dd className="text-sm leading-tight font-semibold wrap-anywhere">{children}</dd>
      </dl>
    </div>
  );
}

export default function HomeworkMobileDetailsDialog({ homework, onOpenChange, zIndex }: {
  homework: HomeworkRow;
  onOpenChange: (open: boolean) => void;
  zIndex: number;
}) {
  const { t } = useTranslation();
  const { displayDateOnly } = useSchoolFormat();
  const subject = homework.subject;
  const subjectCode = subject?.code ? `(${subject.code})` : '';
  const subjectName = subjectCode && subject?.name.endsWith(subjectCode)
    ? subject.name.slice(0, -subjectCode.length).trimEnd()
    : subject?.name;
  const placement = [homework.class?.name, ...homeworkSectionNames(homework)].filter(Boolean);
  const attachments = homework.attachments ?? [];
  const counts = homework.completionCounts;
  const missed = counts ? counts.incomplete + counts.notDone : 0;

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent padding="none" hideClose aria-describedby={undefined} style={{ zIndex }}
        className="flex h-dvh max-h-dvh min-h-0 max-w-none flex-col border-0 bg-background md:h-auto md:max-h-[90dvh] md:max-w-lg md:rounded-2xl">
        <DialogHeader className="grid shrink-0 grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-center gap-1 px-2 py-1 text-center">
          <DialogClose type="button" aria-label={t('homework.card.backToList')} className={closeControl}>
            <span className="grid size-8 place-items-center rounded-lg bg-muted text-foreground">
              <ArrowLeft className="size-[1.125rem] rtl:rotate-180" aria-hidden />
            </span>
          </DialogClose>
          <DialogTitle className="text-xl leading-tight font-bold">{t('homework.dialogs.viewTitle')}</DialogTitle>
          <DialogClose type="button" aria-label={t('common.close')} className={closeControl}>
            <span className="grid size-8 place-items-center rounded-full border border-primary text-primary">
              <X className="size-4" aria-hidden />
            </span>
          </DialogClose>
        </DialogHeader>

        <NajmScroll axis="y" className="min-h-0 flex-1">
          <div className="px-2.5 pt-1.5 pb-[max(.75rem,env(safe-area-inset-bottom))]">
            <article className="flex min-w-0 flex-col gap-3.5 rounded-2xl border bg-card p-3 text-card-foreground shadow-sm">
              <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 px-1 py-0.5">
                <span className="grid size-15 place-items-center rounded-full bg-primary text-primary-foreground">
                  <NotebookPen className="size-7" aria-hidden />
                </span>
                <div className="min-w-0 space-y-1.5 border-s ps-3">
                  <h3 className="text-xl leading-tight font-bold wrap-anywhere"><bdi>{homework.title}</bdi></h3>
                  {subject && (
                    <span className="inline-flex max-w-full items-center gap-2 rounded-lg border border-primary/20 bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                      <BookOpen className="size-4 shrink-0" aria-hidden />
                      <span className="min-w-0 wrap-anywhere">
                        <bdi>{subjectName}</bdi>
                        {subjectCode && <> <bdi dir="ltr">{subjectCode}</bdi></>}
                        {homework.subSubject && <> · <bdi>{homework.subSubject}</bdi></>}
                      </span>
                    </span>
                  )}
                  {homework.teacher?.name && (
                    <p className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
                      <User className="size-4 shrink-0" aria-hidden />
                      <span className="shrink-0">{t('homework.table.teacher')}</span>
                      <bdi className="truncate font-semibold text-foreground" title={homework.teacher.name}>{homework.teacher.name}</bdi>
                    </p>
                  )}
                </div>
              </div>

              {placement.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 border-t px-1 pt-3">
                  <Building className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="text-sm text-muted-foreground">{t(homework.class?.name ? 'homework.table.class' : 'homework.table.section')}</span>
                  <ul className="flex min-w-0 flex-wrap gap-1.5" role="list">
                    {placement.map((name, index) => (
                      <li key={`${name}-${index}`} className="min-w-8 rounded-lg border bg-muted/55 px-2.5 py-1 text-center text-xs font-semibold">
                        <bdi>{name}</bdi>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {homework.content && <p className="px-1 text-sm wrap-anywhere whitespace-pre-wrap" dir="auto">{homework.content}</p>}

              <div className="grid grid-cols-2 gap-2.5">
                <DetailTile icon={Calendar} label={t('homework.card.givenOn')}>
                  <time dateTime={homework.date}>{displayDateOnly(homework.date)}</time>
                </DetailTile>
                <DetailTile icon={AlarmClock} label={t('homework.card.dueOn')}>
                  {homework.dueOn ? <time dateTime={homework.dueOn}>{displayDateOnly(homework.dueOn)}</time> : t('homework.card.noDueDate')}
                </DetailTile>
                {counts ? (
                  <DetailTile icon={SquareCheckBig} label={t('homework.table.followUp')}>
                    {counts.reviewed ? (
                      <span className="flex flex-col items-start gap-1 text-xs">
                        <span className="rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-emerald-700 dark:text-emerald-300">
                          {t('homework.completion.doneCount', { count: counts.reviewed - missed })}
                        </span>
                        <span className={missed ? 'rounded-md bg-destructive/15 px-1.5 py-0.5 text-red-700 dark:text-red-300' : 'rounded-md bg-muted px-1.5 py-0.5 text-muted-foreground'}>
                          {t('homework.completion.missed', { count: missed })}
                        </span>
                      </span>
                    ) : t('homework.completion.notReviewed')}
                  </DetailTile>
                ) : homework.completion ? (
                  <DetailTile icon={SquareCheckBig} label={t('homework.table.followUp')}>
                    <CompletionBadge status={homework.completion.status} note={homework.completion.note} />
                  </DetailTile>
                ) : null}
                {homework.studentCount != null && (
                  <DetailTile icon={Eye} label={t('homework.card.seenByParents')}>
                    {t('homework.card.seenCount', { seen: homework.seenCount ?? 0, total: homework.studentCount })}
                  </DetailTile>
                )}
              </div>

              {attachments.length > 0 && (
                <section className="grid gap-2.5 border-t pt-3">
                  <h4 className="flex items-center gap-2 text-base font-bold">
                    <Paperclip className="size-5 text-primary" aria-hidden />
                    {t(attachments.length === 1 ? 'homework.attachments.singularTitle' : 'homework.attachments.title')}
                  </h4>
                  <HomeworkAttachments homeworkId={homework.id} attachments={attachments} detailed />
                </section>
              )}
              {!!homework.children?.length && <ParentAcknowledgment homework={homework} />}
            </article>
          </div>
        </NajmScroll>
      </DialogContent>
    </Dialog>
  );
}
