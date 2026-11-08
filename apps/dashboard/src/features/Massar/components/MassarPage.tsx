'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarClock, Check, ChevronDown, Download, FileSpreadsheet, FileUp, FolderArchive, LayoutList, Plus, Printer, Upload } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, NButton, NDialog, NEmptyState, NSheet } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { useNThemeBrandingSlot } from 'najm-theme/react';
import { toast } from 'sonner';
import type { MassarRound, MassarSetup, MassarSheetDetail, MassarSheetRow } from '@sms/contracts';
import { useViewerRole } from '@/features/Users/hooks/useViewerRole';
import { useViewingYearKey } from '@/features/AcademicYears/hooks/useViewingAcademicYear';
import { CLASS_DOCUMENT_COLORS } from '@/features/Assessments/planning/planningModel';
import { printPlanningDocument } from '@/features/Assessments/planning/planningDocument';
import { FEATURE_ICONS } from '@/shared/featureIcons';
import { api } from '@/services/http';
import { downloadMassar, massarPost, massarPut, useMassarAction, useMassarRead } from '../hooks/useMassar';
import { classOrder, classState, controlList, nextRound, progressPercent, sheetState, type PlannedRound } from '../config/massarModel';
import { buildMassarDocument, type MassarPaperOptions } from '../config/massarDocument';
import { MassarHeader, MassarLoadError, MassarLoadingSkeleton } from './MassarShared';
import { MassarOverview } from './MassarOverview';
import { MassarPaper } from './MassarPaper';
import { MassarFilesDialog } from './MassarFilesDialog';
import { MassarWaitingDialog } from './MassarWaitingDialog';
import { MassarWaitingPanel } from './MassarWaitingPanel';
import { MassarDueNotice } from './MassarDueNotice';
import styles from './Massar.module.css';

