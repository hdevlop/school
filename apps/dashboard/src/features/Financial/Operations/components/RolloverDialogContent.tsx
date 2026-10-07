'use client';

import { useEffect, useMemo, useState } from 'react';
import { NButton } from 'najm-kit';
import { toast } from 'sonner';
import { ArrowRight } from 'lucide-react';
import { useTranslation } from 'najm-i18n/react';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';
import { commitRolloverApi, previewRolloverApi } from '@/services/financialOperationsApi';
import { useAcademicYearOptions, useViewingAcademicYear } from '@/features/AcademicYears/hooks/useViewingAcademicYear';
import { withAcademicYear } from '@/features/AcademicYears/utils/yearScope';

const unwrap = (value: any) => value?.data?.data ?? value?.data ?? value;
const selectClass = 'h-10 w-full min-w-0 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30';

/**
 * Copies one school year's fee assignments into another: preview first, then
 * commit exactly that preview.
 */
export default function RolloverDialogContent() {
  const { t } = useTranslation();
  const { majorMoney } = useSchoolFormat();
  const { activeYear } = useViewingAcademicYear();
  const { data: academicYears } = useAcademicYearOptions();
  // Newest first, so the default reads "previous year → active year".
  const yearLabels = useMemo(
    () => (academicYears?.years ?? []).map((year) => year.label).sort((left, right) => right.localeCompare(left)),
    [academicYears],
  );
  const [fromYear, setFromYear] = useState('');
  const [toYear, setToYear] = useState('');
  const [copyDiscounts, setCopyDiscounts] = useState(false);
  const [includeOneTimeFees, setIncludeOneTimeFees] = useState(false);
  const [rolloverKey, setRolloverKey] = useState(() => crypto.randomUUID());
  const [run, setRun] = useState<any>(null);
  const [busy, setBusy] = useState<'preview' | 'commit' | null>(null);

  useEffect(() => {
    if (toYear || yearLabels.length === 0) return;
    const target = activeYear && yearLabels.includes(activeYear) ? activeYear : yearLabels[0];
    setToYear(target);
    setFromYear(yearLabels.find((label) => label < target) ?? '');
  }, [activeYear, toYear, yearLabels]);

  const payload = { fromYear, toYear, copyDiscounts, includeOneTimeFees, dryRun: true, idempotencyKey: rolloverKey };
  const yearsValid = Boolean(fromYear && toYear && fromYear !== toYear);
  const reset = () => setRun(null);

  const execute = async (kind: 'preview' | 'commit', action: () => Promise<unknown>, success: string) => {
    setBusy(kind);
    try {
      const result = unwrap(await action());
      toast.success(success);
      return result;
    } catch (error: any) {
      toast.error(error?.message || t('financialOperations.failed'));
      return null;
    } finally {
      setBusy(null);
    }
  };

  const preview = async () => {
    if (!yearsValid) return toast.error(t('financialOperations.chooseTwoYears'));
    const result = await execute('preview', () => withAcademicYear(toYear, () => previewRolloverApi(payload)), t('financialOperations.previewCreated'));
    if (result) setRun(result);
  };

  const commit = async () => {
    if (!run?.id) return toast.error(t('financialOperations.createPreviewFirst'));
    const result = await execute('commit', () => withAcademicYear(toYear, () => commitRolloverApi({
      ...payload,
      runId: run.id,
      confirmSettingsUpdate: false,
    })), t('financialOperations.rolloverCompleted'));
    if (result) {
      setRun(result);
      setRolloverKey(crypto.randomUUID());
    }
  };

  const summary = run?.preview;
  const committed = run?.status === 'committed';
  const figures = summary ? [
    { label: t('financialOperations.summary.students'), value: summary.activeStudents },
    { label: t('financialOperations.summary.feesToCreate'), value: summary.proposedFees },
    { label: t('financialOperations.summary.alreadyExist'), value: summary.duplicatesToSkip },
    { label: t('financialOperations.summary.notEnrolled'), value: summary.studentsNotEnrolled },
    { label: t('financialOperations.summary.errors'), value: summary.details?.validationErrors?.length ?? 0 },
    { label: t('financialOperations.summary.projectedTotal'), value: majorMoney(Number(summary.projectedNet || 0)) },
  ] : [];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-2">
        <label className="flex min-w-0 flex-col gap-1 text-sm">
          <span className="text-muted-foreground">{t('financialOperations.fromYear')}</span>
          <select className={selectClass} value={fromYear} onChange={(event) => { setFromYear(event.target.value); reset(); }}>
            <option value="" disabled>{t('financialOperations.chooseYear')}</option>
            {yearLabels.map((label) => <option key={label} value={label}>{label}</option>)}
          </select>
        </label>
        <ArrowRight className="mb-3 h-4 w-4 text-muted-foreground rtl:rotate-180" />
        <label className="flex min-w-0 flex-col gap-1 text-sm">
          <span className="text-muted-foreground">{t('financialOperations.toYear')}</span>
          <select className={selectClass} value={toYear} onChange={(event) => { setToYear(event.target.value); reset(); }}>
            <option value="" disabled>{t('financialOperations.chooseYear')}</option>
            {yearLabels.map((label) => <option key={label} value={label}>{label}</option>)}
          </select>
        </label>
      </div>
      {yearLabels.length > 0 && !yearLabels.some((label) => label < toYear) && (
        <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">{t('financialOperations.noEarlierYear')}</p>
      )}

      <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={copyDiscounts} onChange={(event) => { setCopyDiscounts(event.target.checked); reset(); }} />
          {t('financialOperations.copyDiscounts')}
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={includeOneTimeFees} onChange={(event) => { setIncludeOneTimeFees(event.target.checked); reset(); }} />
          {t('financialOperations.includeOneTimeFees')}
        </label>
      </div>

      {summary && (
        <div className="grid grid-cols-2 gap-2 rounded-lg border bg-muted/40 p-3 sm:grid-cols-3">
          {figures.map((figure) => (
            <div key={figure.label} className="min-w-0">
              <p className="truncate text-xs text-muted-foreground">{figure.label}</p>
              <p className="truncate font-semibold tabular-nums">{figure.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        <NButton variant="outline" disabled={!yearsValid || busy !== null} onClick={preview}>
          {t('financialOperations.preview')}
        </NButton>
        <NButton disabled={!run?.id || committed || busy !== null} onClick={commit}>
          {t('financialOperations.commitPreview')}
        </NButton>
      </div>
    </div>
  );
}
