'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { NButton, useNSidebar } from 'najm-kit';
import { toast } from 'sonner';
import { Activity, Banknote, BellRing, History, Menu, RefreshCw, RotateCw } from 'lucide-react';
import { getStudentsApi } from '@/services/studentApi';
import {
  getPendingChecksApi,
  updateCheckStatusApi,
  voidPaymentApi,
} from '@/services/paymentApi';
import {
  applyStudentCreditApi,
  commitRolloverApi,
  getFinancialAuditApi,
  getFinancialNotificationsApi,
  getStudentCreditsApi,
  previewRolloverApi,
} from '@/services/financialOperationsApi';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';
import { useTranslation } from 'najm-i18n/react';
import { useViewingAcademicYear } from '@/features/AcademicYears/hooks/useViewingAcademicYear';
import { ViewingYearSelector } from '@/features/AcademicYears/components/ViewingYearSelector';
import { withAcademicYear } from '@/features/AcademicYears/utils/yearScope';

const unwrap = (value: any) => value?.data?.data ?? value?.data ?? value;
const list = (value: any) => {
  const payload = unwrap(value);
  return Array.isArray(payload) ? payload : payload?.items ?? [];
};

function Panel({ title, description, icon: Icon, badge, action, children }: any) {
  return (
    <section className="flex min-w-0 flex-col rounded-xl border bg-card p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary"><Icon className="h-5 w-5" /></div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold">{title}</h2>
              {badge != null ? <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">{badge}</span> : null}
            </div>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        {action ?? null}
      </div>
      {children}
    </section>
  );
}

const checkStatusBadge: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  deposited: 'bg-blue-100 text-blue-700',
};

const inputClass = 'h-10 min-w-0 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30';

