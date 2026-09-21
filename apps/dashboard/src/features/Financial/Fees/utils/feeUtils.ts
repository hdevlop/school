import { toLocalISODate } from '@/lib/localDate'

// ==================== CONSTANTS ====================

export const SCHEDULE_TYPES = {
   MONTHLY: 'monthly',
   QUARTERLY: 'quarterly',
   SEMESTER: 'semester',
   ANNUALLY: 'annually',
   ONE_TIME: 'oneTime',
} as const;

// ==================== TYPE DEFINITIONS ====================

export interface Fee {
   studentId?: string;
   feeTypeId: string;
   feeTypeName?: string;
   schedule: string;
   netAmount?: number | string;
   discountAmount?: number | string;
   notes?: string;
}

export interface FeeType {
   id: string;
   name: string;
   amount: number | string;
   paymentType: string;
   category?: string;
   labels?: Record<string, string>;
}

const SEEDED_FEE_TYPE_IDS = new Set(['FT00', 'FT01', 'FT02', 'FT03', 'FT04', 'FT05', 'FT06', 'FT07', 'FT8'])

export const getFeeTypeDisplayName = (
   feeType: FeeType | null | undefined,
   translate: (key: string) => string,
   language: string,
): string => {
   if (!feeType) return ''

   const localizedLabel = feeType.labels?.[language]
   if (localizedLabel) return localizedLabel

   if (SEEDED_FEE_TYPE_IDS.has(feeType.id) && feeType.category) {
      const key = `feeTypes.category.${feeType.category}`
      const translatedCategory = translate(key)
      if (translatedCategory !== key) return translatedCategory
   }

   return feeType.name
}

// ==================== FEE FACTORY ====================

export const FeeFactory = {
   createFromFeeType: (feeType: FeeType): Fee => {
      const baseAmount = parseFloat(feeType.amount?.toString() || '0') || 0
      const schedule = feeType.paymentType === 'oneTime' ? SCHEDULE_TYPES.ONE_TIME : SCHEDULE_TYPES.MONTHLY

      return {
         feeTypeId: feeType.id,
         feeTypeName: feeType.name,
         schedule,
         netAmount: baseAmount,
         discountAmount: 0,
         notes: ''
      }
   }
};

// ==================== FEE DATA TRANSFORMERS ====================

export const injectStudentIdToFees = (fees: Fee[], studentId: string): Fee[] => {
   return fees.map(fee => ({
      ...fee,
      studentId
   }));
};

export const prepareBulkFeesForSubmission = (formData: { fees?: Fee[] }, studentId: string) => {
   if (!formData.fees || !Array.isArray(formData.fees)) {
      return { fees: [] };
   }

   return {
      fees: injectStudentIdToFees(formData.fees, studentId)
   };
};

// ==================== FEE HELPERS ====================

export const getFeeTypeName = (feeTypes: FeeType[], feeTypeId: string): string => {
   const feeType = feeTypes.find(ft => ft.id === feeTypeId);
   return feeType?.name || '';
};

export const getFeeTypeById = (feeTypes: FeeType[], id: string): FeeType | undefined => {
   return feeTypes.find(ft => ft.id === id);
};

export const isOneTimePaymentType = (feeTypes: FeeType[], feeTypeId: string): boolean => {
   const feeType = getFeeTypeById(feeTypes, feeTypeId);
   return feeType?.paymentType === 'oneTime';
};

// ========================================
// FEE CALCULATION UTILITIES
// ========================================

export const calculateRemainingMonths = (startDateStr: string, endDateStr: string): number => {
  const start = parseDateOnlyLocal(startDateStr);
  const end = parseDateOnlyLocal(endDateStr);
  if (start > end) return 0;
  const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
  return Math.max(0, months);
};

