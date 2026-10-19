import { formatCurrency, formatNumber, type NajmFormatConfig } from 'najm-kit/format';

export function toMinorUnits(amount: number | string | null | undefined, fractionDigits: number): number | null {
  if (amount == null || amount === '') return null;
  const text = String(amount).trim();
  const decimal = /^(-?)(\d+)(?:\.(\d+))?$/.exec(text);
  if (!decimal) {
    const value = Number(text);
    return Number.isFinite(value)
      ? toMinorUnits(value.toFixed(fractionDigits + 1), fractionDigits)
      : null;
  }

  const [, sign, whole, fraction = ''] = decimal;
  const scale = BigInt(10) ** BigInt(fractionDigits);
  const digits = fraction.slice(0, fractionDigits).padEnd(fractionDigits, '0');
  let minor = BigInt(whole) * scale + BigInt(digits || '0');
  if (fraction[fractionDigits] && fraction[fractionDigits] >= '5') minor += BigInt(1);
  if (sign) minor = -minor;
  return minor <= BigInt(Number.MAX_SAFE_INTEGER) && minor >= BigInt(Number.MIN_SAFE_INTEGER)
    ? Number(minor)
    : null;
}

/** APIs use major units. MAD displays whole dirhams; ledger precision stays unchanged. */
export function createSchoolMoneyFormatter(config: NajmFormatConfig & { currency: string }) {
  const fractionDigits = new Intl.NumberFormat(config.locale, {
    style: 'currency', currency: config.currency,
  }).resolvedOptions().maximumFractionDigits ?? 2;

  return (amount: number | string | null | undefined): string => {
    const minor = toMinorUnits(amount, fractionDigits);
    if (config.currency !== 'MAD') return formatCurrency(minor, config);
    if (minor === null) return formatNumber(null, config);
    return `${formatNumber(minor / 100, config, {
      minimumFractionDigits: 0, maximumFractionDigits: 0,
    })}\u00a0dh`;
  };
}
