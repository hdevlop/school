const BUSINESS_DATE_ENV = 'APP_BUSINESS_DATE';
const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseDateOnly(value: string): Date {
  const match = DATE_ONLY_PATTERN.exec(value);
  if (!match) {
    throw new Error(`${BUSINESS_DATE_ENV} must use YYYY-MM-DD format`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    throw new Error(`${BUSINESS_DATE_ENV} must be a valid calendar date`);
  }

  date.setHours(0, 0, 0, 0);
  return date;
}

function formatLocalDate(value: Date): string {
  return [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, '0'),
    String(value.getDate()).padStart(2, '0'),
  ].join('-');
}

export function getBusinessDateOverride(): string | null {
  const value = process.env[BUSINESS_DATE_ENV]?.trim();
  if (!value) return null;
  parseDateOnly(value);
  return value;
}

export function getBusinessDate(): Date {
  const override = getBusinessDateOverride();
  if (override) return parseDateOnly(override);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

export function getBusinessDateOnly(): string {
  return formatLocalDate(getBusinessDate());
}

export function getBusinessClockInfo() {
  const override = getBusinessDateOverride();
  return {
    businessDate: override ?? getBusinessDateOnly(),
    businessDateOverridden: Boolean(override),
    businessDateSource: override ? 'environment' as const : 'system' as const,
  };
}
