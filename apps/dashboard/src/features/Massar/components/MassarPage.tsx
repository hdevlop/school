'use client';
import { Fragment, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarClock, Check, ChevronDown, FileSpreadsheet, FileText, FileUp, Files, FolderArchive, GraduationCap, Layers, LayoutList, Plus, Printer, School, Send, Upload, UserRound, Users } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, NajmScroll, NButton, NDialog, NEmptyState, NSheet } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { useNThemeBrandingSlot } from 'najm-theme/react';
import { toast } from 'sonner';
import type { MassarRound, MassarSetup, MassarSheetDetail, MassarSheetRow, MassarStatementSettings } from '@sms/contracts';
import { useViewerRole } from '@/features/Users/hooks/useViewerRole';
import { useViewingYearKey } from '@/features/AcademicYears/hooks/useViewingAcademicYear';
import { CLASS_DOCUMENT_COLORS } from '@/features/Assessments/planning/planningModel';
import { printPlanningDocument } from '@/features/Assessments/planning/planningDocument';
import { FEATURE_ICONS } from '@/shared/featureIcons';
import { api } from '@/services/http';
import { downloadMassar, massarPost, massarPut, useMassarAction, useMassarRead } from '../hooks/useMassar';
import { classCycle, classOrder, classState, controlList, nextRound, progressPercent, sheetState, type PlannedRound } from '../config/massarModel';
import { buildMassarDocument, type MassarPaperOptions } from '../config/massarDocument';
import { buildStudentStatementDocument } from '../config/studentStatementDocument';
import { MassarHeader, MassarLoadError, MassarLoadingSkeleton } from './MassarShared';
import { MassarOverview } from './MassarOverview';
import { MassarPaper, type SelectedStudent } from './MassarPaper';
import { MassarFilesDialog } from './MassarFilesDialog';
import { MassarWaitingDialog } from './MassarWaitingDialog';
import { MassarWaitingPanel } from './MassarWaitingPanel';
import { MassarDueNotice } from './MassarDueNotice';
import styles from './Massar.module.css';

