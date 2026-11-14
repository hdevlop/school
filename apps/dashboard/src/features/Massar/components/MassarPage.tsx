'use client';
import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { FileUp, LayoutList, Printer, Upload } from 'lucide-react';
import { NButton, NEmptyState, NSheet } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { useNThemeBrandingSlot } from 'najm-theme/react';
import { toast } from 'sonner';
import type { MassarRound, MassarSetup, MassarSheetDetail, MassarSheetRow, MassarStatementSettings } from '@sms/contracts';
import { useViewerRole } from '@/features/Users/hooks/useViewerRole';
import { useViewingYearKey } from '@/features/AcademicYears/hooks/useViewingAcademicYear';
import { printPlanningDocument } from '@/features/Assessments/planning/planningDocument';
import { FEATURE_ICONS } from '@/shared/featureIcons';
import { api } from '@/services/http';
import { downloadMassar, massarPost, massarPut, useMassarAction, useMassarRead } from '../hooks/useMassar';
import { useCollapsibleSide } from '../hooks/useCollapsibleSide';
import { useStudentPicking } from '../hooks/useStudentPicking';
import { classOrder, controlList, nextRound, progressPercent, sheetState, type PlannedRound } from '../config/massarModel';
import { controlLabels } from '../config/controlLabels';
import { buildMassarDocument, type MassarPaperOptions } from '../config/massarDocument';
import { buildStudentStatementDocument } from '../config/studentStatementDocument';
import { MassarHeader, MassarLoadError, MassarLoadingSkeleton } from './MassarShared';
import { MassarOverview } from './MassarOverview';
import { MassarPaper } from './MassarPaper';
import { MassarFilesDialog } from './MassarFilesDialog';
import { MassarWaitingDialog } from './MassarWaitingDialog';
import { MassarWaitingPanel } from './MassarWaitingPanel';
import { MassarDueNotice } from './MassarDueNotice';
import { MassarControlPicker } from './MassarControlPicker';
import { MassarClassList } from './MassarClassList';
import { MassarExportMenu, MassarPrintMenu } from './MassarSheetMenus';
import { DueDateDialog, OpenControlDialog, SendControlDialog } from './MassarRoundDialogs';
import styles from './Massar.module.css';

type Availability = { configured: boolean; hasRounds: boolean; planned?: PlannedRound[]; statement?: MassarStatementSettings | null };
type CreatedRound = MassarRound & { labelsUnseen: boolean };

/** How often the page re-reads what others change: the plan and rounds, and the sheets' progress. */
const ROUNDS_POLL_MS = 15000;
const SHEETS_POLL_MS = 10000;
/** Sheets read together when printing: a whole Contrôle is well over a hundred. */
const PRINT_BATCH = 6;

/** A Massar class's level: 1APG-2 → 1APG. */
const levelOf = (name: string) => name.replace(/-\d+$/, '');

