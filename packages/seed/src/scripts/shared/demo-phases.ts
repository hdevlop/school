import { db } from '@sms/server/database';
import { roles, staffRoles, users } from '@sms/server/database/schema';
import { eq } from 'drizzle-orm';
import type {
  BehaviorRewardService,
  DisciplineService,
  FeeService,
  PaymentService,
  PayrollService,
} from '@sms/server/modules/seed';
import { getDemoReferenceDate } from './academic-year';

// Phases shared by the single-year demo seed and the history seed's later years.

// Enrollment, transition, rollover and expense approval records name the account that made them.
export async function findAdministratorId() {
  const [admin] = await db.select({ id: users.id }).from(users)
    .innerJoin(roles, eq(users.roleId, roles.id))
    .where(eq(roles.name, 'admin'))
    .limit(1);
  if (!admin) throw new Error('The demo seed needs an administrator account: run bun seed admin first');
  return admin.id;
}

const STAFF_ROLE_DATA = [
  { code: 'teacher', label: 'Teacher', labels: { fr: 'Enseignant', ar: 'أستاذ', es: 'Profesor' }, category: 'teaching', sortOrder: 10, isSystem: true },
  { code: 'driver', label: 'Driver', labels: { fr: 'Chauffeur', ar: 'سائق', es: 'Conductor' }, category: 'transport', sortOrder: 20, isSystem: true },
  { code: 'busAssistant', label: 'Bus Assistant', labels: { fr: 'Assistant de bus', ar: 'مساعد الحافلة', es: 'Auxiliar de bus' }, category: 'transport', sortOrder: 21, isSystem: false },
  { code: 'principal', label: 'Principal', labels: { fr: 'Directeur', ar: 'مدير', es: 'Director' }, category: 'administration', sortOrder: 30, isSystem: false },
  { code: 'secretary', label: 'Secretary', labels: { fr: 'Secrétaire', ar: 'سكرتير', es: 'Secretario' }, category: 'administration', sortOrder: 31, isSystem: false },
  { code: 'receptionist', label: 'Receptionist', labels: { fr: 'Réceptionniste', ar: 'موظف الاستقبال', es: 'Recepcionista' }, category: 'administration', sortOrder: 32, isSystem: false },
  { code: 'accountant', label: 'Accountant', labels: { fr: 'Comptable', ar: 'محاسب', es: 'Contable' }, category: 'administration', sortOrder: 33, isSystem: false },
  { code: 'librarian', label: 'Librarian', labels: { fr: 'Bibliothécaire', ar: 'أمين المكتبة', es: 'Bibliotecario' }, category: 'support', sortOrder: 40, isSystem: false },
  { code: 'itSupport', label: 'IT Support', labels: { fr: 'Support informatique', ar: 'دعم تقني', es: 'Soporte informático' }, category: 'support', sortOrder: 41, isSystem: false },
  { code: 'assistant', label: 'Assistant', labels: { fr: 'Assistant', ar: 'مساعد', es: 'Asistente' }, category: 'support', sortOrder: 42, isSystem: false },
  { code: 'cleaner', label: 'Cleaner', labels: { fr: "Agent d'entretien", ar: 'عامل النظافة', es: 'Personal de limpieza' }, category: 'operations', sortOrder: 50, isSystem: false },
  { code: 'security', label: 'Security', labels: { fr: 'Agent de sécurité', ar: 'حارس الأمن', es: 'Seguridad' }, category: 'operations', sortOrder: 51, isSystem: false },
  { code: 'other', label: 'Other', labels: { fr: 'Autre', ar: 'آخر', es: 'Otro' }, category: 'support', sortOrder: 99, isSystem: false },
];

