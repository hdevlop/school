const MONEY_RE = /^-?\d+(\.\d{1,2})?$/;
const MAX_CENTS = Number.MAX_SAFE_INTEGER;

export class MoneyError extends Error {
  readonly code: 'invalid' | 'outOfRange';
  constructor(code: 'invalid' | 'outOfRange', message: string) {
    super(message);
    this.code = code;
    this.name = 'MoneyError';
  }
}

export function toCents(value: string | number | null | undefined): number {
  if (value === null || value === undefined) {
    throw new MoneyError('invalid', 'Money value is null or undefined');
  }

  const normalized = String(value).trim();
  if (!MONEY_RE.test(normalized)) {
    throw new MoneyError('invalid', `Invalid money value: ${value}`);
  }

  const negative = normalized.startsWith('-');
  const body = negative ? normalized.slice(1) : normalized;
  const [whole, fractionRaw = ''] = body.split('.');
  const fraction = fractionRaw.padEnd(2, '0').slice(0, 2);
  const wholeNum = Number(whole);
  const cents = wholeNum * 100 + Number(fraction);
  if (!Number.isSafeInteger(cents) || Math.abs(cents) > MAX_CENTS) {
    throw new MoneyError('outOfRange', `Money value out of range: ${value}`);
  }

  return negative ? -cents : cents;
}

export function fromCents(value: number): string {
  if (!Number.isFinite(value)) {
    throw new MoneyError('invalid', 'Cents value is not finite');
  }
  const rounded = Math.round(value);
  const sign = rounded < 0 ? '-' : '';
  const absolute = Math.abs(rounded);
  const whole = Math.floor(absolute / 100);
  const fraction = String(absolute % 100).padStart(2, '0');
  return `${sign}${whole}.${fraction}`;
}

export function safeAddCents(...values: Array<string | number>): number {
  return values.reduce<number>((sum, v) => sum + toCents(v), 0);
}

export function safeSubtractCents(left: string | number, right: string | number): number {
  return toCents(left) - toCents(right);
}

export function safeCompareCents(left: string | number, right: string | number): number {
  const l = toCents(left);
  const r = toCents(right);
  if (l === r) return 0;
  return l < r ? -1 : 1;
}
