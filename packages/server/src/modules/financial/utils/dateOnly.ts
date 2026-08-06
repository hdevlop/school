const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseDateOnly(value: string | Date | null | undefined): Date | null {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new RangeError('Invalid calendar date');
    }
    const copy = new Date(value);
    copy.setHours(0, 0, 0, 0);
    return copy;
  }

  if (typeof value !== 'string') {
    throw new RangeError('Expected YYYY-MM-DD');
  }

  const match = DATE_ONLY_RE.exec(value);
  if (!match) throw new RangeError('Expected YYYY-MM-DD');

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    throw new RangeError('Invalid calendar date');
  }

  date.setHours(0, 0, 0, 0);
  return date;
}

export function formatDateOnly(value: Date | string | null | undefined): string | null {
  if (value === null || value === undefined || value === '') return null;
  const date = value instanceof Date ? value : parseDateOnly(value);
  if (!date) return null;
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

export function compareDateOnly(left: string | null | undefined, right: string | null | undefined): number {
  const l = left ?? '';
  const r = right ?? '';
  if (!l && !r) return 0;
  if (!l) return -1;
  if (!r) return 1;
  return l.localeCompare(r);
}

export function isValidDateOnly(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  if (!DATE_ONLY_RE.test(value)) return false;
  try {
    parseDateOnly(value);
    return true;
  } catch {
    return false;
  }
}
