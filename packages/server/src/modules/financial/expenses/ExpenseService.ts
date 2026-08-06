import { Service, Transaction } from '@server/najm';
import { ExpenseRepository } from './ExpenseRepository';
import { ExpenseValidator } from './ExpenseValidator';
import { formatDate, pickProps } from '@server/shared'
import { getAcademicYearDateRange } from '../utils';
import type { CreateExpenseDto, ExpenseApprovalDto, ExpensePaymentDto, UpdateExpenseDto } from './ExpenseDto';
import { FinancialAuditService } from '../auditLog/FinancialAuditService';

@Service()
export class ExpenseService {

  constructor(
    private expenseRepository: ExpenseRepository,
    private expenseValidator: ExpenseValidator,
    private auditService: FinancialAuditService,
  ) { }

  // ========== RETRIEVAL METHODS ==========

  async getAll() {
    return await this.expenseRepository.getAll();
  }

  async getToday() {
    const [expenses, summary] = await Promise.all([
      this.expenseRepository.getTodayExpenses(),
      this.expenseRepository.getTodayExpensesTotal(),
    ]);
    return { expenses, summary };
  }

  async getThisMonth() {
    const [expenses, summary] = await Promise.all([
      this.expenseRepository.getThisMonthExpenses(),
      this.expenseRepository.getThisMonthExpensesTotal(),
    ]);
    return { expenses, summary };
  }

  async getSummary() {
    return await this.expenseRepository.getSummary();
  }

  async getCount() {
    return await this.expenseRepository.getCount();
  }

  async getById(id: string) {
    await this.expenseValidator.checkExists(id);
    return await this.expenseRepository.getById(id);
  }

  async getByDateRange(startDate: string, endDate: string) {
    return await this.expenseRepository.getByDateRange(startDate, endDate);
  }

  async getByInvoiceNumber(invoiceNumber: string) {
    await this.expenseValidator.checkInvoiceNumberExists(invoiceNumber);
    return await this.expenseRepository.getByInvoiceNumber(invoiceNumber);
  }

  async getByReceiptNumber(receiptNumber: string) {
    await this.expenseValidator.checkReceiptNumberExists(receiptNumber);
    return await this.expenseRepository.getByReceiptNumber(receiptNumber);
  }

  async getByCheckNumber(checkNumber: string) {
    await this.expenseValidator.checkCheckNumberExists(checkNumber);
    return await this.expenseRepository.getByCheckNumber(checkNumber);
  }

  async getPendingApprovals() {
    return await this.expenseRepository.getPendingApprovals();
  }

  async getTotalExpenses() {
    const { startDate, endDate } = getAcademicYearDateRange();
    const result = await this.expenseRepository.getTotalExpensesByDateRange(startDate, endDate);
    return result.total;
  }

  // ========== CREATE-METHOD ==========

  @Transaction()
  async create(data: CreateExpenseDto, actorId?: string) {

    await this.expenseValidator.validate(data);

    const expenseDetails = {
      category: data.category,
      title: data.title,
      amount: data.amount,
      expenseDate: formatDate(data.expenseDate),
      paymentMethod: data.paymentMethod || null,
      paymentDate: data.paymentDate ? formatDate(data.paymentDate) : null,
      vendor: data.vendor || null,
      invoiceNumber: data.invoiceNumber || null,
      receiptNumber: data.receiptNumber || null,
      checkNumber: data.checkNumber || null,
      transactionRef: data.transactionRef || null,
      status: 'pending',
      notes: data.notes || null,
    };

    const created = await this.expenseRepository.create(expenseDetails);
    await this.auditService.record({
      entityType: 'expense', entityId: created.id, action: 'expense.created', actorId,
      before: null, after: created,
    });
    return created;
  }

  // ========== UPDATE-METHOD ==========

