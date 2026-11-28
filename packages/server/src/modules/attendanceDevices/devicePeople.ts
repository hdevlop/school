export type DevicePerson = {
  deviceUserId: string;
  deviceName: string | null;
  staffId: string | null;
  staffName: string | null;
  staffRole: string | null;
  /** Which rule the scans follow: `hourly` is a vacataire, `monthly` permanent. */
  staffCompensationMode: string | null;
  lastPunchAt: string | null;
  punchCount: number;
};

/**
 * Every PIN the devices know, from their user lists and their scans, with the
 * staff member it belongs to and its last scan. A PIN no one holds comes
 * first, then in the device's own order (shorter PINs before longer ones).
 * `users` lists the most recently named first, so the first name found wins.
 */
export function devicePeople(
  users: readonly { deviceUserId: string; name: string | null }[],
  stats: readonly { deviceUserId: string; punchCount: number; lastPunchAt: string | null }[],
  linked: readonly { id: string; name: string; role: string | null; compensationMode?: string | null; deviceUserId: string | null }[],
): DevicePerson[] {
  const names = new Map<string, string | null>();
  for (const user of users) {
    if (!names.get(user.deviceUserId)) names.set(user.deviceUserId, user.name);
  }
  const statsByPin = new Map(stats.map((row) => [row.deviceUserId, row]));
  const staffByPin = new Map(linked.filter((person) => person.deviceUserId).map((person) => [person.deviceUserId!, person]));
  const pins = new Set([...names.keys(), ...statsByPin.keys()]);

  return [...pins]
    .map((pin) => {
      const person = staffByPin.get(pin);
      const stat = statsByPin.get(pin);
      return {
        deviceUserId: pin,
        deviceName: names.get(pin) ?? null,
        staffId: person?.id ?? null,
        staffName: person?.name ?? null,
        staffRole: person?.role ?? null,
        staffCompensationMode: person?.compensationMode ?? null,
        lastPunchAt: stat?.lastPunchAt ?? null,
        punchCount: Number(stat?.punchCount ?? 0),
      };
    })
    .sort((a, b) => Number(a.staffId !== null) - Number(b.staffId !== null)
      || a.deviceUserId.length - b.deviceUserId.length
      || (a.deviceUserId < b.deviceUserId ? -1 : a.deviceUserId > b.deviceUserId ? 1 : 0));
}
