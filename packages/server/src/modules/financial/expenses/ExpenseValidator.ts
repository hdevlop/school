import { Err, I18n, Service } from '@server/najm';
import { ExpenseRepository } from './ExpenseRepository';

@Service()
export class ExpenseValidator {
  @I18n('expenses.errors') private t!: (key: string) => string;

  constructor(
    private expenseRepository: ExpenseRepository,
  ) { }
  // ========== UNIQUENESS CHECKS ==========

  async checkIdIsUnique(id) {
    
    const existingExpense = await this.expenseRepository.getById(id);
    if (existingExpense) {
      Err(409, this.t('idExists'));
    }
  }

  async checkInvoiceNumberIsUnique(invoiceNumber: string, excludeId = null) {
    if (!invoiceNumber) return;
    const existingExpense = await this.expenseRepository.getByInvoiceNumber(invoiceNumber);
    if (existingExpense && existingExpense.id !== excludeId) {
      Err(409, this.t('invoiceNumberExists'));
    }
  }

  async checkReceiptNumberIsUnique(receiptNumber: string, excludeId = null) {
    if (!receiptNumber) return;
    const existingExpense = await this.expenseRepository.getByReceiptNumber(receiptNumber);
    if (existingExpense && existingExpense.id !== excludeId) {
      Err(409, this.t('receiptNumberExists'));
    }
  }

  async checkCheckNumberIsUnique(checkNumber: string, excludeId = null) {
    if (!checkNumber) return;
    const existingExpense = await this.expenseRepository.getByCheckNumber(checkNumber);
    if (existingExpense && existingExpense.id !== excludeId) {
      Err(409, this.t('checkNumberExists'));
    }
  }

  // ========== EXISTENCE CHECKS ==========

  async isExists(id: string) {
    const existingExpense = await this.expenseRepository.getById(id);
    return !!existingExpense;
  }

  async isInvoiceNumberExists(invoiceNumber: string) {
    if (!invoiceNumber) return false;
    const existingExpense = await this.expenseRepository.getByInvoiceNumber(invoiceNumber);
    return !!existingExpense;
  }

  async isReceiptNumberExists(receiptNumber: string) {
    if (!receiptNumber) return false;
    const existingExpense = await this.expenseRepository.getByReceiptNumber(receiptNumber);
    return !!existingExpense;
  }

  async isCheckNumberExists(checkNumber: string) {
    if (!checkNumber) return false;
    const existingExpense = await this.expenseRepository.getByCheckNumber(checkNumber);
    return !!existingExpense;
  }

  async checkExists(id: string) {
    const expenseExists = await this.isExists(id);
    if (!expenseExists) {
      Err(404, this.t('notFound'));
    }
    return true;
  }

  async checkInvoiceNumberExists(invoiceNumber: string) {
    const expense = await this.expenseRepository.getByInvoiceNumber(invoiceNumber);
    if (!expense) {
      Err(404, this.t('notFound'));
    }
    return expense;
  }

  async checkReceiptNumberExists(receiptNumber: string) {
    const expense = await this.expenseRepository.getByReceiptNumber(receiptNumber);
    if (!expense) {
      Err(404, this.t('notFound'));
    }
    return expense;
  }

  async checkCheckNumberExists(checkNumber: string) {
    const expense = await this.expenseRepository.getByCheckNumber(checkNumber);
    if (!expense) {
      Err(404, this.t('notFound'));
    }
    return expense;
  }

  // ========== BUSINESS LOGIC VALIDATION ==========

  async validatePaymentDateNotBeforeExpense(paymentDate: string, expenseDate: string) {
    if (paymentDate < expenseDate) {
      Err(400, this.t('paymentDateBeforeExpense'));
    }

    return true;
  }

  // ========== STATUS VALIDATION ==========

  async checkCanApprove(id: string) {
    const expense = await this.expenseRepository.getById(id);
    if (!expense) {
      Err(404, this.t('notFound'));
    }

    if (expense.status !== 'pending') {
      Err(400, this.t('cannotApprove'));
    }

    return true;
  }

  async checkCanPay(id: string) {
    const expense = await this.expenseRepository.getById(id);
    if (!expense) {
      Err(404, this.t('notFound'));
    }

    if (expense.status !== 'approved') {
      Err(400, this.t('cannotPay'));
    }

    return true;
  }


  // ========== MAIN VALIDATION METHOD ==========

  async validate(data, excludeId = null) {
    const isUpdate = excludeId !== null;

    if (isUpdate) {
      await this.checkExists(excludeId);

    }

    const {
      id,
      expenseDate,
      paymentDate,
      invoiceNumber,
      receiptNumber,
      checkNumber,
    } = data;

    if (!isUpdate) {
      if (id) await this.checkIdIsUnique(id);
    }

    // Uniqueness checks (Business logic, not Zod)
    if (invoiceNumber) await this.checkInvoiceNumberIsUnique(invoiceNumber, excludeId);
    if (receiptNumber) await this.checkReceiptNumberIsUnique(receiptNumber, excludeId);
    if (checkNumber) await this.checkCheckNumberIsUnique(checkNumber, excludeId);

    // Business logic: Payment date validation
    if (paymentDate && expenseDate) {
      await this.validatePaymentDateNotBeforeExpense(paymentDate, expenseDate);
    }

    return data;
  }

  // ========================================
  // EXPENSE_APPROVAL_VALIDATIONS
  // ========================================

  async checkRejectionReasonRequired(action: string, rejectionReason?: string | null) {
    if (action === 'reject' && !rejectionReason) {
      Err(400, this.t('rejectionReasonRequired'));
    }
    return true;
  }

  async validateApproval(data) {
    await this.checkRejectionReasonRequired(data.action, data.rejectionReason);
    return data;
  }

  async validateRejection(rejectionReason: string) {
    if (!rejectionReason || rejectionReason.trim().length === 0) {
      Err(400, this.t('rejectionReasonRequired'));
    }
    return true;
  }

  // ========================================
  // EXPENSE_PAYMENT_VALIDATIONS
  // ========================================

  async validatePayment(data) {
    return data;
  }

  async validatePaymentDate(paymentDate: string, expenseDate: string) {
    return await this.validatePaymentDateNotBeforeExpense(paymentDate, expenseDate);
  }

  async validateCheckPayment(paymentMethod: string, checkNumber?: string) {
    if (paymentMethod === 'check' && !checkNumber) {
      Err(400, this.t('checkNumberRequired'));
    }
    return true;
  }
}
