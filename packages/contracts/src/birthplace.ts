/** A birthplace is identity data, independent of a student's academic year. */
export interface BirthplaceValues {
  birthplaceId?: string | null;
  /** Latin name; accepts legacy imports containing Arabic here too. */
  birthplace?: string | null;
  birthplaceArabic?: string | null;
}

export interface Birthplace {
  id: string;
  nameLatin: string;
  nameArabic: string;
  countryCode: string;
  provinceLatin: string;
  provinceArabic: string;
}

/** Display the available script without inventing a translation. */
export function birthplaceLabel(value: BirthplaceValues, language: string): string {
  return (language.startsWith('ar')
    ? value.birthplaceArabic?.trim() || value.birthplace?.trim()
    : value.birthplace?.trim() || value.birthplaceArabic?.trim()) || '';
}
