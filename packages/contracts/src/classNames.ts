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

const academicClassOrder: readonly string[] = [
  'PS', 'MS', 'GS', ...SCHOOL_CLASS_NAMES.map(item => item.app), 'TC', '1BAC', '2BAC',
];

/** Academic progression first; custom names follow in natural alphabetical order. */
export function compareClassNames(left: string, right: string): number {
  const leftName = toAppClassName(left).toUpperCase();
  const rightName = toAppClassName(right).toUpperCase();
  const leftIndex = academicClassOrder.indexOf(leftName);
  const rightIndex = academicClassOrder.indexOf(rightName);
  return (leftIndex < 0 ? academicClassOrder.length : leftIndex)
    - (rightIndex < 0 ? academicClassOrder.length : rightIndex)
    || leftName.localeCompare(rightName, 'fr', { numeric: true });
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
