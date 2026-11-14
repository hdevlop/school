'use client';
import { Fragment } from 'react';
import { FileSpreadsheet, FileText, Files, FolderArchive, GraduationCap, Layers, Printer, School, Send, UserRound, Users, type LucideIcon } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, NButton } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import type { MassarSheetRow } from '@sms/contracts';
import type { SelectedStudent } from './MassarPaper';
import styles from './Massar.module.css';

// ─── Export ─────────────────────────────────────────────────────────────────

type ExportProps = {
  /** The open subject's sheet, and every subject of its class. */
  sheet: MassarSheetRow | undefined;
  subjects: MassarSheetRow[];
  className: string;
  /** The Contrôle's sheets that can go to Massar (their subject is confirmed). */
  sendableCount: number;
  /** Sending the whole Contrôle is not offered (loading, failed, closed or nothing to send). */
  sendDisabled: boolean;
  busy: boolean;
  exporting: boolean;
  onExport: (chosen: MassarSheetRow[]) => void;
  onSend: () => void;
};

/**
 * One export: the open file or the class to check (nothing is locked), or the whole Contrôle to send
 * to Massar (a zip; downloading it locks what was sent). A subject still to confirm is exported too,
 * with last year's spelling.
 */
export function MassarExportMenu({ sheet, subjects, className, sendableCount, sendDisabled, busy, exporting, onExport, onSend }: ExportProps) {
  const { t } = useTranslation();
  const unconfirmed = subjects.filter(subject => subject.subjectConfirmed === false).length;

  return <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <NButton variant="outline" size="icon" aria-label={t('massar.flow.exportFiles')} title={t('massar.flow.exportFiles')} disabled={busy || exporting} loading={exporting}>
        {!exporting && <FileSpreadsheet className="size-4" aria-hidden="true" />}
      </NButton>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-80">
      {sheet && <>
        <DropdownMenuItem className={styles.controlOption} onSelect={() => onExport([sheet])}>
          <span className={styles.controlCheck}><FileSpreadsheet aria-hidden /></span>
          <span><strong>{t('massar.flow.exportOpen')}</strong><small><bdi>{sheet.subjectName}</bdi> · .xlsx{sheet.subjectConfirmed === false && <> · {t('massar.flow.toConfirm')}</>}</small></span>
        </DropdownMenuItem>
        <DropdownMenuItem className={styles.controlOption} onSelect={() => onExport(subjects)}>
          <span className={styles.controlCheck}><FolderArchive aria-hidden /></span>
          <span>
            <strong>{t('massar.flow.exportAll', { name: className })}</strong>
            <small>{unconfirmed
              ? t('massar.flow.exportAllHelp', { count: subjects.length, unconfirmed })
              : t('massar.flow.exportAllReady', { count: subjects.length })}</small>
          </span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
      </>}
      <DropdownMenuItem className={styles.controlOption} disabled={sendDisabled} onSelect={onSend}>
        <span className={styles.controlCheck}><Send aria-hidden /></span>
        <span><strong>{t('massar.flow.exportControl')}</strong><small>{t('massar.flow.exportControlHelp', { count: sendableCount })}</small></span>
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>;
}

// ─── Print ──────────────────────────────────────────────────────────────────

type Choice = { key: string; icon: LucideIcon; label: string; detail?: string; chosen: MassarSheetRow[]; studentIds?: string[] };

type PrintProps = {
  /** The open sheet, its class's sheets, its level's sheets (1APG-1, 1APG-2…), and every sheet of the Contrôle. */
  sheet: MassarSheetRow | undefined;
  subjects: MassarSheetRow[];
  levelSheets: MassarSheetRow[];
  sheets: MassarSheetRow[];
  className: string;
  level: string;
  /** The students picked on the sheet: the first statement choice prints theirs. */
  picked: SelectedStudent[];
  /**
   * Statements are only for those who see every subject of a class: a teacher's sheets are their
   * own subjects, and a statement missing the others would look complete.
   */
  showStatements: boolean;
  disabled: boolean;
  pending: boolean;
  onPrint: (chosen: MassarSheetRow[]) => void;
  onPrintStatements: (chosen: MassarSheetRow[], studentIds?: string[]) => void;
};

/**
 * Two titled columns, side by side: the Massar papers (one per subject), then each student's
 * statement, بيان نقط المراقبة (one per student, every subject of the class on one page).
 */
