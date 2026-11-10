/** Official workbook codes and the familiar names used inside School. */
export const SCHOOL_CLASS_NAMES = [
  { official: '1APG', app: 'CP' },
  { official: '2APG', app: 'CE1' },
  { official: '3APG', app: 'CE2' },
  { official: '4APG', app: 'CM1' },
  { official: '5APG', app: 'CM2' },
  { official: '6APG', app: 'CE6' },
  { official: '1APIC', app: '1AC' },
  { official: '2APIC', app: '2AC' },
  { official: '3APIC', app: '3AC' },
] as const;

function knownClass(name: string) {
  const code = name.trim().toUpperCase();
  return SCHOOL_CLASS_NAMES.find(item => item.official === code || item.app === code);
}

export const toAppClassName = (name: string): string => knownClass(name)?.app ?? name.trim();
export const toOfficialClassName = (name: string): string => knownClass(name)?.official ?? name.trim();

/**
 * The level in Arabic as Massar and ministry documents write it, by app name.
 * The official preschool has two years, MS and GS; PS comes before it, so
 * «الأولى روض» is the name schools use for it, not a ministry one.
 */
export const SCHOOL_CLASS_ARABIC_NAMES = {
  PS: 'الأولى روض',
  MS: 'الأولى أولي',
  GS: 'الثانية أولي',
  CP: 'الأولى ابتدائي',
  CE1: 'الثانية ابتدائي',
  CE2: 'الثالثة ابتدائي',
  CM1: 'الرابعة ابتدائي',
  CM2: 'الخامسة ابتدائي',
  CE6: 'السادسة ابتدائي',
  '1AC': 'الأولى إعدادي',
  '2AC': 'الثانية إعدادي',
  '3AC': 'الثالثة إعدادي',
  TC: 'الجذع المشترك',
  '1BAC': 'الأولى بكالوريا',
  '2BAC': 'الثانية بكالوريا',
} as const satisfies Record<string, string>;

/** A custom class keeps its own name. */
export function toArabicClassName(name: string): string {
  const key = toAppClassName(name).toUpperCase();
  return Object.hasOwn(SCHOOL_CLASS_ARABIC_NAMES, key)
    ? SCHOOL_CLASS_ARABIC_NAMES[key as keyof typeof SCHOOL_CLASS_ARABIC_NAMES]
    : toOfficialClassName(name);
}

/** Compact level labels for the narrow year columns in school registers. */
const arabicClassAbbreviations: Record<keyof typeof SCHOOL_CLASS_ARABIC_NAMES, string> = {
  PS: 'أ.رو', MS: 'أ.أو', GS: 'ت.أو',
  CP: 'أ.اب', CE1: 'ت.اب', CE2: 'ث.اب', CM1: 'ر.اب', CM2: 'خ.اب', CE6: 'س.اب',
  '1AC': 'أ.إع', '2AC': 'ت.إع', '3AC': 'ث.إع',
  TC: 'ج.م', '1BAC': 'أ.بك', '2BAC': 'ت.بك',
};

export function toArabicClassAbbreviation(name: string): string {
  const key = toAppClassName(name).toUpperCase();
  if (Object.hasOwn(arabicClassAbbreviations, key)) {
    return arabicClassAbbreviations[key as keyof typeof arabicClassAbbreviations];
  }
  const arabicKey = (Object.keys(SCHOOL_CLASS_ARABIC_NAMES) as (keyof typeof SCHOOL_CLASS_ARABIC_NAMES)[])
    .find(code => SCHOOL_CLASS_ARABIC_NAMES[code] === name.trim());
  return arabicKey ? arabicClassAbbreviations[arabicKey] : name.trim();
}

const academicClassOrder: readonly string[] = [
  'PS', 'MS', 'GS', ...SCHOOL_CLASS_NAMES.map(item => item.app), 'TC', '1BAC', '2BAC',
];
const classNameCollator = new Intl.Collator('fr', { numeric: true });

/** The preceding level for a register fallback; custom and first levels have none. */
export function previousClassName(name: string): string | null {
  const key = toAppClassName(name).toUpperCase();
  const index = academicClassOrder.findIndex(code => code === key
    || SCHOOL_CLASS_ARABIC_NAMES[code as keyof typeof SCHOOL_CLASS_ARABIC_NAMES] === name.trim());
  return index > 0 ? academicClassOrder[index - 1] : null;
}

/** Academic progression first; custom names follow in natural alphabetical order. */
export function compareClassNames(left: string, right: string): number {
  const leftName = toAppClassName(left).toUpperCase();
  const rightName = toAppClassName(right).toUpperCase();
  const leftIndex = academicClassOrder.indexOf(leftName);
  const rightIndex = academicClassOrder.indexOf(rightName);
  return (leftIndex < 0 ? academicClassOrder.length : leftIndex)
    - (rightIndex < 0 ? academicClassOrder.length : rightIndex)
    || classNameCollator.compare(leftName, rightName);
}

/** Exact names take priority if old data contains both names as separate classes. */
export function classNameAliases(name: string): string[] {
  const trimmed = name.trim();
  const known = knownClass(trimmed);
  return known ? [...new Set([trimmed.toUpperCase(), known.app, known.official])] : [trimmed];
}

export function findClassByName<T extends { name: string }>(classes: readonly T[], name: string): T | undefined {
  for (const alias of classNameAliases(name)) {
    const match = classes.find(item => item.name.trim().localeCompare(alias, undefined, { sensitivity: 'accent' }) === 0);
    if (match) return match;
  }
  return undefined;
}