export default function FinancialOperationsPage() {
  const { viewingYear, isResolving } = useViewingAcademicYear();
  const { majorMoney, displayDateTime } = useSchoolFormat();
  const { t } = useTranslation();
  const sidebar = useNSidebar();
  const auditLabel = (action: string) => {
    const key = `financialOperations.auditActions.${action}`;
    const label = t(key);
    return label === key ? t('financialOperations.otherAction') : label;
  };
  const [studentId, setStudentId] = useState('');
  const [creditAmount, setCreditAmount] = useState('');
  const [fromYear, setFromYear] = useState('2025-2026');
  const [toYear, setToYear] = useState('2026-2027');
  const [copyDiscounts, setCopyDiscounts] = useState(false);
  const [includeOneTimeFees, setIncludeOneTimeFees] = useState(false);
  const [rolloverKey, setRolloverKey] = useState(() => crypto.randomUUID());
  const [rolloverRun, setRolloverRun] = useState<any>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const studentsQuery = useQuery({
    queryKey: ['students', 'financial-operations', viewingYear ?? null],
    queryFn: () => withAcademicYear(viewingYear, getStudentsApi),
    enabled: !isResolving,
  });
  const checksQuery = useQuery({ queryKey: ['payments', 'pending-checks'], queryFn: getPendingChecksApi });
  const auditQuery = useQuery({ queryKey: ['financial-audit'], queryFn: () => getFinancialAuditApi() });
  const notificationsQuery = useQuery({ queryKey: ['financial-notifications'], queryFn: getFinancialNotificationsApi });
  const creditsQuery = useQuery({
    queryKey: ['student-credits', studentId],
    queryFn: () => getStudentCreditsApi(studentId),
    enabled: Boolean(studentId),
  });

  const students = list(studentsQuery.data);
  const checks = list(checksQuery.data);
  const auditEntries = list(auditQuery.data);
  const notifications = list(notificationsQuery.data);
  const creditLots = list(creditsQuery.data);
  const availableCredit = useMemo(
    () => creditLots.filter((lot: any) => lot.status === 'available').reduce((sum: number, lot: any) => sum + Number(lot.remainingAmount || 0), 0),
    [creditLots],
  );

  const run = async (key: string, action: () => Promise<unknown>, success: string) => {
    setBusy(key);
    try {
      const result = await action();
      toast.success(success);
      return result;
    } catch (error: any) {
      toast.error(error?.message || t('financialOperations.failed'));
      throw error;
    } finally {
      setBusy(null);
    }
  };

  const changeCheckStatus = async (payment: any, status: 'deposited' | 'completed' | 'bounced') => {
    const reason = status === 'bounced' ? window.prompt(t('financialOperations.bounceReason')) : undefined;
    if (status === 'bounced' && !reason) return;
    await run(`check-${payment.id}`, () => updateCheckStatusApi(payment.id, { status, reason }), t('payments.success.checkMarked', { status: t(`financialOperations.checkStatuses.${status}`) }));
    await checksQuery.refetch();
  };

  const voidCheck = async (payment: any) => {
    const reason = window.prompt(t('financialOperations.voidReason'));
    if (!reason) return;
    await run(`check-${payment.id}`, () => voidPaymentApi(payment.id, reason), t('payments.success.voided'));
    await checksQuery.refetch();
  };

  const applyCredit = async () => {
    const amount = Number(creditAmount);
    if (!studentId || !(amount > 0)) return toast.error(t('financialOperations.selectStudentAmount'));
    if (!viewingYear) return;
    await run('credit', () => withAcademicYear(viewingYear, () => applyStudentCreditApi(studentId, amount)), t('financialOperations.creditApplied'));
    setCreditAmount('');
    await Promise.all([creditsQuery.refetch(), auditQuery.refetch()]);
  };

  const rolloverPayload = {
    fromYear,
    toYear,
    copyDiscounts,
    includeOneTimeFees,
    dryRun: true,
    idempotencyKey: rolloverKey,
  };

  const previewRollover = async () => {
    const result = await run('rollover-preview', () => withAcademicYear(toYear, () => previewRolloverApi(rolloverPayload)), t('financialOperations.previewCreated'));
    setRolloverRun(unwrap(result));
  };

  const commitRollover = async () => {
    if (!rolloverRun?.id) return toast.error(t('financialOperations.createPreviewFirst'));
    const result = await run('rollover-commit', () => withAcademicYear(toYear, () => commitRolloverApi({
      ...rolloverPayload,
      runId: rolloverRun.id,
      confirmSettingsUpdate: false,
    })), t('financialOperations.rolloverCompleted'));
    setRolloverRun(unwrap(result));
    setRolloverKey(crypto.randomUUID());
    await auditQuery.refetch();
  };

  return (
    <div className="h-full overflow-y-auto px-4 pb-8">
      <header className="mb-5 rounded-xl border bg-card p-5">
        <div className="mb-2 flex items-center justify-between">
          {/* This page predates NPageHeader and carries its own mobile sidebar trigger. */}
          <NButton
            type="button"
            variant="ghost"
            size="icon"
            className="-ms-2 lg:hidden"
            aria-label="Open sidebar"
            onClick={() => sidebar?.openMobile()}
          >
            <Menu size={18} />
          </NButton>
          <div className="ms-auto"><ViewingYearSelector /></div>
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{t('financialOperations.eyebrow')}</p>
        <h1 className="mt-1 text-2xl font-semibold">{t('financialOperations.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('financialOperations.description')}</p>
      </header>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title={t('financialOperations.checksTitle')} description={t('financialOperations.checksDescription')} icon={Activity} badge={checks.length || null}>
          <div className="max-h-[28rem] space-y-2 overflow-y-auto pr-1">
            {checks.length === 0 ? <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">{t('financialOperations.noChecks')}</p> : checks.map((payment: any) => (
              <div key={payment.id} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium">{payment.student?.name || payment.studentId}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${checkStatusBadge[payment.status] ?? 'bg-muted text-muted-foreground'}`}>{t(`financialOperations.checkStatuses.${payment.status}`)}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{payment.checkNumber} · {t('financialOperations.due', { date: payment.checkDueDate })}</p>
                  </div>
                  <p className="whitespace-nowrap font-semibold tabular-nums">{majorMoney(Number(payment.amount))}</p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 border-t pt-3">
                  {payment.status === 'pending' ? <NButton size="sm" disabled={busy === `check-${payment.id}`} onClick={() => changeCheckStatus(payment, 'deposited')}>{t('financialOperations.deposit')}</NButton> : null}
                  {payment.status === 'deposited' ? <NButton size="sm" disabled={busy === `check-${payment.id}`} onClick={() => changeCheckStatus(payment, 'completed')}>{t('financialOperations.complete')}</NButton> : null}
                  <NButton size="sm" variant="outline" onClick={() => changeCheckStatus(payment, 'bounced')}>{t('financialOperations.bounce')}</NButton>
                  <NButton size="sm" variant="destructive" onClick={() => voidCheck(payment)}>{t('financialOperations.void')}</NButton>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title={t('financialOperations.creditTitle')} description={t('financialOperations.creditDescription')} icon={Banknote}>
          <p className="mb-3 text-sm text-muted-foreground">{t('financialOperations.creditScope', { year: viewingYear ?? t('financialOperations.selectedYear') })}</p>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,150px)]">
            <select className={inputClass} value={studentId} onChange={(event) => setStudentId(event.target.value)}>
              <option value="">{t('financialOperations.selectStudent')}</option>
              {students.map((student: any) => <option key={student.id} value={student.id}>{student.name} · {student.studentCode}</option>)}
            </select>
            <input className={inputClass} type="number" min="0.01" step="0.01" placeholder={t('financialOperations.amountPlaceholder')} value={creditAmount} onChange={(event) => setCreditAmount(event.target.value)} />
            <NButton className="sm:col-span-2" disabled={busy === 'credit' || isResolving} onClick={applyCredit}>{t('financialOperations.applyCredit')}</NButton>
          </div>
          <div className="mt-4 rounded-lg bg-muted/50 p-3">
            <p className="text-sm text-muted-foreground">{t('financialOperations.availableBalance')}</p>
            <p className="text-xl font-semibold">{majorMoney(availableCredit)}</p>
          </div>
        </Panel>

        <Panel title={t('financialOperations.rolloverTitle')} description={t('financialOperations.rolloverDescription')} icon={RotateCw}>
          <div className="grid gap-3 md:grid-cols-2">
            <input className={inputClass} value={fromYear} onChange={(event) => setFromYear(event.target.value)} placeholder="2025-2026" />
            <input className={inputClass} value={toYear} onChange={(event) => setToYear(event.target.value)} placeholder="2026-2027" />
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={copyDiscounts} onChange={(event) => setCopyDiscounts(event.target.checked)} /> {t('financialOperations.copyDiscounts')}</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={includeOneTimeFees} onChange={(event) => setIncludeOneTimeFees(event.target.checked)} /> {t('financialOperations.includeOneTimeFees')}</label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <NButton variant="outline" disabled={busy === 'rollover-preview'} onClick={previewRollover}>{t('financialOperations.preview')}</NButton>
            <NButton disabled={!rolloverRun?.id || busy === 'rollover-commit'} onClick={commitRollover}>{t('financialOperations.commitPreview')}</NButton>
          </div>
          {rolloverRun?.preview ? (
            <pre className="mt-4 max-h-56 overflow-auto rounded-lg bg-muted p-3 text-xs">{JSON.stringify(rolloverRun.preview, null, 2)}</pre>
          ) : null}
        </Panel>

        <Panel title={t('financialOperations.notificationsTitle')} description={t('financialOperations.notificationsDescription')} icon={BellRing} badge={notifications.length || null}>
          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {notifications.length === 0 ? <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">{t('financialOperations.noNotifications')}</p> : notifications.map((item: any) => (
              <div key={item.id} className="rounded-lg border p-3 text-sm">
                <div className="flex justify-between gap-3"><span className="font-medium">{item.kind}</span><span className="text-muted-foreground">{item.businessDate}</span></div>
                <p className="mt-1 text-muted-foreground">{t('financialOperations.student')}: {item.studentId}</p>
              </div>
            ))}
          </div>
        </Panel>

        <section className="rounded-xl border bg-card p-5 shadow-sm xl:col-span-2">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-3"><div className="rounded-lg bg-primary/10 p-2 text-primary"><History className="h-5 w-5" /></div><div><h2 className="font-semibold">{t('financialOperations.auditTitle')}</h2><p className="text-sm text-muted-foreground">{t('financialOperations.auditDescription')}</p></div></div>
            <NButton size="sm" variant="outline" onClick={() => auditQuery.refetch()}><RefreshCw className="mr-2 h-4 w-4" />{t('common.refresh')}</NButton>
          </div>
          <div className="max-h-80 overflow-auto rounded-lg border">
            <table className="w-full text-left text-sm"><thead className="sticky top-0 bg-muted"><tr><th className="p-3">{t('common.actions')}</th><th className="p-3">{t('financialOperations.entity')}</th><th className="p-3">{t('financialOperations.actor')}</th><th className="p-3">{t('financialOperations.time')}</th></tr></thead><tbody>{auditEntries.map((entry: any) => <tr key={entry.id} className="border-t"><td className="p-3 font-medium">{auditLabel(entry.action)}</td><td className="p-3">{entry.entityType} · {entry.entityId}</td><td className="p-3">{entry.actorId || t('financialOperations.system')}</td><td className="p-3 text-muted-foreground">{entry.createdAt ? displayDateTime(entry.createdAt) : ''}</td></tr>)}</tbody></table>
          </div>
        </section>
      </div>
    </div>
  );
}