export function MassarPrintMenu({ sheet, subjects, levelSheets, sheets, className, level, picked, showStatements, disabled, pending, onPrint, onPrintStatements }: PrintProps) {
  const { t } = useTranslation();

  const paperChoices: Choice[] = [
    { key: 'open', icon: FileText, label: t('massar.flow.printOpen'), detail: sheet?.subjectName, chosen: sheet ? [sheet] : [] },
    { key: 'class', icon: Files, label: t('massar.flow.printClass', { name: className }), chosen: subjects },
    { key: 'level', icon: Layers, label: t('massar.flow.printLevel', { level }), chosen: levelSheets },
    { key: 'all', icon: School, label: t('massar.flow.printAll'), chosen: sheets },
  ];

  const pickedLabel = !picked.length ? t('massar.flow.statements.pickStudent')
    : picked.length === 1 ? t('massar.flow.statements.student', { name: picked[0].name })
      : t('massar.flow.statements.students', { count: picked.length });
  const statementChoices: Choice[] = showStatements ? [
    // One student's page is still ranked among the whole class, so every subject of the class is read.
    { key: 'student', icon: UserRound, label: pickedLabel, chosen: picked.length ? subjects : [], studentIds: picked.map(item => item.id) },
    { key: 'class', icon: Users, label: t('massar.flow.statements.class', { name: className }), chosen: subjects },
    { key: 'level', icon: Layers, label: t('massar.flow.statements.level', { level }), chosen: levelSheets },
    { key: 'all', icon: GraduationCap, label: t('massar.flow.statements.all'), chosen: sheets },
  ] : [];

  const statementHelp = ({ key, chosen, studentIds }: Choice) => {
    if (key === 'student' && !chosen.length) return t('massar.flow.statements.pickHelp');
    const count = new Set(chosen.map(item => item.subjectName)).size;
    return t(studentIds?.length === 1 ? 'massar.flow.statements.studentHelp' : 'massar.flow.statements.help', { count });
  };

  return <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <NButton data-keep-selection variant="outline" size="icon" aria-label={t('insurance.print')} title={t('insurance.print')} disabled={disabled || pending} loading={pending}>
        {!pending && <Printer className="size-4" aria-hidden="true" />}
      </NButton>
    </DropdownMenuTrigger>
    <DropdownMenuContent data-keep-selection align="end" className="w-auto max-w-[calc(100vw-24px)] p-0">
      <div className={styles.printMenu} data-columns={statementChoices.length > 0 ? 2 : 1}>
        <DropdownMenuGroup className={styles.printColumn}>
          <DropdownMenuLabel className={styles.printTitle}><Files aria-hidden />{t('massar.flow.printTitle')}</DropdownMenuLabel>
          {paperChoices.map(({ key, icon: Icon, label, detail, chosen }, index) => <Fragment key={key}>
            {index === 2 && <DropdownMenuSeparator />}
            <DropdownMenuItem className={styles.printItem} disabled={!chosen.length} onSelect={() => onPrint(chosen)}>
              <Icon aria-hidden />
              <span><strong><bdi>{label}</bdi></strong>{detail && <small><bdi>{detail}</bdi></small>}</span>
              <span className={styles.printCount} dir="ltr" title={t('massar.flow.printSheets', { count: chosen.length })}>{chosen.length}</span>
            </DropdownMenuItem>
          </Fragment>)}
        </DropdownMenuGroup>
        {statementChoices.length > 0 && <>
          <div className={styles.printDivider} role="separator" aria-orientation="vertical" />
          <DropdownMenuGroup className={styles.printColumn}>
            <DropdownMenuLabel className={styles.printTitle}><UserRound aria-hidden />{t('massar.flow.statements.title')}</DropdownMenuLabel>
            {statementChoices.map((choice, index) => {
              const { key, icon: Icon, label, chosen, studentIds } = choice;
              return <Fragment key={key}>
                {index === 1 && <DropdownMenuSeparator />}
                <DropdownMenuItem className={styles.printItem} disabled={!chosen.length} onSelect={() => onPrintStatements(chosen, studentIds)}>
                  <Icon aria-hidden />
                  <span><strong><bdi>{label}</bdi></strong><small>{statementHelp(choice)}</small></span>
                  {key === 'student' && studentIds && studentIds.length > 0 && <span className={styles.printCount} dir="ltr">{studentIds.length}</span>}
                </DropdownMenuItem>
              </Fragment>;
            })}
          </DropdownMenuGroup>
        </>}
      </div>
    </DropdownMenuContent>
  </DropdownMenu>;
}
