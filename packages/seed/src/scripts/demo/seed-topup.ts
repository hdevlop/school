#!/usr/bin/env bun
// Tops up the current calendar month with recurring expenses, a payroll run,
// and late payments against pre-existing overdue installments — so finance
// KPIs ("this month" income/expenses) aren't stuck at 0 when the demo dataset
// was last seeded in an earlier month. New tuition installments are NOT
// generated — tuition is only billed Sep-Jun (see settings startMonth/
// endMonth) — but installments from those months can still be paid late,
// which is what this script simulates for the income side.

import { db } from '@server/database/db';
import { expenses, feeInstallments, fees, payments } from '@server/database/schema';
import { and, eq, gte, lte, sql } from 'drizzle-orm';
import { ExpenseService, PaymentService, PayrollService } from '@server/modules/seed';
import { runSeedTask } from '../shared/run-seed';
import { generateExpense } from '@/fakers/entities';
import * as fake from '@/fakers/fakers';
import { pickRandom } from '@/fakers/fakers';

const LATE_PAYMENT_METHODS = ['cash', 'bankTransfer', 'creditCard', 'debitCard', 'online'];

const RECURRING_CATEGORIES = ['rent', 'utilities', 'cleaning', 'security', 'transport'];
const VARIABLE_CATEGORIES = ['maintenance', 'supplies', 'equipment', 'food', 'marketing', 'training', 'technology', 'insurance', 'tax', 'miscellaneous'];

function monthBounds(year: number, month: number) {
  const start = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const end = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
}

// fake.expenseDate() picks any day 1-31 in the month, which can land after
// "today" for the current (still in-progress) month — that then fails the
// "payment date can't be before expense date" check once fake.paymentDate()
// clamps the payment to today. Cap the generated day at today's day-of-month.
function pastOrTodayDate(year: number, month: number, today: Date): string {
  const maxDay = today.getFullYear() === year && today.getMonth() === month
    ? today.getDate()
    : new Date(year, month + 1, 0).getDate();
  const day = fake.randomInt(1, maxDay);
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// Pay off a random slice of pre-existing overdue installments as of `today`,
// simulating late payments trickling in — one payment per paying student,
// dated today. Most overdue students are deliberately left unpaid so the
// Overdue Fees widget still has data.
async function seedLatePayments(paymentService: PaymentService, today: string) {
  const rows = await db
    .select({
      studentId: fees.studentId,
      feeId: feeInstallments.feeId,
      number: feeInstallments.number,
      amount: feeInstallments.amount,
      paidAmount: feeInstallments.paidAmount,
      dueDate: feeInstallments.dueDate,
    })
    .from(feeInstallments)
    .innerJoin(fees, eq(feeInstallments.feeId, fees.id))
    .where(
      and(
        lte(feeInstallments.dueDate, today),
        sql`${feeInstallments.amount} - ${feeInstallments.paidAmount} > 0`,
      ),
    );

  const byStudent = new Map<string, typeof rows>();
  for (const row of rows) {
    if (!byStudent.has(row.studentId)) byStudent.set(row.studentId, []);
    byStudent.get(row.studentId)!.push(row);
  }

  let paymentCount = 0;
  let studentsPaid = 0;

  for (const [studentId, installments] of byStudent) {
    // Most overdue accounts stay overdue — only a slice catches up now.
    if (Math.random() > 0.35) continue;

    const sorted = [...installments].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    const payFull = Math.random() < 0.6;
    const toPay = payFull ? sorted : sorted.slice(0, Math.ceil(sorted.length / 2));

    const allocations = toPay
      .map((inst) => ({
        feeId: inst.feeId,
        number: inst.number,
        amount: Math.round((Number(inst.amount) - Number(inst.paidAmount)) * 100) / 100,
      }))
      .filter((a) => a.amount > 0);

    if (allocations.length === 0) continue;
    const totalAmount = allocations.reduce((sum, a) => sum + a.amount, 0);
    if (totalAmount <= 0) continue;

    const method = pickRandom(LATE_PAYMENT_METHODS);
    try {
      await paymentService.record({
        studentId,
        amount: totalAmount,
        paymentDate: today,
        paymentMethod: method,
        transactionRef: ['bankTransfer', 'online'].includes(method)
          ? `TXN-${Math.random().toString(36).substring(2, 10).toUpperCase()}`
          : null,
        allocations,
        autoAllocate: false,
        keepRemainderAsCredit: false,
      });
      paymentCount++;
      studentsPaid++;
    } catch (e: any) {
      console.warn(`  ⚠️  Late payment skipped for student ${studentId}: ${e?.message}`);
    }
  }

  return { paymentCount, studentsPaid };
}

runSeedTask('finance top-up', async (server) => {
  const expenseService = await server.container.resolve(ExpenseService);
  const payrollService = await server.container.resolve(PayrollService);
  const paymentService = await server.container.resolve(PaymentService);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed
  const period = `${year}-${String(month + 1).padStart(2, '0')}`;
  const { start, end } = monthBounds(year, month);

  console.log(`🌱 Topping up finance data for ${period}...`);

  const [{ count }] = await db
    .select({ count: sql<string>`COUNT(*)` })
    .from(expenses)
    .where(and(gte(expenses.expenseDate, start), lte(expenses.expenseDate, end)));

  if (Number(count) > 0) {
    console.log(`⏭️  Expenses already exist for ${period} (${count} rows) — skipping expense generation.`);
  } else {
    const generated = [
      ...RECURRING_CATEGORIES.map((cat) =>
        generateExpense({ category: cat, expenseDate: pastOrTodayDate(year, month, now), status: 'paid' }),
      ),
      ...Array.from({ length: fake.randomInt(2, 5) }, () => {
        const cat = pickRandom(VARIABLE_CATEGORIES);
        const status = Math.random() < 0.85 ? 'paid' : 'approved';
        return generateExpense({ category: cat, expenseDate: pastOrTodayDate(year, month, now), status });
      }),
    ];
    const created = await expenseService.seedDemoExpenses(generated);
    console.log(`✅ Expenses seeded for ${period} (${created.length} records)`);
  }

  const payrollResult = await payrollService.runPayroll({ period });
  const paymentDate = `${period}-28`;
  let paidCount = 0;
  for (const [index, payslip] of payrollResult.created.entries()) {
    if (index % 3 === 0) continue;
    await payrollService.pay(payslip.id, {
      paymentMethod: 'bankTransfer',
      paymentDate,
      transactionRef: `PAYROLL-${period}-${String(index + 1).padStart(3, '0')}`,
      notes: 'Generated demo payroll payment.',
    });
    paidCount++;
  }
  console.log(`✅ Payroll for ${period} (${payrollResult.createdCount} payslips generated, ${paidCount} paid, ${payrollResult.skippedCount} already existed)`);

  const todayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const [{ count: existingLatePayments }] = await db
    .select({ count: sql<string>`COUNT(*)` })
    .from(payments)
    .where(and(gte(payments.paymentDate, start), lte(payments.paymentDate, end)));

  if (Number(existingLatePayments) > 0) {
    console.log(`⏭️  Payments already exist for ${period} (${existingLatePayments} rows) — skipping late-payment generation.`);
  } else {
    const { paymentCount, studentsPaid } = await seedLatePayments(paymentService, todayStr);
    console.log(`✅ Late payments seeded (${paymentCount} payments across ${studentsPaid} students, dated ${todayStr})`);
  }

  console.log('\n✨ Finance top-up completed successfully!');
});
