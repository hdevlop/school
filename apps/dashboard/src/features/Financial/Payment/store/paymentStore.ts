import { create } from 'zustand';

interface Installment {
  id: string;
  amount: number;
  paidAmount?: number;
  reservedAmount?: number;
  availableAmount?: number;
  status: string;
  dueDate: string;
  number: number;
  [key: string]: any;
}

interface Fee {
  id: string | number;
  icon?: string;
  color?: string;
  name: string;
  installments: Installment[];
}

interface PaymentDetails {
  amount: string | number;
  paymentMethod: string;
  paymentDate: string;
  transactionRef?: string;
  checkNumber?: string;
  checkDueDate?: string;
  checkBank?: string;
  notes?: string;
}

interface PaymentStore {
  // State
  paymentDetails: PaymentDetails;
  selectedInstallments: Record<string, any>;

  // Setters
  updatePaymentField: (field: keyof PaymentDetails, value: any) => void;
  setPaymentDetails: (details: Partial<PaymentDetails>) => void;

  // Selection actions
  toggleInstallment: (inst: any) => void;
  selectInstallments: (installments: any[]) => void;
  toggleAllFeeInstallments: (feeId: string | number, fees: Fee[]) => void;
  updateAllocatedAmount: (instId: string, amount: string) => void;
  clearAllSelections: () => void;

  // Auto-allocation actions
  handleAutoAllocate: (strategy: 'oldest' | 'overdue', fees: Fee[]) => void;
  selectAllOverdue: (fees: Fee[]) => number;

  // Getters
  getSelectedCount: () => number;
  getSelectedByFee: (feeId: string | number) => number;
  getAllUnpaidInstallments: (fees: Fee[]) => Installment[];
  getTotalAllocated: () => number;
  getRemainingAmount: () => number;

  // Reset
  reset: () => void;
}

const getLocalToday = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const getInitialPaymentDetails = (): PaymentDetails => ({
  amount: '',
  paymentMethod: 'cash',
  paymentDate: getLocalToday(),
  transactionRef: '',
  checkNumber: '',
  checkDueDate: '',
  checkBank: '',
  notes: '',
});

const toAmount = (value: unknown) => Number(value ?? 0) || 0;

export const getInstallmentAvailableAmount = (inst: Installment) => {
  if (inst.availableAmount !== undefined && inst.availableAmount !== null) {
    return Math.max(toAmount(inst.availableAmount), 0);
  }

  return Math.max(
    toAmount(inst.amount) - toAmount(inst.paidAmount) - toAmount(inst.reservedAmount),
    0,
  );
};

export const isInstallmentPayable = (inst: Installment) =>
  inst.status !== 'paid' && getInstallmentAvailableAmount(inst) > 0;