export async function seedStaffRoles() {
  for (const role of STAFF_ROLE_DATA) {
    await db
      .insert(staffRoles)
      .values({
        code: role.code,
        label: role.label,
        labels: role.labels,
        category: role.category,
        sortOrder: role.sortOrder,
        isSystem: role.isSystem,
        active: true,
      })
      .onConflictDoUpdate({
        target: staffRoles.code,
        set: {
          label: role.label,
          labels: role.labels,
          category: role.category,
          sortOrder: role.sortOrder,
          isSystem: role.isSystem,
          active: true,
        },
      });
  }
  return STAFF_ROLE_DATA.length;
}

/** Fees go through FeeService's own amount and date rules, once per student, year and type. */
export function normalizeDemoFees(fees: any[]) {
  const normalized = fees.map((fee: any) => ({
    ...fee,
    baseAmount: undefined,
    grossAmount: undefined,
    netAmount: undefined,
    paidAmount: undefined,
    status: undefined,
    // Let FeeService resolve the effective date per student from their
    // enrollment date (max of enrollmentDate and academic-year start), so
    // mid-year enrollees don't fail the "billable enrollment period" rule.
    effectiveDate: undefined,
  }));
  return Array.from(
    new Map(normalized.map((fee: any) => [`${fee.studentId}:${fee.academicYear}:${fee.feeTypeId}`, fee])).values(),
  );
}

// ─────────────────────────────────────────────
// PAYMENT SEEDING
// Runs after fees + installments are created.
// Groups fees by student so one payment record
// covers all of a student's paid installments.
//
// Scenarios (per student):
//   80% → pay every past-due installment (partiallyPaid mid-year, paid if all done)
//   12% → pay first half of past-due installments (partiallyPaid)
//    8% → no payment (overdue)
// Tuned so collected tuition (~87% of billed) comfortably clears monthly
// payroll — a realistic school economy, not the old 55%-collection demo where
// paid payroll always outran collected income on the Income-vs-Expenses chart.
// A cheque counts as income only once cleared, so every cheque is deposited
// and cleared a few days after it is received, as long as that day has come.
// Left pending, the roughly one in six cheque payments dropped a past year's
// collection to ~70% and its expenses above its income.
// ─────────────────────────────────────────────

const PAYMENT_METHODS = ['cash', 'bankTransfer', 'check', 'creditCard', 'debitCard', 'online'];
const COMPLETED_PAYMENT_METHODS = ['cash', 'bankTransfer', 'creditCard', 'debitCard', 'online'];
const LATE_SUMMER_PAYMENT_CAP = 25_000;
const LATE_SUMMER_PAYMENT_RATE = 0.04;

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getMonthKey(dateStr: string) {
  return dateStr.slice(0, 7); // "YYYY-MM"
}

