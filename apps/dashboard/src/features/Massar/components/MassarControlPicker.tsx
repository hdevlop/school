'use client';
import { CalendarClock, Check, ChevronDown, Plus } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import type { MassarRound } from '@sms/contracts';
import type { controlList } from '../config/massarModel';
import type { ControlLabels } from '../config/controlLabels';
import styles from './Massar.module.css';

type Control = ReturnType<typeof controlList<MassarRound>>[number];

type Props = {
  controls: Control[];
  round: MassarRound | undefined;
  labels: ControlLabels;
  manager: boolean;
  busy: boolean;
  pending: boolean;
  /** The integrated activities, outside the plan, offered once every planned Contrôle is open. */
  activities: { term: number; exam: number } | null;
  onPick: (roundId: string) => void;
  onOpenNext: () => void;
  onEditDueDate: () => void;
};

/** Every Contrôle of the year: the opened ones to pick, the next one to open (managers), the later ones shown with their date. */
export function MassarControlPicker({ controls, round, labels, manager, busy, pending, activities, onPick, onOpenNext, onEditDueDate }: Props) {
  const { t } = useTranslation();
  const { label, shortLabel, when, shortWhen } = labels;
  const current = round ? controls.find(item => item.round?.id === round.id) ?? round : undefined;

  return <div className={styles.controlPicker}>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className={styles.controlTrigger} disabled={busy} aria-label={t('massar.flow.chooseControl')}>
          <span className={styles.triggerFull}>
            <strong>{round ? label(round) : t('massar.flow.chooseControl')}</strong>
            <small>{current ? when(current) : t('massar.flow.plan.noDate')}</small>
          </span>
          {/* The narrowed column: a short name (C1-S1) over the bare dates, on the same two lines. */}
          {round && current && <span className={styles.triggerShort} aria-hidden><strong>{shortLabel(round)}</strong><small>{shortWhen(current)}</small></span>}
          <ChevronDown aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        {controls.map(item => {
          const opens = !item.round && item.state === 'next' && manager;
          const selected = !!item.round && item.round.id === round?.id;
          return <DropdownMenuItem key={`${item.term}:${item.exam}`} className={styles.controlOption}
            data-state={item.round ? 'open' : item.state}
            disabled={item.round ? busy : !opens || busy || pending}
            onSelect={() => { if (item.round) onPick(item.round.id); else if (opens) onOpenNext(); }}>
            <span className={styles.controlCheck}>{selected && <Check aria-hidden />}{opens && <Plus aria-hidden />}</span>
            <span><strong>{opens ? t('massar.flow.openNamed', { name: label(item) }) : label(item)}</strong><small>{when(item)}</small></span>
          </DropdownMenuItem>;
        })}
        {activities && <>
          <DropdownMenuSeparator />
          <DropdownMenuItem className={styles.controlOption} data-state="next" disabled={busy || pending} onSelect={onOpenNext}>
            <span className={styles.controlCheck} />
            <span><strong>{t('massar.flow.openNext')}</strong><small>{label(activities)}</small></span>
          </DropdownMenuItem>
        </>}
      </DropdownMenuContent>
    </DropdownMenu>
    {round && manager && <button type="button" className={styles.controlDate} title={t('massar.flow.changeDueDate')} aria-label={t('massar.flow.changeDueDate')}
      disabled={busy || pending} onClick={onEditDueDate}><CalendarClock aria-hidden /></button>}
  </div>;
}
