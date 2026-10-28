import defaultFeeTypes from './fixtures/data/feeTypes.json';

interface NamedFeeType {
  id: string;
  name: string;
  labels?: Record<string, string> | null;
}

const normalize = (name: string) => name.trim().normalize('NFC').toLowerCase();

/** Match saved names and translations without choosing between ambiguous fees. */
export function findFeeTypesByName<T extends NamedFeeType>(types: readonly T[], name: string): T[] {
  const requested = normalize(name);
  if (!requested) return [];

  return types.filter(type => {
    const names = [type.name, ...Object.values(type.labels ?? {})];
    const definition = defaultFeeTypes.find(seed => seed.id === type.id);
    if (definition) {
      const defaults = [definition.name, ...(definition.aliases ?? []), ...Object.values(definition.labels ?? {})];
      // Older seeds saved English names without labels. Only recognize the
      // original names: a school-renamed template keeps its own identity.
      if (defaults.some(alias => normalize(alias) === normalize(type.name))) names.push(...defaults);
    }
    return names.some(alias => normalize(alias) === requested);
  });
}