function addDays(dateStr: string, days: number) {
  const date = new Date(`${dateStr}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

// The bank clears a cheque 2–6 days after it is received, well before its due date.
async function clearCheque(paymentService: PaymentService, payment: { id: string; paymentDate: string }, today: string) {
  const clearedOn = addDays(payment.paymentDate, 2 + Math.floor(Math.random() * 5));
  if (clearedOn > today) return false;
  await paymentService.updateCheckStatus(payment.id, { status: 'deposited' });
  await paymentService.updateCheckStatus(payment.id, { status: 'completed', settledDate: clearedOn });
  return true;
}

function getLateSummerPaymentDate(today: string) {
  const now = new Date(`${today}T00:00:00`);
  const year = now.getFullYear();
  const month = now.getMonth();
  if (month === 6 || month === 7) return today;
  if (month > 7) return `${year}-07-02`;
  return today;
}

function getFirstUnpaidPastDueInstallment(studentData: any, cutoffDate: string) {
  const candidates = [];

  for (const fee of studentData.fees ?? []) {
    for (const inst of (fee.installments as any[]) ?? []) {
      if (inst.dueDate > cutoffDate) continue;
      const amount = Number(inst.amount ?? 0);
      const paidAmount = Number(inst.paidAmount ?? 0);
      const remaining = Math.round((amount - paidAmount) * 100) / 100;
      if (remaining <= 0) continue;
      candidates.push({
        feeId: fee.id,
        number: inst.number,
        dueDate: inst.dueDate,
        amount: remaining,
      });
    }
  }

  return candidates.sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
}

export function createProgressLogger(label: string, total: number, stepPercent = 5) {
  const stepCount = Math.max(1, Math.ceil(total * stepPercent / 100));
  let lastLoggedPercent = -stepPercent;

  return (processed: number, details = '') => {
    const percent = total === 0 ? 100 : Math.floor((processed / total) * 100);
    const shouldLog =
      processed === 0 ||
      processed === total ||
      processed % stepCount === 0 ||
      percent >= lastLoggedPercent + stepPercent;

    if (!shouldLog) return;

    lastLoggedPercent = percent;
    const suffix = details ? ` - ${details}` : '';
    console.log(`  ${label}: ${String(percent).padStart(3, ' ')}% (${processed}/${total})${suffix}`);
  };
}

/** Numbered, timed phases with a heartbeat for long ones. */
export function createPhaseRunner(totalPhases: number) {
  let completed = 0;
  async function seedPhase<T>(label: string, task: () => Promise<T>): Promise<T> {
    const phase = completed + 1;
    const startedAt = performance.now();
    console.log(`  [${phase}/${totalPhases}] ${label}: starting`);
    const heartbeat = setInterval(() => {
      const elapsedSeconds = Math.floor((performance.now() - startedAt) / 1000);
      console.log(`  [${phase}/${totalPhases}] ${label}: still running (${elapsedSeconds}s)`);
    }, 15_000);

    try {
      const result = await task();
      completed++;
      const percent = Math.round(completed / totalPhases * 100);
      const elapsedSeconds = ((performance.now() - startedAt) / 1000).toFixed(1);
      console.log(`  [${completed}/${totalPhases}] ${percent}% complete: ${label} (${elapsedSeconds}s)`);
      return result;
    } catch (error) {
      console.error(`  [${phase}/${totalPhases}] ${label}: failed`);
      throw error;
    } finally {
      clearInterval(heartbeat);
    }
  }
  seedPhase.skipTo = (phase: number) => { completed = phase; };
  return seedPhase;
}

export async function seedPayments(
  feeService: FeeService,
  paymentService: PaymentService,
  seededStudentIds: Set<string>,
  academicYear: string,
) {
  // Only the selected year's students created by this run receive demo payments.
  const studentRows = (await feeService.getAll()).filter((row) => seededStudentIds.has(row.student.id));
  const today = getDemoReferenceDate(academicYear).toISOString().split('T')[0];
  const lateSummerPaymentDate = getLateSummerPaymentDate(today);
  const lateSummerPaymentLimit = Math.max(1, Math.ceil(studentRows.length * LATE_SUMMER_PAYMENT_RATE));

  let paymentCount = 0;
  let clearedChequeCount = 0;
  let skippedCount = 0;
  let latePaymentCount = 0;
  let latePaymentTotal = 0;
  const skippedStudentIds: string[] = [];
  const logPaymentProgress = createProgressLogger('Payment seeding', studentRows.length);
  logPaymentProgress(0, 'created 0, skipped 0');

  for (const [index, row] of studentRows.entries()) {
    const studentId = row.student.id;
    try {
      const scenario = Math.random();

      // 8% of students -> no payment, fees remain overdue
      if (scenario < 0.08) {
        skippedCount++;
        skippedStudentIds.push(studentId);
        continue;
      }

      // Fetch only the selected year's fees and installments.
      const studentData = await feeService.getByStudent(studentId);
      if (!studentData) continue;

      // Collect all installments to pay, keyed by their due-date month
      const byMonth = new Map<string, { feeId: string; number: number; amount: number; dueDate: string }[]>();

      for (const fee of studentData.fees) {
        const installments: any[] = (fee.installments as any[]) ?? [];
        const pastDue = installments
          .filter((i: any) => i.dueDate <= today)
          .sort((a: any, b: any) => a.number - b.number);

        if (pastDue.length === 0) continue;

        // 12% partially paid -> pay only the first half of past-due installments
        // 80% fully paid -> pay all past-due installments
        const toPay = scenario < 0.20
          ? pastDue.slice(0, Math.ceil(pastDue.length / 2))
          : pastDue;

        for (const inst of toPay) {
          const amount = Number(inst.amount);
          // Skip zero-amount installments (e.g. 100%-discounted fees) — the
          // payment validator rejects allocations with amount <= 0.
          if (!(amount > 0)) continue;
          const monthKey = getMonthKey(inst.dueDate);
          if (!byMonth.has(monthKey)) byMonth.set(monthKey, []);
          byMonth.get(monthKey)!.push({
            feeId: fee.id,
            number: inst.number,
            amount,
            dueDate: inst.dueDate,
          });
        }
      }

      if (byMonth.size === 0) continue;

      // Create one payment per month so income distributes across the chart
      for (const [, monthInstallments] of byMonth) {
        const allocations = monthInstallments.map(({ feeId, number, amount }) => ({ feeId, number, amount }));
        const totalAmount = allocations.reduce((sum, a) => sum + a.amount, 0);
        if (totalAmount <= 0) continue;

        const method = pick(PAYMENT_METHODS);
        const paymentDate = monthInstallments.map(i => i.dueDate).sort().at(-1) ?? today;

        try {
          const payment = await paymentService.record({
            studentId,
            amount: totalAmount,
            paymentDate,
            paymentMethod: method,
            checkNumber: method === 'check' ? `CHK-${Math.random().toString().substring(2, 8)}` : null,
            checkDueDate: method === 'check' ? addDays(paymentDate, 30) : null,
            checkBank: method === 'check' ? 'Attijariwafa Bank' : null,
            transactionRef: ['bankTransfer', 'online'].includes(method)
              ? `TXN-${Math.random().toString(36).substring(2, 10).toUpperCase()}`
              : null,
            allocations,
            autoAllocate: false,
            keepRemainderAsCredit: false,
          });
          paymentCount++;
          if (method === 'check') {
            try {
              if (await clearCheque(paymentService, payment, today)) clearedChequeCount++;
            } catch (e: any) {
              console.warn(`  ⚠️  Cheque ${payment.id} left pending: ${e?.message}`);
            }
          }
        } catch (e: any) {
          console.warn(`  ⚠️  Payment skipped for student ${studentId}: ${e?.message}`);
          if (e?.stack) console.warn(e.stack);
          continue;
        }
      }
    } finally {
      logPaymentProgress(index + 1, `created ${paymentCount}, skipped ${skippedCount}`);
    }
  }

  const lateCandidates = [...skippedStudentIds].sort(() => Math.random() - 0.5);
  const logLateProgress = createProgressLogger('Late-payment pass', lateCandidates.length, 10);
  logLateProgress(0, `created ${latePaymentCount}/${lateSummerPaymentLimit}, total ${latePaymentTotal} MAD`);

  for (const [index, studentId] of lateCandidates.entries()) {
    if (latePaymentCount >= lateSummerPaymentLimit || latePaymentTotal >= LATE_SUMMER_PAYMENT_CAP) break;

    try {
      const studentData = await feeService.getByStudent(studentId);
      if (!studentData) continue;

      const installment = getFirstUnpaidPastDueInstallment(studentData, lateSummerPaymentDate);
      if (!installment) continue;

      const remainingCap = Math.round((LATE_SUMMER_PAYMENT_CAP - latePaymentTotal) * 100) / 100;
      const amount = Math.min(installment.amount, remainingCap);
      if (amount <= 0) continue;

      const method = pick(COMPLETED_PAYMENT_METHODS);
      try {
        await paymentService.record({
          studentId,
          amount,
          paymentDate: lateSummerPaymentDate,
          paymentMethod: method,
          checkNumber: null,
          transactionRef: ['bankTransfer', 'online'].includes(method)
            ? `LATE-${Math.random().toString(36).substring(2, 10).toUpperCase()}`
            : null,
          allocations: [{ feeId: installment.feeId, number: installment.number, amount }],
          autoAllocate: false,
          keepRemainderAsCredit: false,
          notes: 'Late summer catch-up payment for an overdue installment.',
        });
        latePaymentCount++;
        latePaymentTotal = Math.round((latePaymentTotal + amount) * 100) / 100;
        paymentCount++;
      } catch (e: any) {
        console.warn(`  ⚠️  Late payment skipped for student ${studentId}: ${e?.message}`);
        continue;
      }
    } finally {
      logLateProgress(index + 1, `created ${latePaymentCount}/${lateSummerPaymentLimit}, total ${latePaymentTotal} MAD`);
    }
  }

  return { paymentCount, clearedChequeCount, skippedCount, latePaymentCount, latePaymentTotal };
}

export async function createSequential<T>(label: string, items: T[], create: (item: T) => Promise<any>) {
  const created = [];
  const logProgress = createProgressLogger(label, items.length, 10);
  logProgress(0, 'created 0, skipped 0');
  for (const [index, item] of items.entries()) {
    try {
      created.push(await create(item));
    } catch (error: any) {
      console.warn(`  ⚠️  Seed item skipped: ${error?.message || error}`);
    } finally {
      logProgress(index + 1, `created ${created.length}, skipped ${index + 1 - created.length}`);
    }
  }
  return created;
}

export async function createRequiredSequential<T extends { studentId: string }>(items: T[], create: (item: T) => Promise<any>) {
  const created = [];
  const failures: unknown[] = [];
  const logProgress = createProgressLogger('Student routes', items.length, 10);
  logProgress(0, 'created 0, failed 0');
  for (const [index, item] of items.entries()) {
    try {
      created.push(await create(item));
    } catch (error) {
      failures.push(error);
      console.error(`  Student route failed for ${item.studentId}: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      logProgress(index + 1, `created ${created.length}, failed ${failures.length}`);
    }
  }
  if (failures.length > 0) {
    throw new AggregateError(failures, `${failures.length}/${items.length} student routes failed to seed`);
  }
  return created;
}

