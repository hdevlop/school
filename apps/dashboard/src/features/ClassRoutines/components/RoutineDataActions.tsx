'use client';

import { useState } from 'react';
import { Download, FileJson, FileSpreadsheet, Upload } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, NButton } from 'najm-kit';
import { FileImportDialog } from '@/components/FileImportDialog';
import { useTranslation } from 'najm-i18n/react';
import { toast } from 'sonner';
import { MAX_ROUTINE_JSON_BYTES, parseRoutineJson, type RoutineJson } from '@sms/contracts';
import type { RoutineDay, RoutinePeriod, RoutineSchedule } from '../types';
import { routineDayLabel, routinePeriodLabel } from '../utils/labels';
import { buildRoutineJson, buildRoutineWorkbook, downloadRoutineFile, routineFileName } from '../utils/routineExport';

export interface RoutineImportResult { routines: number; lessons: number; duties: number; teachersNotAssigned: number }

/** Export the timetables on screen (Excel, JSON) and import a JSON file for the selected year. */
export function RoutineDataActions({ routines, schoolYear, disabled, canImport, importing, onImport }: {
  routines: readonly RoutineSchedule[];
  schoolYear: string;
  disabled: boolean;
  canImport: boolean;
  importing: boolean;
  onImport: (document: RoutineJson) => Promise<RoutineImportResult>;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [reading, setReading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [pendingDocument, setDocument] = useState<RoutineJson | null>(null);
  const [selectedFile, setFile] = useState<File | null>(null);
  const [fileError, setError] = useState<string | null>(null);
  const busy = reading || importing;
  const close = () => { if (!busy) { setOpen(false); setDocument(null); setFile(null); setError(null); } };
  const title = [t('classRoutines.ui.print.title'),
    routines.length === 1 ? [routines[0].className, routines[0].sectionName].filter(Boolean).join(' ') : '', schoolYear]
    .filter(Boolean).join(' ');

  const exportJson = () => {
    const routineFile = buildRoutineJson(routines, schoolYear);
    const file = routineFile && new Blob([JSON.stringify(routineFile, null, 2)], { type: 'application/json;charset=utf-8' });
    if (!file) { toast.error(t('classRoutines.data.exportFailed')); return; }
    if (file.size > MAX_ROUTINE_JSON_BYTES) { toast.error(t('classRoutines.data.fileTooLarge')); return; }
    downloadRoutineFile(file, routineFileName(title, 'json'));
  };

  const exportExcel = async () => {
    setExporting(true);
    try {
      const file = await buildRoutineWorkbook(routines, {
        dayHeader: t('classRoutines.ui.fields.days'),
        orLabel: t('classRoutines.ui.content.or'),
        dayLabel: (day: RoutineDay) => routineDayLabel(day, t),
        periodLabel: (period: RoutinePeriod) => routinePeriodLabel(period.name, t),
        dir: document.documentElement.getAttribute('dir') === 'rtl' ? 'rtl' : 'ltr',
      });
      downloadRoutineFile(file, routineFileName(title, 'xlsx'));
    } catch {
      toast.error(t('classRoutines.data.exportFailed'));
    } finally {
      setExporting(false);
    }
  };

  const readFile = async (file: File | null) => {
    if (busy || disabled) return;
    setFile(file);
    setDocument(null); setError(null);
    if (!file) return;
    if (file.size > MAX_ROUTINE_JSON_BYTES) { setError(t('classRoutines.data.fileTooLarge')); return; }
    setReading(true);
    try {
      const result = parseRoutineJson(JSON.parse((await file.text()).replace(/^﻿/, '')));
      if (!result.success) { setError(t('classRoutines.data.invalidFile')); return; }
      if (result.data.schoolYear !== schoolYear) { setError(t('classRoutines.data.wrongYear')); return; }
      setDocument(result.data);
    } catch { setError(t('classRoutines.data.invalidFile')); }
    finally { setReading(false); }
  };

  const importJson = async () => {
    if (!pendingDocument || busy || disabled) return;
    setError(null);
    try {
      const result = await onImport(pendingDocument);
      setOpen(false); setDocument(null); setFile(null);
      toast.success(t('classRoutines.data.imported', { count: result.routines }));
      if (result.teachersNotAssigned) toast.warning(t('classRoutines.data.teachersNotAssigned', { count: result.teachersNotAssigned }));
    } catch (error: any) {
      // The server names the timetable and the rule a lesson broke.
      setError(error?.response?.data?.message || t('classRoutines.data.importFailed'));
    }
  };

  const lessons = pendingDocument?.routines.reduce((count, routine) => count + routine.lessons.length, 0) ?? 0;
  const duties = pendingDocument?.routines.reduce((count, routine) => count + routine.duties.length, 0) ?? 0;

  return <>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <NButton variant="outline" className="h-10 w-10 border-border p-0 text-foreground" disabled={disabled || exporting || !routines.length || !schoolYear}
          aria-label={t('classRoutines.data.export')} title={t('classRoutines.data.export')}>
          <Download className="h-4 w-4 text-foreground" aria-hidden="true" />
        </NButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44 bg-card">
        <DropdownMenuItem onSelect={() => { void exportExcel(); }}>
          <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />{t('classRoutines.data.exportExcel')}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={exportJson}>
          <FileJson className="h-4 w-4" aria-hidden="true" />{t('classRoutines.data.exportJson')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    {canImport && <>
      <NButton variant="outline" className="h-10 w-10 border-border p-0 text-foreground" disabled={disabled || !schoolYear} onClick={() => setOpen(true)}
        aria-label={t('classRoutines.data.import')} title={t('classRoutines.data.import')}>
        <Upload className="h-4 w-4 text-foreground" aria-hidden="true" />
      </NButton>
      <FileImportDialog open={open} title={t('classRoutines.data.import')} description={`${schoolYear} · ${t('classRoutines.data.description')}`}
        fileLabel={t('classRoutines.data.file')} file={selectedFile} busy={busy} reading={reading} saving={importing} disabled={disabled}
        canSubmit={Boolean(pendingDocument)} error={fileError} onClose={close} onFile={readFile} onSubmit={importJson}>
        {pendingDocument && <div className="mt-4 space-y-3 text-sm">
          <p>{t('classRoutines.data.summary', { routines: pendingDocument.routines.length, lessons, duties })}</p>
          <ul className="space-y-2">{pendingDocument.routines.map(routine => (
            <li key={`${routine.className}:${routine.sectionName}`} className="rounded-md border p-3"><bdi>{routine.className} {routine.sectionName}</bdi></li>
          ))}</ul>
        </div>}
      </FileImportDialog>
    </>}
  </>;
}
