'use client';
import { Fragment, type CSSProperties } from 'react';
import { NajmScroll } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import type { MassarSheetRow } from '@sms/contracts';
import { classCycle, classState, massarClassColors, progressPercent } from '../config/massarModel';
import styles from './Massar.module.css';

type Props = {
  classes: string[];
  sheets: MassarSheetRow[];
  blocked: Array<{ className: string; unmatchedCount: number }>;
  selected: string;
  /** The narrowed column: each class's name moves into its tooltip. */
  compact: boolean;
  busy: boolean;
  onSelect: (className: string) => void;
};

/** The classes of the Contrôle, primary then collège, each with how much of it is entered. */
export function MassarClassList({ classes, sheets, blocked, selected, compact, busy, onSelect }: Props) {
  const { t } = useTranslation();
  const cycles = new Set(classes.map(classCycle)).size;
  const sheetsOf = (name: string) => sheets.filter(sheet => sheet.className === name);
  const doneCount = classes.filter(name => ['done', 'exported'].includes(classState(sheetsOf(name)))).length;

  return <section className={styles.sideSection}>
    <h2 className={styles.sideTitle}>{t('massar.flow.sideClasses')}<small>{t('massar.flow.classesDone', { count: doneCount, total: classes.length })}</small></h2>
    {/* Najm's overlay scrollbar: it takes no width from the classes, even in the narrow column. */}
    <NajmScroll axis="both" autoHide="leave" className={styles.classScroll}><nav className={styles.classList} aria-label={t('massar.class')}>
      {classes.map((name, index) => {
        // Primary then collège: each cycle opens with its name once both are here.
        const cycle = classCycle(name);
        const cycleTitle = cycles > 1 && (index === 0 || classCycle(classes[index - 1]) !== cycle);
        const list = sheetsOf(name);
        const status = blocked.some(cls => cls.className === name) ? 'waiting' : classState(list);
        const total = list.reduce((sum, sheet) => sum + sheet.total, 0);
        const filled = list.reduce((sum, sheet) => sum + sheet.total - sheet.missing, 0);
        const full = status === 'started' ? t('massar.sheetStatus.in_progress') : t(`massar.flow.status.${status}`, { count: filled, total });
        // Every class shows how much is entered; a sent, changed or waiting class adds its sign.
        const shown = status === 'done' || status === 'exported' ? 100 : progressPercent(filled, total);
        const sign = status === 'exported' ? '🔒 ' : status === 'changed_after_export' ? '⚠ ' : '';
        const short = status === 'waiting' ? '⏸' : `${sign}${shown}%`;
        const [color] = massarClassColors(name);

        return <Fragment key={name}>
          {cycleTitle && <span className={styles.cycleTitle}>{t(`massar.flow.cycle.${cycle}`)}</span>}
          <button type="button" className={styles.classItem} aria-pressed={selected === name} disabled={busy} title={compact ? `${name} · ${full}` : full}
            style={{ '--class-color': color } as CSSProperties} onClick={() => onSelect(name)}>
            <span className={styles.classDot} style={{ background: color }} />
            <span className={styles.classText}><bdi>{name}</bdi><span className={styles.classBar} aria-hidden><span data-status={status} style={{ width: `${shown}%` }} /></span></span>
            <span className={styles.classStatus} data-status={status} aria-label={full}>{short}</span>
          </button>
        </Fragment>;
      })}
    </nav></NajmScroll>
  </section>;
}