export async function seedConductRecords(
  disciplineService: DisciplineService,
  behaviorRewardService: BehaviorRewardService,
  teachers: any[],
  disciplineIncidentsData: any[],
  behaviorRewardsData: any[],
) {
  const teachersById = new Map(teachers.map((teacher: any) => [teacher.id, teacher]));
  let disciplineCount = 0;
  let resolvedCount = 0;
  let rewardCount = 0;
  const logDisciplineProgress = createProgressLogger('Discipline incidents', disciplineIncidentsData.length, 10);
  logDisciplineProgress(0, 'created 0');

  for (const [index, item] of disciplineIncidentsData.entries()) {
    const teacher = teachersById.get(item.teacherId) as any;
    if (teacher?.userId) {
      const { teacherId: _teacherId, resolution, ...input } = item;
      try {
        const incident = await disciplineService.create(input as any, {
          id: teacher.userId,
          role: 'teacher',
        });
        disciplineCount++;

        if (resolution && incident?.id) {
          await disciplineService.resolve(incident.id, resolution as any, {
            id: teacher.userId,
            role: 'teacher',
          });
          resolvedCount++;
        }
      } catch (error: any) {
        console.warn(`  ⚠️  Discipline seed skipped for student ${item.studentId}: ${error?.message || error}`);
      }
    }
    logDisciplineProgress(index + 1, `created ${disciplineCount}, resolved ${resolvedCount}`);
  }

  const logRewardProgress = createProgressLogger('Behavior rewards', behaviorRewardsData.length, 10);
  logRewardProgress(0, 'created 0');
  for (const [index, item] of behaviorRewardsData.entries()) {
    const teacher = teachersById.get(item.teacherId) as any;
    if (teacher?.userId) {
      const { teacherId: _teacherId, ...input } = item;
      try {
        await behaviorRewardService.create(input as any, {
          id: teacher.userId,
          role: 'teacher',
        });
        rewardCount++;
      } catch (error: any) {
        console.warn(`  ⚠️  Behavior reward seed skipped for student ${item.studentId}: ${error?.message || error}`);
      }
    }
    logRewardProgress(index + 1, `created ${rewardCount}`);
  }

  return { disciplineCount, resolvedCount, rewardCount };
}