function MassarContent() {
  const router = useRouter();
  const { t, language } = useTranslation(), viewer = useViewerRole(), action = useMassarAction(), logo = useNThemeBrandingSlot('authLogo');
  const manager = viewer.isSchoolWide && viewer.can('manage:massar'), canOverview = manager || viewer.role === 'supervisor';
  const availability = useMassarRead<{ configured: boolean; hasRounds: boolean; planned?: PlannedRound[] }>('/availability', true, 15000);
  const setupQuery = useMassarRead<MassarSetup>('/setup', manager), roundsQuery = useMassarRead<MassarRound[]>('/rounds', true, 15000);
  const [pickedRound, setRound] = useState(''), [pickedClass, setClass] = useState<string | null>(null), [pickedSheet, setSheet] = useState('');
  const [filesOpen, setFilesOpen] = useState(false), [opening, setOpening] = useState(false), [downloadOpen, setDownloadOpen] = useState(false);
  const [busy, setBusy] = useState(false), [printPending, setPrintPending] = useState(false), [proposed, setProposed] = useState({ term: 1, exam: 1, dueDate: '' });
  const [dueEditOpen, setDueEditOpen] = useState(false), [dateDraft, setDateDraft] = useState('');
  const [waitingClass, setWaitingClass] = useState(''), [overviewOpen, setOverviewOpen] = useState(false);
  const rounds = [...(roundsQuery.data ?? [])].sort((a, b) => a.term - b.term || a.exam - b.exam);
  const round = rounds.find(round => round.id === pickedRound) ?? rounds.at(-1);
  const sheetsQuery = useMassarRead<MassarSheetRow[]>(`/sheets?roundId=${encodeURIComponent(round?.id ?? '')}`, !!round, 10000);
  const sheets = sheetsQuery.data ?? [], setup = setupQuery.data;
  const blocked = manager ? setup?.classes.filter(cls => cls.unmatchedCodes.length).map(cls => ({ className: cls.name, unmatchedCount: cls.unmatchedCodes.length })) ?? [] : [];
  const classes = [...new Set([...sheets.map(sheet => sheet.className), ...blocked.map(cls => cls.className)])].sort(classOrder);
  // The first class opens by default; the overview of every class is a sheet.
  const className = pickedClass && classes.includes(pickedClass) ? pickedClass : classes[0] ?? '';
  const subjects = sheets.filter(sheet => sheet.className === className);
  const sheet = subjects.find(sheet => sheet.id === pickedSheet) ?? subjects[0];
  const storageKey = `massar-downloads:${viewer.userId}:${availability.academicYear}`;
  const [receipts, setReceipts] = useState<Record<string, string>>({});
  useEffect(() => {
    try { const value = JSON.parse(localStorage.getItem(storageKey) ?? '{}'); if (value && typeof value === 'object' && Object.values(value).every(token => typeof token === 'string')) setReceipts(value); }
    catch { /* Storage can be unavailable in private browsing. */ }
  }, [storageKey]);
  const remember = (roundId: string, token: string | null) => {
    const next = { ...receipts }; if (token) next[roundId] = token; else delete next[roundId]; setReceipts(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* The current page still retains the question. */ }
  };
  const options: MassarPaperOptions = { language, logo, title: t('massar.flow.paperTitle'), student: t('massar.student'), birthDate: t('massar.flow.birthDate'), teacher: t('massar.teacher'), maxMark: t('massar.maxMark'), term: t('massar.term'), exam: t('massar.exam') };
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
    await action.run(async () => { const receipt = await downloadMassar(`/rounds/${round.id}/download`, {}, 'massar.zip'); if (receipt) remember(round.id, receipt); });
    setDownloadOpen(false);
  };
  const accept = async () => {
    if (!round || !receipts[round.id]) return;
    await action.run(() => massarPost(`/rounds/${round.id}/accept`, { receipt: receipts[round.id] })); remember(round.id, null);
  };
  const print = async (all = false) => {
    const chosen = all ? sheets : subjects;
    setPrintPending(true);
    try { await action.run(async () => {
      const details = await Promise.all(chosen.map(async sheet => (await api.get(`/massar/sheets/${encodeURIComponent(sheet.id)}`)).data.data as MassarSheetDetail));
      if (!await printPlanningDocument(buildMassarDocument(details, options))) toast.error(t('insurance.popupBlocked'));
    }); } finally { setPrintPending(false); }
  };
  const empty = (title: string, description?: string, button?: React.ReactNode) => <div className={styles.emptyWrap}><NEmptyState surface="panel" icon={FEATURE_ICONS.massar} title={t(title)} description={description ? t(description) : undefined} action={button} /></div>;
  const addFiles = <NButton leftIcon={Upload} onClick={() => setFilesOpen(true)}>{t('massar.flow.upload')}</NButton>;
  const controlPicker = controls.length > 0 ? <div className={styles.controlPicker}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className={styles.controlTrigger} disabled={busy} aria-label={t('massar.flow.chooseControl')}>
                <span><strong>{round ? label(round) : t('massar.flow.chooseControl')}</strong><small>{round ? when(controls.find(item => item.round?.id === round.id) ?? round) : t('massar.flow.plan.noDate')}</small></span>
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
          {manager && sheet && <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <NButton variant="outline" size="icon" aria-label={t('massar.flow.exportFiles')} title={t('massar.flow.exportFiles')} disabled={busy || exporting} loading={exporting}>{!exporting && <FileSpreadsheet className="size-4" aria-hidden="true" />}</NButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuItem className={styles.controlOption} onSelect={() => void exportFiles([sheet])}>
                <span className={styles.controlCheck}><FileSpreadsheet aria-hidden /></span>
                <span><strong>{t('massar.flow.exportOpen')}</strong><small><bdi>{sheet.subjectName}</bdi> · .xlsx{sheet.subjectConfirmed === false && <> · {t('massar.flow.toConfirm')}</>}</small></span>
              </DropdownMenuItem>
              <DropdownMenuItem className={styles.controlOption} onSelect={() => void exportFiles(subjects)}>
                <span className={styles.controlCheck}><FolderArchive aria-hidden /></span>
                <span><strong>{t('massar.flow.exportAll', { name: className })}</strong><small>{unconfirmed ? t('massar.flow.exportAllHelp', { count: subjects.length, unconfirmed }) : t('massar.flow.exportAllReady', { count: subjects.length })}</small></span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>}
          <NButton variant="outline" size="icon" aria-label={t('insurance.print')} title={t('insurance.print')} disabled={busy || printPending || !subjects.length} loading={printPending} onClick={() => print()}>{!printPending && <Printer className="size-4" aria-hidden="true" />}</NButton>
        </div>;
  return <div className={styles.page} data-massar-page="main">
    <MassarHeader title={t('massar.title')} subtitle={error || loading ? undefined : configured ? manager && setup ? t('massar.flow.loaded', { count: setup.classes.length, subjects: t('massar.flow.subjectCount', { count: new Set(setup.subjects.map(subject => subject.code)).size }) }) : undefined : t('massar.flow.notSetUp')} actions={<div className={styles.actions}>
      {/* Icon buttons, one group of the same size; each names itself on hover and to screen readers. */}
      <div className={styles.toolbarButtons}>
      {manager && configured && <NButton variant="outline" size="icon" aria-label={t('massar.flow.addFiles')} title={t('massar.flow.addFiles')} disabled={busy || action.pending} onClick={() => setFilesOpen(true)}><FileUp className="size-4" aria-hidden="true" /></NButton>}
      {manager && round && <NButton variant="outline" size="icon" aria-label={t('massar.flow.download')} title={!setup?.filledExportVerified ? `${t('massar.flow.download')} · ${t('massar.exportGate')}` : t('massar.flow.download')} disabled={busy || action.pending || !sendable.length || !!error || !setup?.filledExportVerified || round.status === 'closed'} onClick={() => setDownloadOpen(true)}><Download className="size-4" aria-hidden="true" /></NButton>}
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
        {round && receipts[round.id] && manager && <div className={styles.notice}><span>{t('massar.flow.acceptedQuestion')}</span><NButton size="sm" disabled={busy || action.pending} onClick={accept}>{t('massar.flow.yes')}</NButton><NButton size="sm" variant="ghost" onClick={() => { toast.info(t('massar.flow.notYetHelp')); }}>{t('massar.flow.notYet')}</NButton></div>}
        {manager && sheets.some(sheet => sheet.status === 'changed_after_export') && <p className={styles.notice} data-tone="warning">{t('massar.flow.changedCount', { count: sheets.filter(sheet => sheet.status === 'changed_after_export').length })}</p>}
        <div className={styles.sheetLayout}><aside className={styles.sideColumn}>
          {controlPicker && <section className={styles.sideSection}>
            {controlPicker}
          </section>}
          {(classes.length > 1 || canOverview) && <section className={styles.sideSection}>
            <h2 className={styles.sideTitle}>{t('massar.flow.sideClasses')}<small>{t('massar.flow.classesDone', { count: classes.filter(name => ['done', 'exported'].includes(classState(sheets.filter(sheet => sheet.className === name)))).length, total: classes.length })}</small></h2>
            <nav className={styles.classList} aria-label={t('massar.class')}>
              {classes.map(name => {
                const list = sheets.filter(sheet => sheet.className === name), status = blocked.some(cls => cls.className === name) ? 'waiting' : classState(list);
                const total = list.reduce((sum, sheet) => sum + sheet.total, 0), filled = list.reduce((sum, sheet) => sum + sheet.total - sheet.missing, 0);
                const percent = progressPercent(filled, total), level = Number(/^([1-6])APG/.exec(name)?.[1] ?? 1);
                const full = status === 'started' ? t('massar.sheetStatus.in_progress') : t(`massar.flow.status.${status}`, { count: filled, total });
                // Every class shows how much is entered; a sent, changed or waiting class adds its sign.
                const shown = status === 'done' || status === 'exported' ? 100 : percent;
                const short = status === 'waiting' ? '⏸' : `${status === 'exported' ? '🔒 ' : status === 'changed_after_export' ? '⚠ ' : ''}${shown}%`;
                return <button type="button" className={styles.classItem} key={name} aria-pressed={className === name} disabled={busy} title={full} style={{ '--class-color': CLASS_DOCUMENT_COLORS[level - 1][0] } as React.CSSProperties} onClick={() => { setClass(name); setSheet(''); }}>
                  <span className={styles.classDot} style={{ background: CLASS_DOCUMENT_COLORS[level - 1][0] }} />
                  <span className={styles.classText}><bdi>{name}</bdi><span className={styles.classBar} aria-hidden><span data-status={status} style={{ width: `${shown}%` }} /></span></span>
                  <span className={styles.classStatus} data-status={status} aria-label={full}>{short}</span>
                </button>;
              })}
            </nav>
          </section>}
        </aside><div className={styles.sheetArea}>
        {blocked.some(cls => cls.className === className) ? <MassarWaitingPanel className={className} count={blocked.find(cls => cls.className === className)!.unmatchedCount} cls={setup?.classes.find(cls => cls.name === className)} fix={manager ? () => setWaitingClass(className) : undefined} /> : sheet && <>
          {/* One card, like the classes beside it: the class's subjects as tabs (right to left, as the sheet reads), then the sheet. */}
          <div className={styles.sheetCard}>
            <div className={styles.subjectTabs} dir="rtl" role="group" aria-label={t('massar.subject')}>
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
            <MassarPaper key={`${round?.id}:${sheet.id}`} id={sheet.id} options={options} onBusy={setBusy} />
          </div>
        </>}
        </div>
        </div>
      </>}
    </div></main>
    {canOverview && <NSheet open={overviewOpen} onOpenChange={setOverviewOpen} icon={LayoutList} title={t('massar.flow.overview')} description={round ? label(round) : undefined} width={overviewWidth}
      footer={<div className="flex justify-end"><NButton variant="outline" leftIcon={Printer} disabled={busy || printPending || !sheets.length} loading={printPending} onClick={() => print(true)}>{t('massar.flow.printAll')}</NButton></div>}>
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