export const usePaymentStore = create<PaymentStore>((set, get) => ({
  // Initial state
  paymentDetails: getInitialPaymentDetails(),
  selectedInstallments: {},

  // Setters
  updatePaymentField: (field, value) =>
    set((state) => ({
      paymentDetails: { ...state.paymentDetails, [field]: value },
    })),

  setPaymentDetails: (details) =>
    set((state) => ({
      paymentDetails: { ...state.paymentDetails, ...details },
    })),

  // Selection actions
  toggleInstallment: (inst) =>
    set((state) => {
      const newSelected = { ...state.selectedInstallments };
      if (newSelected[inst.id]) {
        delete newSelected[inst.id];
      } else {
        const availableAmount = getInstallmentAvailableAmount(inst);
        if (!isInstallmentPayable(inst)) return state;
        newSelected[inst.id] = {
          ...inst,
          availableAmount,
          allocatedAmount: availableAmount,
        };
      }
      return { selectedInstallments: newSelected };
    }),

  selectInstallments: (installments) =>
    set(() => {
      const selected: Record<string, any> = {};

      installments.forEach((inst) => {
        const availableAmount = getInstallmentAvailableAmount(inst);
        if (!isInstallmentPayable(inst)) return;

        selected[inst.id] = {
          ...inst,
          availableAmount,
          allocatedAmount: inst.allocatedAmount ?? availableAmount,
        };
      });

      return { selectedInstallments: selected };
    }),

  toggleAllFeeInstallments: (feeId, fees) =>
    set((state) => {
      const { selectedInstallments } = state;
      if (!fees) return state;

      const fee = fees.find((f) => f.id === feeId);
      if (!fee) return state;

      const unpaidInFee = fee.installments.filter(isInstallmentPayable);
      const allSelected = unpaidInFee.every((inst) => selectedInstallments[inst.id]);

      const newSelected = { ...selectedInstallments };

      if (allSelected) {
        // Deselect all from this fee
        unpaidInFee.forEach((inst) => delete newSelected[inst.id]);
      } else {
        // Select all from this fee
        unpaidInFee.forEach((inst) => {
          const availableAmount = getInstallmentAvailableAmount(inst);
          newSelected[inst.id] = {
            ...inst,
            feeId: feeId,
            feeIcon: fee.icon,
            feeColor: fee.color,
            feeName: fee.name.split(' ')[0],
            availableAmount,
            allocatedAmount: availableAmount,
          };
        });
      }

      return { selectedInstallments: newSelected };
    }),

  updateAllocatedAmount: (instId, amount) =>
    set((state) => {
      const newSelected = { ...state.selectedInstallments };
      if (newSelected[instId]) {
        const requestedAmount = parseFloat(amount) || 0;
        const availableAmount = getInstallmentAvailableAmount(newSelected[instId]);
        newSelected[instId].allocatedAmount = Math.min(
          Math.max(requestedAmount, 0),
          availableAmount,
        );
      }
      return { selectedInstallments: newSelected };
    }),

  clearAllSelections: () => set({ selectedInstallments: {} }),

  // Auto-allocation actions
  handleAutoAllocate: (strategy, fees) =>
    set((state) => {
      const { paymentDetails } = state;
      const amount =
        typeof paymentDetails.amount === 'string'
          ? parseFloat(paymentDetails.amount)
          : paymentDetails.amount;

      if (!amount || amount <= 0 || !fees) return state;

      let remaining = amount;
      const selected: Record<string, any> = {};
      const allUnpaid = get().getAllUnpaidInstallments(fees);

      let sorted = [...allUnpaid];

      if (strategy === 'oldest') {
        sorted.sort((a, b) => {
          if (a.status === 'overdue' && b.status !== 'overdue') return -1;
          if (a.status !== 'overdue' && b.status === 'overdue') return 1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        });
      } else if (strategy === 'overdue') {
        sorted = sorted.filter((inst) => inst.status === 'overdue');
        sorted.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
      }

      for (const inst of sorted) {
        if (remaining <= 0) break;
        const availableAmount = getInstallmentAvailableAmount(inst);
        const toAllocate = Math.min(remaining, availableAmount);
        selected[inst.id] = {
          ...inst,
          availableAmount,
          allocatedAmount: toAllocate,
        };
        remaining -= toAllocate;
      }

      return { selectedInstallments: selected };
    }),

  selectAllOverdue: (fees) => {
    if (!fees) return 0;

    const allUnpaid = get().getAllUnpaidInstallments(fees);
    const overdueInstallments = allUnpaid.filter((inst) => inst.status === 'overdue');
    const selected: Record<string, any> = {};

    overdueInstallments.forEach((inst) => {
      const availableAmount = getInstallmentAvailableAmount(inst);
      selected[inst.id] = {
        ...inst,
        availableAmount,
        allocatedAmount: availableAmount,
      };
    });

    const totalOverdue = overdueInstallments.reduce(
      (sum, inst) => sum + getInstallmentAvailableAmount(inst),
      0,
    );
    set({ selectedInstallments: selected });

    return totalOverdue;
  },

  // Getters
  getSelectedCount: () => {
    return Object.keys(get().selectedInstallments).length;
  },

  getSelectedByFee: (feeId) => {
    return Object.values(get().selectedInstallments).filter((inst) => inst.feeId === feeId).length;
  },

  getAllUnpaidInstallments: (fees) => {
    if (!fees) return [];

    return fees.flatMap((fee) =>
      fee.installments
        .filter(isInstallmentPayable)
        .map((inst) => ({
          ...inst,
          availableAmount: getInstallmentAvailableAmount(inst),
          feeId: fee.id,
          feeIcon: fee.icon,
          feeColor: fee.color,
          feeName: fee.name.split(' ')[0],
        }))
    );
  },

  getTotalAllocated: () => {
    return Object.values(get().selectedInstallments).reduce(
      (sum, inst) => sum + (inst.allocatedAmount || 0),
      0
    );
  },

  getRemainingAmount: () => {
    const { paymentDetails } = get();
    const amount =
      typeof paymentDetails.amount === 'string'
        ? parseFloat(paymentDetails.amount) || 0
        : paymentDetails.amount;
    return amount - get().getTotalAllocated();
  },

  // Reset
  reset: () =>
    set({
      paymentDetails: getInitialPaymentDetails(),
      selectedInstallments: {},
    }),
}));