export async function seedUniqueFees(feeService: FeeService, fees: any[]) {
  const createdFees = [];
  const knownKeysByStudent = new Map<string, Set<string>>();
  let skippedFees = 0;
  const logFeeProgress = createProgressLogger('Fees + installments', fees.length);
  logFeeProgress(0, 'created 0, skipped 0');

  for (const [index, fee] of fees.entries()) {
    try {
      let knownKeys = knownKeysByStudent.get(fee.studentId);
      if (!knownKeys) {
        const existing = await feeService.getByStudentAllYears(fee.studentId);
        knownKeys = new Set(
          (existing?.fees || []).map((existingFee: any) =>
            `${existingFee.academicYear}:${existingFee.feeTypeId}`,
          ),
        );
        knownKeysByStudent.set(fee.studentId, knownKeys);
      }

      const key = `${fee.academicYear}:${fee.feeTypeId}`;
      if (knownKeys.has(key)) {
        skippedFees++;
        continue;
      }

      const createdFee = await feeService.create(fee);
      createdFees.push(createdFee);
      knownKeys.add(key);
    } finally {
      logFeeProgress(index + 1, `created ${createdFees.length}, skipped ${skippedFees}`);
    }
  }

  return createdFees;
}

/** The demo's today for the teaching year that holds a `YYYY-MM` payroll period. */
function payrollToday(period: string) {
  const year = Number(period.slice(0, 4));
  const startYear = Number(period.slice(5, 7)) >= 9 ? year : year - 1;
  return getDemoReferenceDate(`${startYear}-${startYear + 1}`).toISOString().split('T')[0];
}