  @Transaction()
  async update(id: string, data: UpdateExpenseDto, actorId?: string) {

    const EXPENSE_UPDATE_KEYS = [
      'category', 'title', 'amount', 'expenseDate', 'paymentMethod', 'paymentDate',
      'vendor', 'invoiceNumber', 'receiptNumber', 'checkNumber', 'transactionRef',
      'status', 'notes'
    ];

    const existing = await this.expenseValidator.checkExists(id);
    await this.expenseValidator.validate(data, id);
    const expenseData = pickProps(data, EXPENSE_UPDATE_KEYS);
    const updated = await this.expenseRepository.update(id, expenseData);
    await this.auditService.record({
      entityType: 'expense', entityId: id, action: 'expense.updated', actorId,
      before: existing, after: updated, metadata: { changedFields: Object.keys(expenseData) },
    });
    return updated;
  }

  // ========== DELETE-METHODS ==========

  @Transaction()
  async delete(id: string, actorId?: string) {
    const existing = await this.expenseValidator.checkExists(id);
    const deleted = await this.expenseRepository.delete(id);
    await this.auditService.record({
      entityType: 'expense', entityId: id, action: 'expense.deleted', actorId,
      before: existing, after: null,
    });
    return deleted;
  }

  async clearForSeedReset() {
    return await this.expenseRepository.deleteAll();
  }

  // ========== APPROVAL-WORKFLOW ==========

  @Transaction()
  async approve(id, approvedBy: string) {
    const existing = await this.expenseValidator.checkExists(id);
    await this.expenseValidator.checkCanApprove(id);
    await this.expenseRepository.approve(id, approvedBy);
    const updated = await this.getById(id);
    await this.auditService.record({
      entityType: 'expense', entityId: id, action: 'expense.approved', actorId: approvedBy,
      before: existing, after: updated,
    });
    return updated;
  }

  @Transaction()
  async reject(id, approvedBy: string, rejectionReason: string) {
    const existing = await this.expenseValidator.checkExists(id);
    await this.expenseValidator.checkCanApprove(id);
    await this.expenseValidator.validateRejection(rejectionReason);
    await this.expenseRepository.reject(id, approvedBy, rejectionReason);
    const updated = await this.getById(id);
    await this.auditService.record({
      entityType: 'expense', entityId: id, action: 'expense.rejected', actorId: approvedBy,
      before: existing, after: updated, metadata: { rejectionReason },
    });
    return updated;
  }

  async handleApproval(id: string, data: ExpenseApprovalDto, userId: string) {
    const { action, rejectionReason } = data;

    await this.expenseValidator.validateApproval(data);

    if (action === 'approve') {
      return await this.approve(id, userId);
    } else if (action === 'reject') {
      return await this.reject(id, userId, rejectionReason);
    }
  }

  // ========== PAYMENT WORKFLOW ==========

  @Transaction()
  async recordPayment(id: string, data: ExpensePaymentDto, paidBy: string) {
    await this.expenseValidator.checkCanPay(id);

    const {
      paymentMethod,
      paymentDate,
      checkNumber,
      transactionRef,
      notes,
    } = data;

    await this.expenseValidator.validatePayment(data);

    const expense = await this.expenseRepository.getById(id);
    await this.expenseValidator.validatePaymentDate(paymentDate, expense.expenseDate);

    await this.expenseValidator.validateCheckPayment(paymentMethod, checkNumber);

    await this.expenseRepository.update(id, {
      paymentMethod,
      checkNumber: paymentMethod === 'check' ? checkNumber : null,
      transactionRef: transactionRef || null,
      notes: notes || null,
    });

    // Mark as paid
    await this.expenseRepository.markAsPaid(id, paidBy, formatDate(paymentDate));

    const updated = await this.getById(id);
    await this.auditService.record({
      entityType: 'expense', entityId: id, action: 'expense.paid', actorId: paidBy,
      before: expense, after: updated,
    });
    return updated;
  }
  // ========== SEED METHOD ==========

  async seedDemoExpenses(expensesData) {
    const createdExpenses = [];

    for (const expenseData of expensesData) {
      try {
        const expense = await this.create(expenseData);
        createdExpenses.push(expense);
      } catch (error) {
        continue;
      }
    }
    return createdExpenses;
  }
}