function MassarContent() {
  const router = useRouter();
  const { t, language } = useTranslation();
  const viewer = useViewerRole();
  const action = useMassarAction();
  const logo = useNThemeBrandingSlot('authLogo');
  const labels = controlLabels(t);
  const { label } = labels;

  const manager = viewer.isSchoolWide && viewer.can('manage:massar');
  const canOverview = manager || viewer.role === 'supervisor';

  // ── Server state ──────────────────────────────────────────────────────────
  const availability = useMassarRead<Availability>('/availability', true, ROUNDS_POLL_MS);
  const setupQuery = useMassarRead<MassarSetup>('/setup', manager);
  const roundsQuery = useMassarRead<MassarRound[]>('/rounds', true, ROUNDS_POLL_MS);

  // ── What is picked and open ───────────────────────────────────────────────
  const [pickedRound, setRound] = useState('');
  const [pickedClass, setClass] = useState<string | null>(null);
  const [pickedSheet, setSheet] = useState('');
  const [filesOpen, setFilesOpen] = useState(false);
  const [overviewOpen, setOverviewOpen] = useState(false);
  const [waitingClass, setWaitingClass] = useState('');
  const [opening, setOpening] = useState(false);
  const [proposed, setProposed] = useState({ term: 1, exam: 1, dueDate: '' });
  const [dueEditOpen, setDueEditOpen] = useState(false);
  const [dateDraft, setDateDraft] = useState('');
  const [downloadOpen, setDownloadOpen] = useState(false);
  // `busy`: the open sheet is saving. The other two: an export or a print is being prepared.
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [printPending, setPrintPending] = useState(false);

  // ── Derived: the round, its classes and the open sheet ────────────────────
  const rounds = [...(roundsQuery.data ?? [])].sort((a, b) => a.term - b.term || a.exam - b.exam);
  const round = rounds.find(item => item.id === pickedRound) ?? rounds.at(-1);
  const sheetsQuery = useMassarRead<MassarSheetRow[]>(`/sheets?roundId=${encodeURIComponent(round?.id ?? '')}`, !!round, SHEETS_POLL_MS);
  const sheets = sheetsQuery.data ?? [];
  const setup = setupQuery.data;

  // Classes still waiting for students have no sheets yet; only managers see them here.
  const blocked = manager
    ? setup?.classes.filter(cls => cls.unmatchedCodes.length).map(cls => ({ className: cls.name, unmatchedCount: cls.unmatchedCodes.length })) ?? []
    : [];
  const classes = [...new Set([...sheets.map(sheet => sheet.className), ...blocked.map(cls => cls.className)])].sort(classOrder);
  // The first class opens by default; the overview of every class is a sheet.
  const className = pickedClass && classes.includes(pickedClass) ? pickedClass : classes[0] ?? '';
  const subjects = sheets.filter(sheet => sheet.className === className);
  const sheet = subjects.find(item => item.id === pickedSheet) ?? subjects[0];
  const level = levelOf(className);
  const levelSheets = sheets.filter(item => levelOf(item.className) === level);
  const blockedHere = blocked.find(cls => cls.className === className);
  // A grid whose subject comes from last year's files waits for this year's Massar file before it is sent.
  const sendable = sheets.filter(item => item.subjectConfirmed !== false);
  const changedCount = sheets.filter(item => item.status === 'changed_after_export').length;

  const side = useCollapsibleSide();
  const { pickedHere, pickStudent } = useStudentPicking(className);

  // ── Loading state ─────────────────────────────────────────────────────────
  const error = availability.error || roundsQuery.error || manager && setupQuery.error || round && sheetsQuery.error;
  const loading = availability.isLoading || roundsQuery.isLoading || manager && setupQuery.isLoading || round && sheetsQuery.isLoading;
  const configured = availability.data?.configured;
  const ready = !error && !loading && !!configured;
  // Overview and Print belong to the sheets, so they show once a Contrôle has some.
  const showSheets = ready && !!availability.data?.hasRounds && (sheets.length > 0 || blocked.length > 0);
  const retry = () => Promise.all([
    availability.refetch(),
    roundsQuery.refetch(),
    ...(manager ? [setupQuery.refetch()] : []),
    ...(round ? [sheetsQuery.refetch()] : []),
  ]);

  // ── The year's plan ───────────────────────────────────────────────────────
  // Every Contrôle with its date; the later ones are shown but not yet available.
  const planned = availability.data?.planned ?? [];
  const upcoming = nextRound(rounds, planned);
  const controls = controlList(rounds, planned);
  // Integrated activities (outside the plan) stay reachable once the planned Contrôles are all open.
  const canOpenActivities = manager && !controls.some(item => item.state === 'next') && upcoming.term <= 2;

  // ── Actions ───────────────────────────────────────────────────────────────
  const pickRound = (id: string) => { setRound(id); setClass(null); setSheet(''); };
  const pickSheet = (row: MassarSheetRow) => { setClass(row.className); setSheet(row.id); setOverviewOpen(false); };

  const openNext = () => {
    const dueDate = planned.find(item => item.term === upcoming.term && item.exam === upcoming.exam)?.dueDate ?? '';
    setProposed({ ...upcoming, dueDate });
    setOpening(true);
  };
  const openRound = async () => {
    await action.run(async () => {
      const created: CreatedRound = await massarPost('/rounds', { ...proposed, dueDate: proposed.dueDate || null });
      pickRound(created.id);
      if (created.labelsUnseen) toast.info(t('massar.flow.labelsUnseen'));
    });
    setOpening(false);
  };
  const editDueDate = () => { setDateDraft(round?.dueDate ?? ''); setDueEditOpen(true); };
  const saveDueDate = async () => {
    if (!round) return;
    await action.run(() => massarPut(`/rounds/${round.id}/due-date`, { dueDate: dateDraft || null }));
    setDueEditOpen(false);
  };

  // Massar files of the open subject, or of every subject of the class (a zip), to check them or try an import; nothing is marked as sent.
  const exportFiles = async (chosen: MassarSheetRow[]) => {
    setExporting(true);
    try {
      await action.run(() => downloadMassar('/export/class', { sheetIds: chosen.map(item => item.id) }, `export_notesCC_${className}.zip`));
    } finally {
      setExporting(false);
    }
  };
  // Downloading the whole Contrôle locks what it sends; a manager reopens a sheet to change it.
  const sendControl = async () => {
    if (!round) return;
    await action.run(() => downloadMassar(`/rounds/${round.id}/download`, {}, 'massar.zip'));
    setDownloadOpen(false);
  };

  // The same sheets print as Massar papers (one per subject) or as each student's statement (one per student).
  const paperOptions: MassarPaperOptions = {
    language, logo,
    title: t('massar.flow.paperTitle'), student: t('massar.student'), teacher: t('massar.teacher'), term: t('massar.term'), exam: t('massar.exam'),
  };
  const print = async (chosen: MassarSheetRow[], build: (details: MassarSheetDetail[]) => string = details => buildMassarDocument(details, paperOptions)) => {
    if (!chosen.length) return;
    setPrintPending(true);
    try {
      await action.run(async () => {
        const details: MassarSheetDetail[] = [];
        for (let start = 0; start < chosen.length; start += PRINT_BATCH) {
          const batch = chosen.slice(start, start + PRINT_BATCH);
          details.push(...await Promise.all(batch.map(async item => (await api.get(`/massar/sheets/${encodeURIComponent(item.id)}`)).data.data as MassarSheetDetail)));
        }
        if (!await printPlanningDocument(build(details))) toast.error(t('insurance.popupBlocked'));
      });
    } finally {
      setPrintPending(false);
    }
  };
  const printStatements = (chosen: MassarSheetRow[], studentIds?: string[]) => print(chosen, details => buildStudentStatementDocument(details, {
    language, logo, title: t('massar.flow.statements.title'), settings: availability.data?.statement, studentIds,
  }));

  // ── Pieces ────────────────────────────────────────────────────────────────
  const empty = (title: string, description?: string, button?: ReactNode) => <div className={styles.emptyWrap}>
    <NEmptyState surface="panel" icon={FEATURE_ICONS.massar} title={t(title)} description={description ? t(description) : undefined} action={button} />
  </div>;

  const controlPicker = controls.length > 0 ? <MassarControlPicker controls={controls} round={round} labels={labels} manager={manager}
    busy={busy} pending={action.pending} activities={canOpenActivities ? upcoming : null}
    onPick={pickRound} onOpenNext={openNext} onEditDueDate={editDueDate} /> : null;

  const subtitle = error || loading ? undefined
    : !configured ? t('massar.flow.notSetUp')
      : manager && setup ? t('massar.flow.loaded', { count: setup.classes.length, subjects: t('massar.flow.subjectCount', { count: new Set(setup.subjects.map(subject => subject.code)).size }) })
        : undefined;

  // Icon buttons, one group of the same size; each names itself on hover and to screen readers.
  const headerActions = <div className={styles.actions}>
    <div className={styles.toolbarButtons}>
      {manager && configured && <NButton variant="outline" size="icon" aria-label={t('massar.flow.addFiles')} title={t('massar.flow.addFiles')}
        disabled={busy || action.pending} onClick={() => setFilesOpen(true)}><FileUp className="size-4" aria-hidden="true" /></NButton>}
    </div>
    {showSheets && <div className={styles.toolbarButtons}>
      {canOverview && <NButton variant="outline" size="icon" aria-label={t('massar.flow.overview')} title={t('massar.flow.overview')} disabled={busy}
        onClick={() => { setOverviewOpen(true); void sheetsQuery.refetch(); }}><LayoutList className="size-4" aria-hidden="true" /></NButton>}
      {manager && round && <MassarExportMenu sheet={sheet} subjects={subjects} className={className} sendableCount={sendable.length}
        sendDisabled={action.pending || !sendable.length || !!error || round.status === 'closed'} busy={busy} exporting={exporting}
        onExport={chosen => void exportFiles(chosen)} onSend={() => setDownloadOpen(true)} />}
      <MassarPrintMenu sheet={sheet} subjects={subjects} levelSheets={levelSheets} sheets={sheets} className={className} level={level}
        picked={pickedHere} showStatements={canOverview} disabled={busy || !sheets.length} pending={printPending}
        onPrint={chosen => void print(chosen)} onPrintStatements={(chosen, studentIds) => void printStatements(chosen, studentIds)} />
    </div>}
  </div>;

  // Nothing opened yet: classes waiting for students, then the way to the first Contrôle.
  const noRounds = <>
    {blocked.map(cls => <p key={cls.className} className={styles.notice}>
      {cls.className} · {t('massar.flow.waiting', { count: cls.unmatchedCount })}
      <button className={styles.textButton} type="button" onClick={() => setWaitingClass(cls.className)}>{t('massar.flow.fix')}</button>
    </p>)}
    {!planned.length
      ? empty('massar.flow.noControl', 'massar.flow.planFirst', manager ? <NButton onClick={() => router.push('/exam-planning')}>{t('massar.flow.openPlanning')}</NButton> : undefined)
      : empty('massar.flow.noControl', manager ? 'massar.flow.openFirstHelp' : 'massar.flow.waitControl', manager ? <NButton onClick={openNext}>{t('massar.flow.openNamed', { name: label(upcoming) })}</NButton> : undefined)}
  </>;

  // One card, like the classes beside it: the class's subjects as tabs (right to left, as the sheet reads), then the sheet.
  const sheetCard = sheet && <div className={styles.sheetCard}>
    <div data-keep-selection className={styles.subjectTabs} dir="rtl" role="group" aria-label={t('massar.subject')}>
      {subjects.map(subject => {
        const status = sheetState(subject);
        const filled = subject.total - subject.missing;
        const full = t(`massar.flow.status.${status}`, { count: filled, total: subject.total });
        const unconfirmed = subject.subjectConfirmed === false;
        return <button type="button" className={styles.subjectTab} key={subject.id} aria-pressed={sheet.id === subject.id} disabled={busy}
          title={unconfirmed ? `${full} · ${t('massar.flow.toConfirmHelp')}` : full} onClick={() => setSheet(subject.id)}>
          {unconfirmed && <span className={styles.toConfirmDot} aria-label={t('massar.flow.toConfirm')} />}
          <span dir="auto">{subject.subjectName}</span>
          <span className={styles.tabStatus} data-status={status} dir="ltr">{status === 'exported' ? '🔒' : status === 'done' ? '✓' : `${progressPercent(filled, subject.total)}%`}</span>
        </button>;
      })}
    </div>
    <MassarPaper key={`${round?.id}:${sheet.id}`} id={sheet.id} options={paperOptions} onBusy={setBusy}
      selected={pickedHere.map(item => item.id)} onSelect={pickStudent} />
  </div>;

  const sheetLayout = <>
    {manager && changedCount > 0 && <p className={styles.notice} data-tone="warning">{t('massar.flow.changedCount', { count: changedCount })}</p>}
    <div className={styles.sheetLayout} data-side={side.collapsed ? 'collapsed' : 'open'}>
      <aside className={styles.sideColumn} data-collapsed={side.compact}>
        {controlPicker && <section className={`${styles.sideSection} ${styles.sidePicker}`}>{controlPicker}</section>}
        {(classes.length > 1 || canOverview) && <MassarClassList classes={classes} sheets={sheets} blocked={blocked} selected={className}
          compact={side.compact} busy={busy} onSelect={name => { setClass(name); setSheet(''); }} />}
      </aside>
      {/* Like the app's sidebar: a handle on the column's border, always shown. Nothing inside the column moves. */}
      <button type="button" className={styles.sideRail} aria-expanded={!side.collapsed}
        aria-label={t(side.collapsed ? 'massar.flow.expandClasses' : 'massar.flow.collapseClasses')}
        title={t(side.collapsed ? 'massar.flow.expandClasses' : 'massar.flow.collapseClasses')} {...side.railProps} />
      <div className={styles.sheetArea}>
        {blockedHere
          ? <MassarWaitingPanel className={className} count={blockedHere.unmatchedCount} cls={setup?.classes.find(cls => cls.name === className)} fix={manager ? () => setWaitingClass(className) : undefined} />
          : sheetCard}
      </div>
    </div>
  </>;

  const body = error ? <MassarLoadError error={error} retry={retry} />
    : loading ? <MassarLoadingSkeleton label={t('massar.loading')} />
      : !configured ? empty(manager ? 'massar.flow.noFiles' : 'massar.flow.notReady', manager ? 'massar.flow.uploadHelp' : 'massar.flow.waitUpload', manager ? <NButton leftIcon={Upload} onClick={() => setFilesOpen(true)}>{t('massar.flow.upload')}</NButton> : undefined)
        : !availability.data?.hasRounds ? noRounds
          : !sheets.length && !blocked.length ? empty(viewer.role === 'supervisor' ? 'massar.flow.noClasses' : 'massar.flow.noSheets', viewer.role === 'supervisor' ? undefined : 'massar.flow.checkAssignments')
            : sheetLayout;

  const waitingSetupClass = manager ? setup?.classes.find(cls => cls.name === waitingClass) : undefined;
  // The overview is a class column and a column per subject: as wide as those, no wider.
  const overviewWidth = Math.min(1000, 360 + new Set(sheets.map(item => item.subjectName)).size * 200);

  return <div className={styles.page} data-massar-page="main">
    <MassarHeader title={t('massar.title')} subtitle={subtitle} actions={headerActions} />
    <main className={styles.scroll}><div className={styles.main}>
      {ready && controls.length > 0 && !showSheets && <div className={styles.topBar}>{controlPicker}</div>}
      {!error && round && <MassarDueNotice dueDate={round.dueDate} />}
      {body}
    </div></main>

    {canOverview && <NSheet open={overviewOpen} onOpenChange={setOverviewOpen} icon={LayoutList} title={t('massar.flow.overview')} description={round ? label(round) : undefined} width={overviewWidth}
      footer={<div className="flex justify-end"><NButton variant="outline" leftIcon={Printer} disabled={busy || printPending || !sheets.length} loading={printPending} onClick={() => print(sheets)}>{t('massar.flow.printAll')}</NButton></div>}>
      <MassarOverview sheets={sheets} blocked={blocked} select={pickSheet} disabled={busy} fix={manager ? name => { setOverviewOpen(false); setWaitingClass(name); } : undefined} />
    </NSheet>}
    {filesOpen && manager && setup && <MassarFilesDialog setup={setup} close={() => setFilesOpen(false)} />}
    {waitingSetupClass && <MassarWaitingDialog cls={waitingSetupClass} close={() => setWaitingClass('')} addFiles={() => { setWaitingClass(''); setFilesOpen(true); }} />}

    <OpenControlDialog open={opening} onOpenChange={setOpening} pending={action.pending} title={t('massar.flow.openNamed', { name: label(proposed) })}
      readyCount={(setup?.classes.length ?? 0) - blocked.length} waiting={blocked.length > 0}
      dueDate={proposed.dueDate} onDueDate={dueDate => setProposed({ ...proposed, dueDate })}
      exists={rounds.some(item => item.term === proposed.term && item.exam === proposed.exam)} onConfirm={openRound} />
    <DueDateDialog open={dueEditOpen} onOpenChange={setDueEditOpen} pending={action.pending} dueDate={dateDraft} onDueDate={setDateDraft} onConfirm={saveDueDate} />
    <SendControlDialog open={downloadOpen} onOpenChange={setDownloadOpen} pending={action.pending} sheets={sheets} sendable={sendable} onConfirm={sendControl} />
  </div>;
}

/** The Massar page, started afresh whenever the viewed academic year changes. */
export function MassarPage() {
  const key = useViewingYearKey();
  return <MassarContent key={key} />;
}
