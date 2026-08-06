export interface Installment {
    id: string;
    number: number;
    dueDate: string;
    amount: number;
    paidAmount?: number;
    completedAmount?: number;
    reservedAmount?: number;
    availableAmount?: number;
    status: 'paid' | 'overdue' | 'pending';
    feeName?: string;
    feeId?: string | number;
    feeIcon?: string;
    feeColor?: string;
    allocatedAmount?: number;
}

export interface Fee {
    id: number | string;
    name: string;
    icon: string;
    color: string;
    installments: Installment[];
}

export interface Student {
    name: string;
    id: string;
    fees: Fee[];
}

export interface MultiFeesPaymentModalProps {
    student: Student;
}
