'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { NButton } from 'najm-kit';
import { toast } from 'sonner';
import { Activity, Banknote, BellRing, History, RefreshCw, RotateCw } from 'lucide-react';
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
import { formatMAD } from '@/lib/format';

const unwrap = (value: any) => value?.data?.data ?? value?.data ?? value;
const list = (value: any) => {
  const payload = unwrap(value);
  return Array.isArray(payload) ? payload : payload?.items ?? [];
};

function Panel({ title, description, icon: Icon, badge, action, children }: any) {
  return (
    <section className="flex flex-col rounded-xl border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary"><Icon className="h-5 w-5" /></div>
          <div>
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

const inputClass = 'h-10 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30';

export default function FinancialOperationsPage() {
  const [studentId, setStudentId] = useState('');
  const [creditAmount, setCreditAmount] = useState('');
  const [fromYear, setFromYear] = useState('2025-2026');
  const [toYear, setToYear] = useState('2026-2027');
  const [copyDiscounts, setCopyDiscounts] = useState(false);
  const [includeOneTimeFees, setIncludeOneTimeFees] = useState(false);
  const [confirmSettingsUpdate, setConfirmSettingsUpdate] = useState(false);
  const [rolloverKey, setRolloverKey] = useState(() => crypto.randomUUID());
  const [rolloverRun, setRolloverRun] = useState<any>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const studentsQuery = useQuery({ queryKey: ['students', 'financial-operations'], queryFn: getStudentsApi });
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
      toast.error(error?.message || 'Financial operation failed');
      throw error;
    } finally {
      setBusy(null);
    }
  };

  const changeCheckStatus = async (payment: any, status: 'deposited' | 'completed' | 'bounced') => {
    const reason = status === 'bounced' ? window.prompt('Reason for bounced check') : undefined;
    if (status === 'bounced' && !reason) return;
    await run(`check-${payment.id}`, () => updateCheckStatusApi(payment.id, { status, reason }), `Check marked ${status}`);
    await checksQuery.refetch();
  };

  const voidCheck = async (payment: any) => {
    const reason = window.prompt('Reason for voiding this payment');
    if (!reason) return;
    await run(`check-${payment.id}`, () => voidPaymentApi(payment.id, reason), 'Payment voided');
    await checksQuery.refetch();
  };

  const applyCredit = async () => {
    const amount = Number(creditAmount);
    if (!studentId || !(amount > 0)) return toast.error('Select a student and enter an amount');
    await run('credit', () => applyStudentCreditApi(studentId, amount), 'Student credit applied');
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
    const result = await run('rollover-preview', () => previewRolloverApi(rolloverPayload), 'Rollover preview created');
    setRolloverRun(unwrap(result));
  };

  const commitRollover = async () => {
    if (!rolloverRun?.id) return toast.error('Create a preview first');
    const result = await run('rollover-commit', () => commitRolloverApi({
      ...rolloverPayload,
      runId: rolloverRun.id,
      confirmSettingsUpdate,
    }), 'Rollover completed');
    setRolloverRun(unwrap(result));
    setRolloverKey(crypto.randomUUID());
    await auditQuery.refetch();
  };

  return (
    <div className="h-full overflow-y-auto px-4 pb-8">
      <header className="mb-5 rounded-xl border bg-card p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Financial controls</p>
        <h1 className="mt-1 text-2xl font-semibold">Operations and reconciliation</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage check settlement, unapplied credit, audit history, delivery runs, and academic-year rollover.</p>
      </header>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Checks awaiting settlement" description="Pending checks reserve balances until completion or release." icon={Activity} badge={checks.length || null}>
          <div className="max-h-[28rem] space-y-2 overflow-y-auto pr-1">
            {checks.length === 0 ? <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No pending or deposited checks.</p> : checks.map((payment: any) => (
              <div key={payment.id} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium">{payment.student?.name || payment.studentId}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${checkStatusBadge[payment.status] ?? 'bg-muted text-muted-foreground'}`}>{payment.status}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{payment.checkNumber} · due {payment.checkDueDate}</p>
                  </div>
                  <p className="whitespace-nowrap font-semibold tabular-nums">{formatMAD(Number(payment.amount))}</p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 border-t pt-3">
                  {payment.status === 'pending' ? <NButton size="sm" disabled={busy === `check-${payment.id}`} onClick={() => changeCheckStatus(payment, 'deposited')}>Deposit</NButton> : null}
                  {payment.status === 'deposited' ? <NButton size="sm" disabled={busy === `check-${payment.id}`} onClick={() => changeCheckStatus(payment, 'completed')}>Complete</NButton> : null}
                  <NButton size="sm" variant="outline" onClick={() => changeCheckStatus(payment, 'bounced')}>Bounce</NButton>
                  <NButton size="sm" variant="destructive" onClick={() => voidCheck(payment)}>Void</NButton>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Student credit" description="Apply settled unapplied funds to the oldest available installments." icon={Banknote}>
          <div className="grid gap-3 md:grid-cols-[1fr_150px_auto]">
            <select className={inputClass} value={studentId} onChange={(event) => setStudentId(event.target.value)}>
              <option value="">Select student</option>
              {students.map((student: any) => <option key={student.id} value={student.id}>{student.name} · {student.studentCode}</option>)}
            </select>
            <input className={inputClass} type="number" min="0.01" step="0.01" placeholder="Amount" value={creditAmount} onChange={(event) => setCreditAmount(event.target.value)} />
            <NButton disabled={busy === 'credit'} onClick={applyCredit}>Apply credit</NButton>
          </div>
          <div className="mt-4 rounded-lg bg-muted/50 p-3">
            <p className="text-sm text-muted-foreground">Available balance</p>
            <p className="text-xl font-semibold">{formatMAD(availableCredit)}</p>
          </div>
        </Panel>

        <Panel title="Academic-year rollover" description="Preview from actual prior-year assignments before writing any target-year fees." icon={RotateCw}>
          <div className="grid gap-3 md:grid-cols-2">
            <input className={inputClass} value={fromYear} onChange={(event) => setFromYear(event.target.value)} placeholder="2025-2026" />
            <input className={inputClass} value={toYear} onChange={(event) => setToYear(event.target.value)} placeholder="2026-2027" />
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={copyDiscounts} onChange={(event) => setCopyDiscounts(event.target.checked)} /> Copy discounts</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={includeOneTimeFees} onChange={(event) => setIncludeOneTimeFees(event.target.checked)} /> Include one-time fees</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={confirmSettingsUpdate} onChange={(event) => setConfirmSettingsUpdate(event.target.checked)} /> Update current academic year after success</label>
          </div>
          <div className="mt-4 flex gap-2">
            <NButton variant="outline" disabled={busy === 'rollover-preview'} onClick={previewRollover}>Preview</NButton>
            <NButton disabled={!rolloverRun?.id || busy === 'rollover-commit'} onClick={commitRollover}>Commit preview</NButton>
          </div>
          {rolloverRun?.preview ? (
            <pre className="mt-4 max-h-56 overflow-auto rounded-lg bg-muted p-3 text-xs">{JSON.stringify(rolloverRun.preview, null, 2)}</pre>
          ) : null}
        </Panel>

        <Panel title="Notification delivery log" description="Idempotent overdue and check-due delivery claims." icon={BellRing} badge={notifications.length || null}>
          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {notifications.length === 0 ? <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No delivery claims yet.</p> : notifications.map((item: any) => (
              <div key={item.id} className="rounded-lg border p-3 text-sm">
                <div className="flex justify-between gap-3"><span className="font-medium">{item.kind}</span><span className="text-muted-foreground">{item.businessDate}</span></div>
                <p className="mt-1 text-muted-foreground">Student: {item.studentId}</p>
              </div>
            ))}
          </div>
        </Panel>

        <section className="rounded-xl border bg-card p-5 shadow-sm xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-start gap-3"><div className="rounded-lg bg-primary/10 p-2 text-primary"><History className="h-5 w-5" /></div><div><h2 className="font-semibold">Financial audit history</h2><p className="text-sm text-muted-foreground">Append-only records for money mutations.</p></div></div>
            <NButton size="sm" variant="outline" onClick={() => auditQuery.refetch()}><RefreshCw className="mr-2 h-4 w-4" />Refresh</NButton>
          </div>
          <div className="max-h-80 overflow-auto rounded-lg border">
            <table className="w-full text-left text-sm"><thead className="sticky top-0 bg-muted"><tr><th className="p-3">Action</th><th className="p-3">Entity</th><th className="p-3">Actor</th><th className="p-3">Time</th></tr></thead><tbody>{auditEntries.map((entry: any) => <tr key={entry.id} className="border-t"><td className="p-3 font-medium">{entry.action}</td><td className="p-3">{entry.entityType} · {entry.entityId}</td><td className="p-3">{entry.actorId || 'system'}</td><td className="p-3 text-muted-foreground">{entry.createdAt ? new Date(entry.createdAt).toLocaleString() : ''}</td></tr>)}</tbody></table>
          </div>
        </section>
      </div>
    </div>
  );
}