function parseDateOnlyLocal(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

type FeePreviewContext = {
  effectiveDate?: string | null;
  academicYear?: string | null;
  startMonth?: number;
  endMonth?: number;
};

function getPreviewRange(context: FeePreviewContext = {}) {
  const fallback = getAcademicYearDateRange();
  if (!context.academicYear) return fallback;
  const [startYear, endYear] = context.academicYear.split('-').map(Number);
  const startMonth = context.startMonth ?? 9;
  const endMonth = context.endMonth ?? 6;
  const endCalendarYear = endMonth < startMonth ? endYear : startYear;
  const endDay = new Date(endCalendarYear, endMonth, 0).getDate();
  return {
    startDate: `${startYear}-${String(startMonth).padStart(2, '0')}-01`,
    endDate: `${endCalendarYear}-${String(endMonth).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`,
  };
}

export const calculateFeeAmounts = (
  paymentType: string,
  amount: string | number,
  schedule: string = 'monthly',
  discount: number = 0,
  context: FeePreviewContext = {},
) => {
  const baseAmount = Number(amount) || 0;
  const discountVal = Number(discount) || 0;

  const range = getPreviewRange(context);
  const chargeableStart = context.effectiveDate && context.effectiveDate > range.startDate
    ? context.effectiveDate
    : range.startDate;
  const monthsRemaining = calculateRemainingMonths(chargeableStart, range.endDate);

  const isRecurring = paymentType === 'recurring';

  let grossAmount: number;
  let totalDiscount: number;
  let periods: number;

  if (!isRecurring) {
    // One-time fee
    grossAmount = baseAmount;
    totalDiscount = Math.min(discountVal, grossAmount);
    periods = 1;
  } else {
    // Recurring fee
    grossAmount = baseAmount * monthsRemaining;
    totalDiscount = discountVal * monthsRemaining;

    switch (schedule) {
      case 'monthly':
        periods = monthsRemaining;
        break;
      case 'quarterly':
        periods = Math.ceil(monthsRemaining / 3);
        break;
      case 'semester':
        periods = Math.ceil(monthsRemaining / 6);
        break;
      case 'annually':
        periods = 1;
        break;
      default:
        periods = 1;
    }
  }

  const netAmount = Math.max(0, grossAmount - totalDiscount);

  return {
    grossAmount,
    totalDiscount,
    netAmount,
    periods,
    monthsRemaining
  };
};

export const calculateTotalFees = (fees) => {
  return fees.reduce((sum, fee) => {
    const amount = parseFloat(fee.amount?.toString() || '0') || 0;
    const discount = parseFloat(fee.discountAmount?.toString() || '0') || 0;
    return sum + (amount - discount);
  }, 0).toFixed(2);
}

export const getAcademicYearDateRange = (): { startDate; endDate } => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  const startYear = currentMonth >= 9 ? currentYear : currentYear - 1;
  const endYear = startYear + 1;

  return {
    startDate: `${startYear}-09-01`,
    endDate: `${endYear}-06-30`
  };
};

export type ScheduleType = 'monthly' | 'quarterly' | 'semester' | 'annually' | 'oneTime';

export interface PreviewInstallment {
  number: number;
  dueDate: string;
  amount: number;
}

function resolveAcademicPeriodStart(academicStart: Date, academicEnd: Date, referenceDate: Date = new Date()): Date {
  const normalized = new Date(referenceDate);
  normalized.setHours(0, 0, 0, 0);

  const normalizedStart = new Date(academicStart);
  normalizedStart.setHours(0, 0, 0, 0);
  const normalizedEnd = new Date(academicEnd);
  normalizedEnd.setHours(0, 0, 0, 0);

  if (normalized < normalizedStart || normalized > normalizedEnd) {
    return normalizedStart;
  }

  return normalized;
}

export function getScheduleConfig(type: ScheduleType, start: Date, end: Date): { count: number; interval: number } {
  const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;

  switch (type) {
    case 'monthly':   return { count: months, interval: 1 };
    case 'quarterly': return { count: Math.ceil(months / 3), interval: 3 };
    case 'semester':  return { count: Math.ceil(months / 6), interval: 6 };
    case 'annually':  return { count: 1, interval: 12 };
    default:          return { count: 1, interval: 0 };
  }
}

export function buildInstallmentsPreview(
  netAmount: number,
  schedule: ScheduleType,
  context: FeePreviewContext = {},
): PreviewInstallment[] {
  const { startDate, endDate } = getPreviewRange(context);
  const reference = context.effectiveDate ? parseDateOnlyLocal(context.effectiveDate) : parseDateOnlyLocal(startDate);
  const start = resolveAcademicPeriodStart(parseDateOnlyLocal(startDate), parseDateOnlyLocal(endDate), reference);

  if (schedule === 'oneTime' || netAmount <= 0) {
    return [{
      number: 1,
      dueDate: toLocalISODate(start),
      amount: netAmount,
    }];
  }

  const config = getScheduleConfig(schedule, start, parseDateOnlyLocal(endDate));
  const { count, interval } = config;
  const baseAmount = netAmount / count;

  return Array.from({ length: count }, (_, i) => {
    const targetMonth = start.getMonth() + (i * interval);
    const targetYear = start.getFullYear() + Math.floor(targetMonth / 12);
    const normalizedMonth = ((targetMonth % 12) + 12) % 12;
    const lastDay = new Date(targetYear, normalizedMonth + 1, 0).getDate();
    const dueDate = new Date(targetYear, normalizedMonth, Math.min(start.getDate(), lastDay));

    const isLast = i === count - 1;
    const amount = isLast
      ? Number((netAmount - (baseAmount * (count - 1))).toFixed(2))
      : Number(baseAmount.toFixed(2));

    return {
      number: i + 1,
      dueDate: toLocalISODate(dueDate),
      amount,
    };
  });
}
