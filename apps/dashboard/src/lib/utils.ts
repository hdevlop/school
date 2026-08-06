import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { z } from 'zod'
import { format } from 'date-fns'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export const dateField = (message?, required = false) => {
  const errorMessage = message !== undefined ? message : "Invalid date";

  const baseSchema = z.union([z.string(), z.date()])
    .refine(val => {
      if (!required && (!val || val === "")) return true;
      return !isNaN(new Date(val).getTime());
    }, {
      message: errorMessage
    })
    .transform(val => val && val !== "" ? new Date(val) : undefined);

  return required ? baseSchema : baseSchema.optional();
};

export const formatDate = (date, t = null) => {
  if (!date) return t('common.notAvailable');
  try {
    return format(new Date(date), 'MMM dd, yyyy');
  } catch {
    return t('common.invalidDate');
  }
};

export const formatTime = (timeString) => {
  if (!timeString) return '--:--';
  return new Date(`1970-01-01T${timeString}`).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const formatTimeRange = (startTime?, endTime?) => {
  if (!startTime) return '';

  const formattedStartTime = formatTime(startTime);
  const formattedEndTime = endTime ? formatTime(endTime) : '';

  return formattedEndTime ? `${formattedStartTime} - ${formattedEndTime}` : formattedStartTime;
};

export const formatCurrency = (amount: any, currency = 'USD'): string => {
  const num = typeof amount === 'number' ? amount : parseFloat(String(amount));

  if (isNaN(num) || amount === null || amount === undefined || amount === '') {
    return '--';
  }

  return new Intl.NumberFormat('fr-MA', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

export const formatDuration = (startTime, endTime) => {
  const start = new Date(`1970-01-01T${startTime}`);
  const end = new Date(`1970-01-01T${endTime}`);
  const diffMs = end.getTime() - start.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
};

export const formatArea = (area, t) => {
  if (!area) return t('common.notAvailable');
  return `${parseFloat(area).toFixed(2)}`;
};

export const formatCoordinates = (location, t) => {
  if (!location || !location.lat || !location.lng) {
    return t('common.notAvailable');
  }
  return `${parseFloat(location.lat).toFixed(4)}, ${parseFloat(location.lng).toFixed(4)}`;
};

export const getPriorityColor = (priority) => {
  const map = {
    high: 'bg-red-600',
    critical: 'bg-red-700',
    medium: 'bg-yellow-600',
    low: 'bg-green-600',
  };
  return map[priority] || 'bg-gray-600';
};

export const getStatusColor = (status) => {
  const map = {
    active: 'text-green-400',
    completed: 'text-blue-400',
    planned: 'text-yellow-400',
    scheduled: 'text-orange-400',
    acknowledged: 'text-orange-400',
    maintenance: 'text-orange-400',
    inactive: 'text-gray-400',
    suspended: 'text-red-400',
    retired: 'text-red-400',
  };
  return map[status] || 'text-gray-400';
};

export const colorClasses = {
  blue: {
    text: "text-blue-500",
    textDark: "text-blue-600",
    border: "hover:border-blue-500/50",
    bg: "bg-blue-500/10",
  },
  red: {
    text: "text-red-500",
    textDark: "text-red-600",
    border: "hover:border-red-500/50",
    bg: "bg-red-500/10",
  },
  green: {
    text: "text-green-500",
    textDark: "text-green-600",
    border: "hover:border-green-500/50",
    bg: "bg-green-500/10",
  },
  purple: {
    text: "text-purple-500",
    textDark: "text-purple-600",
    border: "hover:border-purple-500/50",
    bg: "bg-purple-500/10",
  },
  yellow: {
    text: "text-yellow-500",
    textDark: "text-yellow-600",
    border: "hover:border-yellow-500/50",
    bg: "bg-yellow-500/10",
  },
  teal: {
    text: "text-teal-500",
    textDark: "text-teal-600",
    border: "hover:border-teal-500/50",
    bg: "bg-teal-500/10",
  },
  indigo: {
    text: "text-indigo-500",
    textDark: "text-indigo-600",
    border: "hover:border-indigo-500/50",
    bg: "bg-indigo-500/10",
  },
  pink: {
    text: "text-pink-500",
    textDark: "text-pink-600",
    border: "hover:border-pink-500/50",
    bg: "bg-pink-500/10",
  },
  gray: {
    text: "text-gray-500",
    textDark: "text-gray-600",
    border: "hover:border-gray-500/50",
    bg: "bg-gray-500/10",
  },
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

export const calculateRemainingMonthsInYear = (): number => {
  const today = new Date();
  const { startDate, endDate } = getAcademicYearDateRange();

  const start = parseDateOnlyLocal(startDate);
  const end = parseDateOnlyLocal(endDate);

  if (today < start) {
    return calculateRemainingMonths(startDate, endDate);
  }

  if (today > end) {
    return 0;
  }

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  return calculateRemainingMonths(todayStr, endDate);
};

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

export const calculateNetAmount = (paymentType, amount, schedule, discount) => {
  return calculateFeeAmounts(paymentType, amount, schedule, discount).netAmount;
};

export const calculateTotalFees = (fees) => {
  return fees.reduce((sum, fee) => {
    const amount = parseFloat(fee.amount?.toString() || '0') || 0;
    const discount = parseFloat(fee.discountAmount?.toString() || '0') || 0;
    return sum + (amount - discount);
  }, 0).toFixed(2);
}

export const getCurrentAcademicYear = () => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  const startYear = currentMonth >= 9 ? currentYear : currentYear - 1;
  const endYear = startYear + 1;

  return `${startYear}-${endYear}`;
};

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
      dueDate: formatDate(start),
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
      dueDate: formatDate(dueDate),
      amount,
    };
  });
}
