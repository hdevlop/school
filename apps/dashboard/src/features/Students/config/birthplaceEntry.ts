import type { BirthplaceValues } from '@sms/contracts/birthplace';

export function formatBirthplaceEntry(value: BirthplaceValues): string {
  return [value.birthplace?.trim(), value.birthplaceArabic?.trim()].filter(Boolean).join(' - ');
}

/** Split before the Arabic name, preserving hyphens inside Latin place names. */
export function parseBirthplaceEntry(value: string): BirthplaceValues | null {
  const match = value.trim().match(/^(.*?)\s*[-–—]\s*(\p{Script=Arabic}.*)$/u);
  if (!match) return null;
  const birthplace = match[1].trim();
  const birthplaceArabic = match[2].trim();
  if (birthplace.length > 200 || birthplaceArabic.length > 200
    || !/\p{Script=Latin}/u.test(birthplace) || /\p{Script=Arabic}/u.test(birthplace)
    || /\p{Script=Latin}/u.test(birthplaceArabic)) return null;
  return { birthplace, birthplaceArabic };
}