export async function seedPayroll(payrollService: PayrollService, periods: string[], staffIds: Set<string>) {
  let createdCount = 0;
  let paidCount = 0;
  const logPayrollProgress = createProgressLogger('Payroll periods', periods.length, 10);
  logPayrollProgress(0, 'created 0 payslips, paid 0');

  for (const [periodIndex, period] of periods.entries()) {
    try {
      const result = await payrollService.runPayrollForSeed({ period }, staffIds);
      createdCount += result.createdCount;

      // Staff are paid on the 28th; a payday still ahead of the demo's today
      // leaves that month's payslips pending instead of booking future cash out.
      const paymentDate = `${period}-28`;
      const isPayday = paymentDate <= payrollToday(period);
      const logPayslipProgress = createProgressLogger(`Payroll ${period} payments`, result.created.length, 25);
      logPayslipProgress(0, `paid ${paidCount}`);

      for (const [index, payslip] of result.created.entries()) {
        if (isPayday) {
          await payrollService.pay(payslip.id, {
            paymentMethod: 'bankTransfer',
            paymentDate,
            transactionRef: `PAYROLL-${period}-${String(index + 1).padStart(3, '0')}`,
            notes: 'Generated demo payroll payment.',
          });
          paidCount++;
        }
        logPayslipProgress(index + 1, `paid ${paidCount}`);
      }
    } finally {
      logPayrollProgress(periodIndex + 1, `created ${createdCount} payslips, paid ${paidCount}`);
    }
  }

  return { createdCount, paidCount };
}
