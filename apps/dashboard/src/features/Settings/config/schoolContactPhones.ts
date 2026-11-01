type SchoolPhones = { schoolPhone?: string | null; schoolPhones?: readonly string[] | null };

// Moroccan local and international spellings identify the same number.
const phoneKey = (phone: string) => {
  const digits = phone.replace(/\D/g, '');
  return /^0\d{9}$/.test(digits) ? `212${digits.slice(1)}` : digits;
};

/** The primary contact plus two optional numbers, shared by document headers. */
export function schoolContactPhones(primary: string, additional: readonly string[]) {
  const seen = new Set<string>();
  return [primary, ...additional].map(phone => phone.trim()).filter(phone => {
    const key = phoneKey(phone);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 3);
}

/** Merge older separate contact/document numbers into the three visible inputs. */
export function schoolContactPhoneDefaults(settings?: SchoolPhones | null) {
  const phones = schoolContactPhones(settings?.schoolPhone ?? '', settings?.schoolPhones ?? []);
  return {
    schoolPhone: phones[0] ?? '',
    additionalSchoolPhones: [phones[1] ?? '', phones[2] ?? ''],
  };
}
