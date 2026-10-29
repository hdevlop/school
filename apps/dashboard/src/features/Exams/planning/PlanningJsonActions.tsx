'use client';

import { useState, type ChangeEvent } from 'react';
import { Download, Upload } from 'lucide-react';
import { NButton, NSheet } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { toast } from 'sonner';
import { parseExamPlanningJson, MAX_EXAM_PLANNING_JSON_BYTES, type ExamPlanningClass, type ExamPlanningJson } from '@sms/contracts';

export function PlanningJsonActions({ classes, schoolYear, canEdit, disabled, saving, onImport }: {
  classes: ExamPlanningClass[]; schoolYear: string; canEdit: boolean; disabled: boolean; saving: boolean;
  onImport: (document: ExamPlanningJson) => Promise<unknown>;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [reading, setReading] = useState(false);
  const [pendingDocument, setDocument] = useState<ExamPlanningJson | null>(null);
  const [fileError, setError] = useState<string | null>(null);
  const busy = reading || saving;
  const close = () => { if (!busy) { setOpen(false); setDocument(null); setError(null); } };

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

  const readFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    setDocument(null); setError(null);
    if (!file) return;
    if (file.size > MAX_EXAM_PLANNING_JSON_BYTES) { setError(t('examPlanning.json.fileTooLarge')); return; }
    setReading(true);
    try {
      const result = parseExamPlanningJson(JSON.parse((await file.text()).replace(/^\uFEFF/, '')));
      if (!result.success) { setError(t('examPlanning.json.invalidFile')); return; }
      if (result.data.schoolYear !== schoolYear) { setError(t('examPlanning.json.wrongYear')); return; }
      const known = new Set(classes.map(cls => cls.id));
      if (result.data.classes.some(cls => !known.has(cls.id))) { setError(t('examPlanning.json.unknownClasses')); return; }
      setDocument(result.data);
    } catch { setError(t('examPlanning.json.invalidFile')); }
    finally { setReading(false); }
  };

  const importJson = async () => {
    if (!pendingDocument || busy || disabled) return;
    setError(null);
    try {
      await onImport(pendingDocument);
      setOpen(false); setDocument(null);
      toast.success(t('examPlanning.json.imported'));
    } catch { setError(t('examPlanning.json.importFailed')); }
  };

  const months = pendingDocument?.classes.reduce((count, cls) => count + Object.keys(cls.months).length, 0) ?? 0;
  const entries = pendingDocument?.classes.reduce((count, cls) => count + Object.values(cls.months).reduce((total, items) => total + items.length, 0), 0) ?? 0;

  return <>
    <NButton variant="outline" size="icon" aria-label={t('examPlanning.json.export')} title={t('examPlanning.json.export')} disabled={disabled || !classes.length || !schoolYear} onClick={exportJson}><Download aria-hidden="true" /></NButton>
    {canEdit && <>
      <NButton variant="outline" size="icon" aria-label={t('examPlanning.json.import')} title={t('examPlanning.json.import')} disabled={disabled || !classes.length || !schoolYear} onClick={() => setOpen(true)}><Upload aria-hidden="true" /></NButton>
      <NSheet open={open} onOpenChange={value => { if (!value) close(); }} icon={Upload} title={t('examPlanning.json.import')} description={schoolYear} footer={<div className="flex justify-end gap-2"><NButton variant="outline" disabled={busy} onClick={close}>{t('common.cancel')}</NButton><NButton loading={saving} disabled={!pendingDocument || busy || disabled} onClick={importJson}>{t('examPlanning.json.import')}</NButton></div>}>
        <p className="mb-4 text-sm text-muted-foreground">{t('examPlanning.json.description')}</p>
        <label className="mb-2 block text-sm font-medium" htmlFor="planning-json-file">{t('examPlanning.json.file')}</label>
        <input id="planning-json-file" type="file" accept=".json,application/json" disabled={busy || disabled} onChange={readFile} className="w-full min-w-0 rounded-md border p-3 text-sm file:me-3 file:rounded file:border-0 file:bg-muted file:px-3 file:py-1" />
        {fileError && <p role="alert" className="mt-4 text-sm text-destructive">{fileError}</p>}
        {pendingDocument && <div className="mt-4 space-y-3 text-sm">
          <p>{t('examPlanning.json.summary', { classes: pendingDocument.classes.length, months, entries })}</p>
          <ul className="space-y-2">{pendingDocument.classes.map(cls => <li key={cls.id} className="rounded-md border p-3">{classes.find(known => known.id === cls.id)?.name ?? cls.name}</li>)}</ul>
        </div>}
      </NSheet>
    </>}
  </>;
}