function MassarContent() {
  const router = useRouter();
  const { t, language } = useTranslation(), viewer = useViewerRole(), action = useMassarAction(), logo = useNThemeBrandingSlot('authLogo');
  const manager = viewer.isSchoolWide && viewer.can('manage:massar'), canOverview = manager || viewer.role === 'supervisor';
  const availability = useMassarRead<{ configured: boolean; hasRounds: boolean; planned?: PlannedRound[]; statement?: MassarStatementSettings | null }>('/availability', true, 15000);
  const setupQuery = useMassarRead<MassarSetup>('/setup', manager), roundsQuery = useMassarRead<MassarRound[]>('/rounds', true, 15000);
  const [pickedRound, setRound] = useState(''), [pickedClass, setClass] = useState<string | null>(null), [pickedSheet, setSheet] = useState('');
  const [filesOpen, setFilesOpen] = useState(false), [opening, setOpening] = useState(false), [downloadOpen, setDownloadOpen] = useState(false);
  const [busy, setBusy] = useState(false), [printPending, setPrintPending] = useState(false), [proposed, setProposed] = useState({ term: 1, exam: 1, dueDate: '' });
  const [dueEditOpen, setDueEditOpen] = useState(false), [dateDraft, setDateDraft] = useState('');
  const [waitingClass, setWaitingClass] = useState(''), [overviewOpen, setOverviewOpen] = useState(false);
  // The students picked on the sheet, kept with their class: another class has no such students.
  const [picked, setPicked] = useState<{ className: string; students: SelectedStudent[] } | null>(null);
  const rounds = [...(roundsQuery.data ?? [])].sort((a, b) => a.term - b.term || a.exam - b.exam);
  const round = rounds.find(round => round.id === pickedRound) ?? rounds.at(-1);
  const sheetsQuery = useMassarRead<MassarSheetRow[]>(`/sheets?roundId=${encodeURIComponent(round?.id ?? '')}`, !!round, 10000);
  const sheets = sheetsQuery.data ?? [], setup = setupQuery.data;
  const blocked = manager ? setup?.classes.filter(cls => cls.unmatchedCodes.length).map(cls => ({ className: cls.name, unmatchedCount: cls.unmatchedCodes.length })) ?? [] : [];
  const classes = [...new Set([...sheets.map(sheet => sheet.className), ...blocked.map(cls => cls.className)])].sort(classOrder);
  const cycles = new Set(classes.map(classCycle)).size;
  // The first class opens by default; the overview of every class is a sheet.
  const className = pickedClass && classes.includes(pickedClass) ? pickedClass : classes[0] ?? '';
  const subjects = sheets.filter(sheet => sheet.className === className);
  const sheet = subjects.find(sheet => sheet.id === pickedSheet) ?? subjects[0];
  // A wide grid can take the classes column's room; the choice is kept for the next visit.
  // Two steps so nothing jumps: the width (sideCollapsed) and the compact contents (sideCompact).
  // Collapsing shows the compact contents first, then narrows; opening widens first and shows the
  // full contents only once there is room, so the long label never wraps mid-animation.
  const [sideCollapsed, setSideCollapsed] = useState(false);
  const [sideCompact, setSideCompact] = useState(false);
  const sideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    try { const stored = localStorage.getItem('massar-side-collapsed') === '1'; setSideCollapsed(stored); setSideCompact(stored); } catch { /* Storage can be unavailable in private browsing. */ }
    return () => clearTimeout(sideTimer.current);
  }, []);
  const railDrag = useRef<{ x: number; dragged: boolean } | null>(null);
  const setSide = (collapsed: boolean) => {
    clearTimeout(sideTimer.current);
    setSideCollapsed(collapsed);
    // Matches the width transition in Massar.module.css (.2s).
    if (collapsed) setSideCompact(true); else sideTimer.current = setTimeout(() => setSideCompact(false), 200);
    try { localStorage.setItem('massar-side-collapsed', collapsed ? '1' : '0'); } catch { /* The column still toggles for this visit. */ }
  };
  const options: MassarPaperOptions = { language, logo, title: t('massar.flow.paperTitle'), student: t('massar.student'), teacher: t('massar.teacher'), term: t('massar.term'), exam: t('massar.exam') };
  const error = availability.error || roundsQuery.error || manager && setupQuery.error || round && sheetsQuery.error;
  const loading = availability.isLoading || roundsQuery.isLoading || manager && setupQuery.isLoading || round && sheetsQuery.isLoading;
  const configured = availability.data?.configured;
  // Overview and Print belong to the sheets, so they show once a Contrôle has some.
  const showSheets = !error && !loading && !!configured && !!availability.data?.hasRounds && (sheets.length > 0 || blocked.length > 0);
  const label = (value: { term: number; exam: number }) => value.exam === 4 ? `${t('massar.flow.activities')} — ${t('massar.flow.semester', { term: value.term })}` : t('massar.flow.control', { term: value.term, exam: value.exam });
  // The year's plan: every Contrôle with its date; the later ones are shown but not yet available.
  const planned = availability.data?.planned ?? [], upcoming = nextRound(rounds, planned);
  const controls = controlList(rounds, planned), shortDate = (date: string) => date.split('-').reverse().join('/');
  // A Contrôle's line under its name: the due date for marks, else when Planning holds its exams.
  const dayMonth = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}`;
  const when = (item: { dueDate?: string | null; examFrom?: string | null; examTo?: string | null }) => item.dueDate ? shortDate(item.dueDate)
    : item.examFrom && item.examTo ? item.examFrom === item.examTo ? t('massar.flow.examDay', { date: dayMonth(item.examFrom) }) : t('massar.flow.examDates', { from: dayMonth(item.examFrom), to: dayMonth(item.examTo) })
    : t('massar.flow.plan.noDate');
  const shortLabel = (value: { term: number; exam: number }) => value.exam === 4 ? t('massar.flow.activitiesShort', { term: value.term }) : t('massar.flow.controlShort', { term: value.term, exam: value.exam });
  const shortWhen = (item: { dueDate?: string | null; examFrom?: string | null; examTo?: string | null }) => item.dueDate ? shortDate(item.dueDate)
    : item.examFrom && item.examTo ? item.examFrom === item.examTo ? dayMonth(item.examFrom) : `${dayMonth(item.examFrom)} – ${dayMonth(item.examTo)}`
    : t('massar.flow.plan.noDate');
  // Integrated activities (outside the plan) stay reachable once the planned Contrôles are all open.
  const canOpenActivities = manager && !controls.some(item => item.state === 'next') && upcoming.term <= 2;
  const openNext = () => { setProposed({ ...upcoming, dueDate: planned.find(item => item.term === upcoming.term && item.exam === upcoming.exam)?.dueDate ?? '' }); setOpening(true); };
  const open = async () => {
    await action.run(async () => { const created: MassarRound & { labelsUnseen: boolean } = await massarPost('/rounds', { ...proposed, dueDate: proposed.dueDate || null }); setRound(created.id); setClass(null); setSheet(''); if (created.labelsUnseen) toast.info(t('massar.flow.labelsUnseen')); });
    setOpening(false);
  };
  // The overview is a class column and a column per subject: as wide as those, no wider.
  const overviewWidth = Math.min(1000, 360 + new Set(sheets.map(sheet => sheet.subjectName)).size * 200);
  const select = (sheet: MassarSheetRow) => { setClass(sheet.className); setSheet(sheet.id); setOverviewOpen(false); };
  const saveDueDate = async () => { if (!round) return; await action.run(() => massarPut(`/rounds/${round.id}/due-date`, { dueDate: dateDraft || null })); setDueEditOpen(false); };
  // A grid whose subject comes from last year's files waits for this year's Massar file before it is sent.
  const sendable = sheets.filter(sheet => sheet.subjectConfirmed !== false);
  // Massar files of the open subject, or of every subject of the class (a zip), to check them or try an import; nothing is marked as sent.
  // A subject still to confirm is exported too, with last year's spelling.
  const unconfirmed = subjects.filter(subject => subject.subjectConfirmed === false).length, [exporting, setExporting] = useState(false);
  const exportFiles = async (chosen: MassarSheetRow[]) => {
    setExporting(true);
    try { await action.run(() => downloadMassar('/export/class', { sheetIds: chosen.map(subject => subject.id) }, `export_notesCC_${className}.zip`)); } finally { setExporting(false); }
  };
  const download = async () => {
    if (!round) return;
    // Downloading the whole Contrôle locks what it sends; a manager reopens a sheet to change it.
    await action.run(() => downloadMassar(`/rounds/${round.id}/download`, {}, 'massar.zip'));
    setDownloadOpen(false);
  };
  // Print one sheet, the class, every class of its level (1APG-1, 1APG-2…), or every class.
  const levelOf = (name: string) => name.replace(/-\d+$/, ''), level = levelOf(className);
  const levelSheets = sheets.filter(item => levelOf(item.className) === level);
  const printChoices = [
    { key: 'open', icon: FileText, label: t('massar.flow.printOpen'), detail: sheet?.subjectName, chosen: sheet ? [sheet] : [] },
    { key: 'class', icon: Files, label: t('massar.flow.printClass', { name: className }), chosen: subjects },
    { key: 'level', icon: Layers, label: t('massar.flow.printLevel', { level }), chosen: levelSheets },
    { key: 'all', icon: School, label: t('massar.flow.printAll'), chosen: sheets },
  ];
  // The same sheets print as Massar papers (one per subject) or as each student's statement (one per student).
  const print = async (chosen: MassarSheetRow[], build: (details: MassarSheetDetail[]) => string = details => buildMassarDocument(details, options)) => {
    if (!chosen.length) return;
    setPrintPending(true);
    try { await action.run(async () => {
      // A few at a time: a whole Contrôle is well over a hundred sheets.
      const details: MassarSheetDetail[] = [];
      for (let start = 0; start < chosen.length; start += 6) details.push(...await Promise.all(chosen.slice(start, start + 6).map(async sheet => (await api.get(`/massar/sheets/${encodeURIComponent(sheet.id)}`)).data.data as MassarSheetDetail)));
      if (!await printPlanningDocument(build(details))) toast.error(t('insurance.popupBlocked'));
    }); } finally { setPrintPending(false); }
  };
  // بيان نقط المراقبة: every subject of a student's class on one page. Only for those who see every
  // subject of a class: a teacher's sheets are their own subjects, and a statement missing the others
  // would look complete.
  const pickedHere = picked?.className === className ? picked.students : [];
  // A click outside the sheet, or Escape, lets the students go. Print and the subject tabs keep them:
  // they are how the picked students' statements are reached. Escape closing a menu closes only the menu.
  const hasPicked = pickedHere.length > 0;
  useEffect(() => {
    if (!hasPicked) return;
    const outside = (event: PointerEvent) => { if (!(event.target as Element | null)?.closest?.('table[data-pick], [data-keep-selection]')) setPicked(null); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && !document.querySelector('[role="menu"], [role="dialog"]')) setPicked(null); };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [hasPicked]);
  // A click picks one student; Ctrl/⌘ + click adds one, or takes it off again.
  const pickStudent = (student: SelectedStudent, toggle: boolean) => setPicked({
    className,
    students: !toggle ? [student] : pickedHere.some(item => item.id === student.id) ? pickedHere.filter(item => item.id !== student.id) : [...pickedHere, student],
  });
  const statementChoices = canOverview ? [
    { key: 'student', icon: UserRound, label: !pickedHere.length ? t('massar.flow.statements.pickStudent') : pickedHere.length === 1 ? t('massar.flow.statements.student', { name: pickedHere[0].name }) : t('massar.flow.statements.students', { count: pickedHere.length }),
      chosen: pickedHere.length ? subjects : [], studentIds: pickedHere.map(item => item.id) },
    { key: 'class', icon: Users, label: t('massar.flow.statements.class', { name: className }), chosen: subjects },
    { key: 'level', icon: Layers, label: t('massar.flow.statements.level', { level }), chosen: levelSheets },
    { key: 'all', icon: GraduationCap, label: t('massar.flow.statements.all'), chosen: sheets },
  ] : [];
  // One student's page is still ranked among the whole class, so every subject of the class is read.
  const printStatements = (chosen: MassarSheetRow[], studentIds?: string[]) => print(chosen, details => buildStudentStatementDocument(details, { language, logo, title: t('massar.flow.statements.title'), settings: availability.data?.statement, studentIds }));
  const empty = (title: string, description?: string, button?: React.ReactNode) => <div className={styles.emptyWrap}><NEmptyState surface="panel" icon={FEATURE_ICONS.massar} title={t(title)} description={description ? t(description) : undefined} action={button} /></div>;
  const addFiles = <NButton leftIcon={Upload} onClick={() => setFilesOpen(true)}>{t('massar.flow.upload')}</NButton>;
  const controlPicker = controls.length > 0 ? <div className={styles.controlPicker}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className={styles.controlTrigger} disabled={busy} aria-label={t('massar.flow.chooseControl')}>
                <span className={styles.triggerFull}><strong>{round ? label(round) : t('massar.flow.chooseControl')}</strong><small>{round ? when(controls.find(item => item.round?.id === round.id) ?? round) : t('massar.flow.plan.noDate')}</small></span>
                {/* The narrowed column: a short name (C1-S1) over the bare dates, on the same two lines. */}
                {round && <span className={styles.triggerShort} aria-hidden><strong>{shortLabel(round)}</strong><small>{shortWhen(controls.find(item => item.round?.id === round.id) ?? round)}</small></span>}
                <ChevronDown aria-hidden />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-72">
              {controls.map(item => {
                const key = `${item.term}:${item.exam}`, date = when(item);
                const opens = !item.round && item.state === 'next' && manager, current = !!item.round && item.round.id === round?.id;
                return <DropdownMenuItem key={key} className={styles.controlOption} data-state={item.round ? 'open' : item.state} disabled={item.round ? busy : !opens || busy || action.pending}
                  onSelect={() => { if (item.round) { setRound(item.round.id); setClass(null); setSheet(''); } else if (opens) openNext(); }}>
                  <span className={styles.controlCheck}>{current && <Check aria-hidden />}{opens && <Plus aria-hidden />}</span>
                  <span><strong>{opens ? t('massar.flow.openNamed', { name: label(item) }) : label(item)}</strong><small>{date}</small></span>
                </DropdownMenuItem>;
              })}
              {canOpenActivities && <><DropdownMenuSeparator /><DropdownMenuItem className={styles.controlOption} data-state="next" disabled={busy || action.pending} onSelect={openNext}>
                <span className={styles.controlCheck} /><span><strong>{t('massar.flow.openNext')}</strong><small>{label(upcoming)}</small></span></DropdownMenuItem></>}
            </DropdownMenuContent>
          </DropdownMenu>
          {round && manager && <button type="button" className={styles.controlDate} title={t('massar.flow.changeDueDate')} aria-label={t('massar.flow.changeDueDate')} disabled={busy || action.pending}
            onClick={() => { setDateDraft(round.dueDate ?? ''); setDueEditOpen(true); }}><CalendarClock aria-hidden /></button>}
        </div> : null;
  const sheetTools = <div className={styles.toolbarButtons}>
          {canOverview && <NButton variant="outline" size="icon" aria-label={t('massar.flow.overview')} title={t('massar.flow.overview')} disabled={busy} onClick={() => { setOverviewOpen(true); void sheetsQuery.refetch(); }}><LayoutList className="size-4" aria-hidden="true" /></NButton>}
          {/* One export: the open file or the class to check (nothing is locked), or the whole Contrôle to send to Massar
              (a zip; downloading it locks what was sent). */}
          {manager && round && <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <NButton variant="outline" size="icon" aria-label={t('massar.flow.exportFiles')} title={t('massar.flow.exportFiles')} disabled={busy || exporting} loading={exporting}>{!exporting && <FileSpreadsheet className="size-4" aria-hidden="true" />}</NButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              {sheet && <DropdownMenuItem className={styles.controlOption} onSelect={() => void exportFiles([sheet])}>
                <span className={styles.controlCheck}><FileSpreadsheet aria-hidden /></span>
                <span><strong>{t('massar.flow.exportOpen')}</strong><small><bdi>{sheet.subjectName}</bdi> · .xlsx{sheet.subjectConfirmed === false && <> · {t('massar.flow.toConfirm')}</>}</small></span>
              </DropdownMenuItem>}
              {sheet && <DropdownMenuItem className={styles.controlOption} onSelect={() => void exportFiles(subjects)}>
                <span className={styles.controlCheck}><FolderArchive aria-hidden /></span>
                <span><strong>{t('massar.flow.exportAll', { name: className })}</strong><small>{unconfirmed ? t('massar.flow.exportAllHelp', { count: subjects.length, unconfirmed }) : t('massar.flow.exportAllReady', { count: subjects.length })}</small></span>
              </DropdownMenuItem>}
              {sheet && <DropdownMenuSeparator />}
              <DropdownMenuItem className={styles.controlOption} disabled={action.pending || !sendable.length || !!error || round.status === 'closed'} onSelect={() => setDownloadOpen(true)}>
                <span className={styles.controlCheck}><Send aria-hidden /></span>
                <span><strong>{t('massar.flow.exportControl')}</strong><small>{t('massar.flow.exportControlHelp', { count: sendable.length })}</small></span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <NButton data-keep-selection variant="outline" size="icon" aria-label={t('insurance.print')} title={t('insurance.print')} disabled={busy || printPending || !sheets.length} loading={printPending}>{!printPending && <Printer className="size-4" aria-hidden="true" />}</NButton>
            </DropdownMenuTrigger>
            {/* Two titled columns, side by side: the Massar papers (one per subject), then each student's statement (one per student). */}
            <DropdownMenuContent data-keep-selection align="end" className="w-auto max-w-[calc(100vw-24px)] p-0">
              <div className={styles.printMenu} data-columns={statementChoices.length > 0 ? 2 : 1}>
              <DropdownMenuGroup className={styles.printColumn}>
                <DropdownMenuLabel className={styles.printTitle}><Files aria-hidden />{t('massar.flow.printTitle')}</DropdownMenuLabel>
                {printChoices.map(({ key, icon: Icon, label, detail, chosen }, index) => <Fragment key={key}>
                  {index === 2 && <DropdownMenuSeparator />}
                  <DropdownMenuItem className={styles.printItem} disabled={!chosen.length} onSelect={() => void print(chosen)}>
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
                  {statementChoices.map(({ key, icon: Icon, label, chosen, studentIds }, index) => <Fragment key={key}>
                    {index === 1 && <DropdownMenuSeparator />}
                    <DropdownMenuItem className={styles.printItem} disabled={!chosen.length} onSelect={() => void printStatements(chosen, studentIds)}>
                      <Icon aria-hidden />
                      <span><strong><bdi>{label}</bdi></strong><small>{key === 'student' && !chosen.length ? t('massar.flow.statements.pickHelp') : t(studentIds?.length === 1 ? 'massar.flow.statements.studentHelp' : 'massar.flow.statements.help', { count: new Set(chosen.map(sheet => sheet.subjectName)).size })}</small></span>
                      {key === 'student' && studentIds && studentIds.length > 0 && <span className={styles.printCount} dir="ltr">{studentIds.length}</span>}
                    </DropdownMenuItem>
                  </Fragment>)}
                </DropdownMenuGroup>
              </>}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>;
  return <div className={styles.page} data-massar-page="main">
    <MassarHeader title={t('massar.title')} subtitle={error || loading ? undefined : configured ? manager && setup ? t('massar.flow.loaded', { count: setup.classes.length, subjects: t('massar.flow.subjectCount', { count: new Set(setup.subjects.map(subject => subject.code)).size }) }) : undefined : t('massar.flow.notSetUp')} actions={<div className={styles.actions}>
      {/* Icon buttons, one group of the same size; each names itself on hover and to screen readers. */}
      <div className={styles.toolbarButtons}>
      {manager && configured && <NButton variant="outline" size="icon" aria-label={t('massar.flow.addFiles')} title={t('massar.flow.addFiles')} disabled={busy || action.pending} onClick={() => setFilesOpen(true)}><FileUp className="size-4" aria-hidden="true" /></NButton>}
      </div>
      {showSheets && sheetTools}
    </div>} />
    <main className={styles.scroll}><div className={styles.main}>
      {!error && !loading && configured && controls.length > 0 && !showSheets && <div className={styles.topBar}>{controlPicker}</div>}
      {!error && round && <MassarDueNotice dueDate={round.dueDate} />}
      {error ? <MassarLoadError error={error} retry={() => Promise.all([availability.refetch(), roundsQuery.refetch(), ...(manager ? [setupQuery.refetch()] : []), ...(round ? [sheetsQuery.refetch()] : [])])} /> : loading ? <MassarLoadingSkeleton label={t('massar.loading')} /> : !configured ? empty(manager ? 'massar.flow.noFiles' : 'massar.flow.notReady', manager ? 'massar.flow.uploadHelp' : 'massar.flow.waitUpload', manager ? addFiles : undefined) : !availability.data?.hasRounds ? <>
        {blocked.map(cls => <p key={cls.className} className={styles.notice}>{cls.className} · {t('massar.flow.waiting', { count: cls.unmatchedCount })}<button className={styles.textButton} type="button" onClick={() => setWaitingClass(cls.className)}>{t('massar.flow.fix')}</button></p>)}
        {!planned.length ? empty('massar.flow.noControl', 'massar.flow.planFirst', manager ? <NButton onClick={() => router.push('/exam-planning')}>{t('massar.flow.openPlanning')}</NButton> : undefined)
          : empty('massar.flow.noControl', manager ? 'massar.flow.openFirstHelp' : 'massar.flow.waitControl', manager ? <NButton onClick={openNext}>{t('massar.flow.openNamed', { name: label(upcoming) })}</NButton> : undefined)}
      </> : !sheets.length && !blocked.length ? empty(viewer.role === 'supervisor' ? 'massar.flow.noClasses' : 'massar.flow.noSheets', viewer.role === 'supervisor' ? undefined : 'massar.flow.checkAssignments') : <>
        {manager && sheets.some(sheet => sheet.status === 'changed_after_export') && <p className={styles.notice} data-tone="warning">{t('massar.flow.changedCount', { count: sheets.filter(sheet => sheet.status === 'changed_after_export').length })}</p>}
        <div className={styles.sheetLayout} data-side={sideCollapsed ? 'collapsed' : 'open'}><aside className={styles.sideColumn} data-collapsed={sideCompact}>
          {controlPicker && <section className={`${styles.sideSection} ${styles.sidePicker}`}>
            {controlPicker}
          </section>}
          {(classes.length > 1 || canOverview) && <section className={styles.sideSection}>
            <h2 className={styles.sideTitle}>{t('massar.flow.sideClasses')}<small>{t('massar.flow.classesDone', { count: classes.filter(name => ['done', 'exported'].includes(classState(sheets.filter(sheet => sheet.className === name)))).length, total: classes.length })}</small></h2>
            {/* Najm's overlay scrollbar: it takes no width from the classes, even in the narrow column. */}
            <NajmScroll axis="both" autoHide="leave" className={styles.classScroll}><nav className={styles.classList} aria-label={t('massar.class')}>
              {classes.map((name, index) => {
                // Primary then collège: each cycle opens with its name once both are here.
                const cycle = classCycle(name), cycleTitle = cycles > 1 && (index === 0 || classCycle(classes[index - 1]) !== cycle);
                const list = sheets.filter(sheet => sheet.className === name), status = blocked.some(cls => cls.className === name) ? 'waiting' : classState(list);
                const total = list.reduce((sum, sheet) => sum + sheet.total, 0), filled = list.reduce((sum, sheet) => sum + sheet.total - sheet.missing, 0);
                const percent = progressPercent(filled, total), level = Number(/^([1-6])APG/.exec(name)?.[1] ?? 1);
                const full = status === 'started' ? t('massar.sheetStatus.in_progress') : t(`massar.flow.status.${status}`, { count: filled, total });
                // Every class shows how much is entered; a sent, changed or waiting class adds its sign.
                const shown = status === 'done' || status === 'exported' ? 100 : percent;
                const short = status === 'waiting' ? '⏸' : `${status === 'exported' ? '🔒 ' : status === 'changed_after_export' ? '⚠ ' : ''}${shown}%`;
                return <Fragment key={name}>{cycleTitle && <span className={styles.cycleTitle}>{t(`massar.flow.cycle.${cycle}`)}</span>}<button type="button" className={styles.classItem} aria-pressed={className === name} disabled={busy} title={sideCompact ? `${name} · ${full}` : full}style={{ '--class-color': CLASS_DOCUMENT_COLORS[level - 1][0] } as React.CSSProperties} onClick={() => { setClass(name); setSheet(''); }}>
                  <span className={styles.classDot} style={{ background: CLASS_DOCUMENT_COLORS[level - 1][0] }} />
                  <span className={styles.classText}><bdi>{name}</bdi><span className={styles.classBar} aria-hidden><span data-status={status} style={{ width: `${shown}%` }} /></span></span>
                  <span className={styles.classStatus} data-status={status} aria-label={full}>{short}</span>
                </button></Fragment>;
              })}
            </nav></NajmScroll>
          </section>}
        </aside>
        {/* Like the app's sidebar: a handle on the column's border, always shown. A click toggles it;
            dragging it toward the column narrows it the moment the drag goes far enough, and away widens it.
            Nothing inside the column moves. */}
        <button type="button" className={styles.sideRail} aria-expanded={!sideCollapsed}
          aria-label={t(sideCollapsed ? 'massar.flow.expandClasses' : 'massar.flow.collapseClasses')} title={t(sideCollapsed ? 'massar.flow.expandClasses' : 'massar.flow.collapseClasses')}
          onPointerDown={event => {
            if (event.button !== 0) return;
            railDrag.current = { x: event.clientX, dragged: false }; event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={event => {
            const drag = railDrag.current; if (!drag) return;
            const moved = event.clientX - drag.x, rtl = getComputedStyle(event.currentTarget).direction === 'rtl';
            if (Math.abs(moved) < 24) return;
            const collapse = rtl ? moved > 0 : moved < 0;
            drag.dragged = true; drag.x = event.clientX;
            if (collapse !== sideCollapsed) setSide(collapse);
          }}
          onPointerUp={() => {
            const drag = railDrag.current; railDrag.current = null;
            if (drag && !drag.dragged) setSide(!sideCollapsed);
          }}
          onPointerCancel={() => { railDrag.current = null; }}
          onClick={event => { if (event.detail === 0) setSide(!sideCollapsed); }} /><div className={styles.sheetArea}>
        {blocked.some(cls => cls.className === className) ? <MassarWaitingPanel className={className} count={blocked.find(cls => cls.className === className)!.unmatchedCount} cls={setup?.classes.find(cls => cls.name === className)} fix={manager ? () => setWaitingClass(className) : undefined} /> : sheet && <>
          {/* One card, like the classes beside it: the class's subjects as tabs (right to left, as the sheet reads), then the sheet. */}
          <div className={styles.sheetCard}>
            <div data-keep-selection className={styles.subjectTabs} dir="rtl" role="group" aria-label={t('massar.subject')}>
              {subjects.map(subject => {
                const status = sheetState(subject), percent = progressPercent(subject.total - subject.missing, subject.total);
                const full = t(`massar.flow.status.${status}`, { count: subject.total - subject.missing, total: subject.total });
                return <button type="button" className={styles.subjectTab} key={subject.id} aria-pressed={sheet.id === subject.id} disabled={busy} title={subject.subjectConfirmed === false ? `${full} · ${t('massar.flow.toConfirmHelp')}` : full} onClick={() => setSheet(subject.id)}>
                  {subject.subjectConfirmed === false && <span className={styles.toConfirmDot} aria-label={t('massar.flow.toConfirm')} />}
                  <span dir="auto">{subject.subjectName}</span>
                  <span className={styles.tabStatus} data-status={status} dir="ltr">{status === 'exported' ? '🔒' : status === 'done' ? '✓' : `${percent}%`}</span>
                </button>;
              })}
            </div>
            <MassarPaper key={`${round?.id}:${sheet.id}`} id={sheet.id} options={options} onBusy={setBusy}
              selected={pickedHere.map(item => item.id)} onSelect={pickStudent} />
          </div>
        </>}
        </div>
        </div>
      </>}
    </div></main>
    {canOverview && <NSheet open={overviewOpen} onOpenChange={setOverviewOpen} icon={LayoutList} title={t('massar.flow.overview')} description={round ? label(round) : undefined} width={overviewWidth}
      footer={<div className="flex justify-end"><NButton variant="outline" leftIcon={Printer} disabled={busy || printPending || !sheets.length} loading={printPending} onClick={() => print(sheets)}>{t('massar.flow.printAll')}</NButton></div>}>
      <MassarOverview sheets={sheets} blocked={blocked} select={select} disabled={busy} fix={manager ? name => { setOverviewOpen(false); setWaitingClass(name); } : undefined} />
    </NSheet>}
    {filesOpen && manager && setup && <MassarFilesDialog setup={setup} close={() => setFilesOpen(false)} />}
    {manager && setup?.classes.some(cls => cls.name === waitingClass) && <MassarWaitingDialog cls={setup.classes.find(cls => cls.name === waitingClass)!} close={() => setWaitingClass('')} addFiles={() => { setWaitingClass(''); setFilesOpen(true); }} />}
    <NDialog open={opening} onOpenChange={setOpening} title={t('massar.flow.openNamed', { name: label(proposed) })} size="sm" showButtons={false}><div className={styles.dialogBody}><p>{t('massar.flow.openHelp', { count: (setup?.classes.length ?? 0) - blocked.length })}</p>{!!blocked.length && <p>{t('massar.flow.waitingHelp')}</p>}<label className={styles.field}><span>{t('massar.flow.dueLabel')}</span><input type="date" className={styles.input} value={proposed.dueDate} disabled={action.pending} onChange={event => setProposed({ ...proposed, dueDate: event.target.value })} /></label></div><div className={styles.dialogFooter}><NButton variant="outline" onClick={() => setOpening(false)} disabled={action.pending}>{t('massar.cancel')}</NButton><NButton onClick={open} disabled={action.pending || rounds.some(round => round.term === proposed.term && round.exam === proposed.exam)} loading={action.pending}>{t('massar.flow.open')}</NButton></div></NDialog>
    <NDialog open={dueEditOpen} onOpenChange={setDueEditOpen} title={t('massar.flow.changeDueDate')} size="sm" showButtons={false}><div className={styles.dialogBody}><label className={styles.field}><span>{t('massar.flow.dueLabel')}</span><input type="date" className={styles.input} value={dateDraft} disabled={action.pending} onChange={event => setDateDraft(event.target.value)} /></label><p>{t('massar.flow.dueHelp')}</p></div><div className={styles.dialogFooter}><NButton variant="outline" disabled={action.pending} onClick={() => setDueEditOpen(false)}>{t('massar.cancel')}</NButton><NButton disabled={action.pending} loading={action.pending} onClick={saveDueDate}>{t('massar.flow.confirm')}</NButton></div></NDialog>
    <NDialog open={downloadOpen} onOpenChange={setDownloadOpen} title={t('massar.flow.download')} size="sm" showButtons={false}><div className={styles.dialogBody}><p>{t('massar.flow.downloadCount', { count: sendable.length })}</p>{sendable.some(sheet => sheet.missing) && <p>{t('massar.flow.incomplete', { count: sendable.filter(sheet => sheet.missing).length })}</p>}{sendable.length < sheets.length && <p className={styles.notice} data-tone="warning">{t('massar.flow.downloadSkipped', { count: sheets.length - sendable.length })}</p>}</div><div className={styles.dialogFooter}><NButton variant="outline" disabled={action.pending} onClick={() => setDownloadOpen(false)}>{t('massar.cancel')}</NButton><NButton disabled={action.pending || !sendable.length} loading={action.pending} onClick={download}>{t('massar.flow.download')}</NButton></div></NDialog>
  </div>;
}
export function MassarPage() { const key = useViewingYearKey(); return <MassarContent key={key} />; }
