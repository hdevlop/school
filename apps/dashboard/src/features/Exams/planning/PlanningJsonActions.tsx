'use client';

import { useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { NButton } from 'najm-kit';
import { FileImportDialog } from '@/components/FileImportDialog';
import { useTranslation } from 'najm-i18n/react';
import { toast } from 'sonner';
import { parseExamPlanningJson, resolveExamPlanningClasses, MAX_EXAM_PLANNING_JSON_BYTES, type ExamPlanningClass, type ExamPlanningJson } from '@sms/contracts';

export function PlanningJsonActions({ classes, schoolYear, canEdit, disabled, saving, onImport }: {
  classes: ExamPlanningClass[]; schoolYear: string; canEdit: boolean; disabled: boolean; saving: boolean;
  onImport: (document: ExamPlanningJson) => Promise<unknown>;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [reading, setReading] = useState(false);
  const [pendingDocument, setDocument] = useState<ExamPlanningJson | null>(null);
  const [selectedFile, setFile] = useState<File | null>(null);
  const [fileError, setError] = useState<string | null>(null);
  const busy = reading || saving;
  const close = () => { if (!busy) { setOpen(false); setDocument(null); setFile(null); setError(null); } };

  const exportJson = () => {
    const result = parseExamPlanningJson({ format: 'school-exam-planning', version: 1, schoolYear, exportedAt: new Date().toISOString(), classes });
    if (!result.success) { toast.error(t('examPlanning.json.exportFailed')); return; }
    const file = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json;charset=utf-8' });
    if (file.size > MAX_EXAM_PLANNING_JSON_BYTES) { toast.error(t('examPlanning.json.fileTooLarge')); return; }
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url; link.download = `exam-planning-${schoolYear}.json`;
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const readFile = async (file: File | null) => {
    if (busy || disabled) return;
    setFile(file);
    setDocument(null); setError(null);
    if (!file) return;
    if (file.size > MAX_EXAM_PLANNING_JSON_BYTES) { setError(t('examPlanning.json.fileTooLarge')); return; }
    setReading(true);
    try {
      const result = parseExamPlanningJson(JSON.parse((await file.text()).replace(/^\uFEFF/, '')));
      if (!result.success) { setError(t('examPlanning.json.invalidFile')); return; }
      if (result.data.schoolYear !== schoolYear) { setError(t('examPlanning.json.wrongYear')); return; }
      const resolved = resolveExamPlanningClasses(result.data, classes);
      if (resolved.success === false) { setError(t(`examPlanning.json.${resolved.error}`)); return; }
      setDocument(result.data);
    } catch { setError(t('examPlanning.json.invalidFile')); }
    finally { setReading(false); }
  };

  const importJson = async () => {
    if (!pendingDocument || busy || disabled) return;
    setError(null);
    try {
      await onImport(pendingDocument);
      setOpen(false); setDocument(null); setFile(null);
      toast.success(t('examPlanning.json.imported'));
    } catch { setError(t('examPlanning.json.importFailed')); }
  };

  const months = pendingDocument?.classes.reduce((count, cls) => count + Object.keys(cls.months).length, 0) ?? 0;
  const entries = pendingDocument?.classes.reduce((count, cls) => count + Object.values(cls.months).reduce((total, items) => total + items.length, 0), 0) ?? 0;

  return <>
    <NButton variant="outline" size="icon" aria-label={t('examPlanning.json.export')} title={t('examPlanning.json.export')} disabled={disabled || !classes.length || !schoolYear} onClick={exportJson}><Download aria-hidden="true" /></NButton>
    {canEdit && <>
      <NButton variant="outline" size="icon" aria-label={t('examPlanning.json.import')} title={t('examPlanning.json.import')} disabled={disabled || !classes.length || !schoolYear} onClick={() => setOpen(true)}><Upload aria-hidden="true" /></NButton>
      <FileImportDialog open={open} title={t('examPlanning.json.import')} description={`${schoolYear} · ${t('examPlanning.json.description')}`}
        fileLabel={t('examPlanning.json.file')} file={selectedFile} busy={busy} reading={reading} saving={saving} disabled={disabled}
        canSubmit={Boolean(pendingDocument)} error={fileError} onClose={close} onFile={readFile} onSubmit={importJson}>
        {pendingDocument && <div className="mt-4 space-y-3 text-sm">
          <p>{t('examPlanning.json.summary', { classes: pendingDocument.classes.length, months, entries })}</p>
          <ul className="space-y-2">{pendingDocument.classes.map(cls => <li key={cls.name} className="rounded-md border p-3">{cls.name}</li>)}</ul>
        </div>}
      </FileImportDialog>
    </>}
  </>;
}
