'use client';

import { createContext, useContext, useId, useState, type ComponentType } from 'react';
import { AArrowUp, BookOpen, Calculator, Check, ChevronDown, Dumbbell, Eye, FlaskConical, Globe, MessagesSquare, Monitor, Palette, Paperclip, TriangleAlert } from 'lucide-react';
import { NSkeleton } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import type { HomeworkRow } from '@sms/contracts';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';
import type { HomeworkTone } from '../config/homeworkTones';
import { CompletionBadge, completionSummary, HomeworkFilesAndAcknowledgment, homeworkPlacementLabel } from './HomeworkCard';
import styles from './HomeworkMobile.module.css';

const subjectIcons: Record<string, typeof BookOpen> = {
  MATH: Calculator, ENG: AArrowUp, GEO: Globe, HG: Globe, SCI: FlaskConical, SVT: FlaskConical, PHY: FlaskConical,
  INFO: Monitor, ART: Palette, PE: Dumbbell, COM: MessagesSquare,
};

/** The list's colour for each card (homeworkTones): by subject, or by class when the list holds one subject. */
export const HomeworkToneContext = createContext<(row: HomeworkRow) => HomeworkTone>(() => 'default');

function CardStat({ icon: Icon, label, description, tone }: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  description?: string;
  tone?: 'placement' | 'missed';
}) {
  return (
    <span className={styles.stat} data-tone={tone} title={description ?? label}>
      <Icon className="size-3 shrink-0" aria-hidden />
      <span className="truncate" aria-hidden={description ? true : undefined}><bdi>{label}</bdi></span>
      {description && <span className="sr-only">{description}</span>}
    </span>
  );
}

export function HomeworkMobileCard({ data: homework }: { data: HomeworkRow }) {
  const { t } = useTranslation();
  const { displayDateOnly } = useSchoolFormat();
  const detailsId = useId();
  const [expanded, setExpanded] = useState(false);
  const SubjectIcon = subjectIcons[homework.subject?.code?.toUpperCase() ?? ''] ?? BookOpen;
  const tone = useContext(HomeworkToneContext)(homework);
  const subject = homework.subject?.name;
  const teacher = homework.teacher?.name;
  const placement = homeworkPlacementLabel(homework, ' · ');
  const files = homework.attachments?.length ?? 0;
  const counts = homework.completionCounts;
  const missed = counts ? counts.incomplete + counts.notDone : 0;
  const seen = homework.seenCount ?? 0;
  const total = homework.studentCount;
  const parentSeen = !!homework.children?.length && homework.children.every((child) => child.seenAt);
  const hasDetails = homework.content || files || counts || homework.completion || homework.children?.length;

  return (
    <article className={styles.mobileCard} data-subject-tone={tone}>
      <div className={styles.cardTop}>
        <div className={styles.subjectIcon}><SubjectIcon className="size-4" aria-hidden /></div>
        <div className={styles.cardIdentity}>
          <h3 className="truncate font-bold" title={homework.title}><bdi>{homework.title}</bdi></h3>
          {(subject || teacher) && (
            <div className={styles.cardByline}>
              {subject && <span className={styles.subjectName} title={subject}><bdi>{subject}</bdi></span>}
              {subject && teacher && <span aria-hidden>·</span>}
              {teacher && <span className="min-w-0 truncate" title={teacher}><bdi>{teacher}</bdi></span>}
            </div>
          )}
        </div>
        <dl className={styles.dates}>
          <dt>{t('homework.mobile.given')}</dt>
          <dd><time dateTime={homework.date}>{displayDateOnly(homework.date)}</time></dd>
          <dt>{t('homework.mobile.due')}</dt>
          <dd>{homework.dueOn ? <time dateTime={homework.dueOn}>{displayDateOnly(homework.dueOn)}</time> : <span className="text-muted-foreground" title={t('homework.card.noDueDate')}>—</span>}</dd>
        </dl>
      </div>

      <button
        type="button"
        className={styles.stats}
        aria-controls={detailsId}
        aria-expanded={expanded}
        onClick={(event) => { event.stopPropagation(); setExpanded(!expanded); }}
      >
        <span className="sr-only">{t('homework.mobile.details')} · {homework.title}</span>
        <CardStat icon={Globe} label={placement || '—'} tone="placement" />
        <CardStat icon={Paperclip} label={t('homework.mobile.files', { count: files })} />
        {counts && (
          <CardStat icon={TriangleAlert}
            label={counts.reviewed ? t('homework.mobile.missed', { count: missed }) : '—'}
            description={counts.reviewed ? t('homework.completion.missed', { count: missed }) : t('homework.completion.notReviewed')}
            tone={missed ? 'missed' : undefined}
          />
        )}
        {total != null && <CardStat icon={Eye} label={t('homework.mobile.seen', { seen, total })} />}
        {homework.completion && <CardStat icon={Check} label={t(`homework.completion.status.${homework.completion.status}`)} />}
        {parentSeen && <CardStat icon={Eye} label={t('homework.success.acknowledged')} />}
        <ChevronDown className={styles.chevron} aria-hidden />
      </button>

      <div id={detailsId} hidden={!expanded} onClick={(event) => event.stopPropagation()}>
        {expanded && (
          <div className={styles.details}>
            {homework.content && <p className="whitespace-pre-wrap wrap-anywhere">{homework.content}</p>}
            {homework.subSubject && <p className="text-muted-foreground"><bdi>{homework.subSubject}</bdi></p>}
            {counts && <p className="text-muted-foreground">{completionSummary(counts, true, t)}</p>}
            {homework.completion && <CompletionBadge status={homework.completion.status} note={homework.completion.note} />}
            <HomeworkFilesAndAcknowledgment homework={homework} />
            {!hasDetails && !homework.subSubject && <p className="text-muted-foreground">{t('common.noDescription')}</p>}
          </div>
        )}
      </div>
    </article>
  );
}

export function HomeworkMobileCardSkeleton() {
  return (
    <div className={`${styles.mobileCard} ${styles.cardSkeleton}`} aria-hidden>
      <div className={styles.cardTop}>
        <NSkeleton className="size-8 rounded-lg" />
        <div className="grid gap-1.5">
          <NSkeleton className="h-3 w-3/4 rounded" />
          <NSkeleton className="h-2.5 w-1/2 rounded" />
        </div>
        <div className="grid w-24 gap-1.5 pe-3">
          <NSkeleton className="h-2.5 rounded" />
          <NSkeleton className="h-2.5 rounded" />
        </div>
      </div>
      <div className={styles.stats}>
        {[0, 1, 2, 3].map((index) => <NSkeleton key={index} className="h-5 min-w-0 flex-1 rounded" />)}
        <span className={styles.chevron} />
      </div>
    </div>
  );
}
