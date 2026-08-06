// Keep chart colors tied to stable gender keys (M / F), not translated display labels.
export const GENDER_COLORS: Record<string, string> = {
  M: 'oklch(0.4282 0.1199 251.76)',
  F: 'oklch(0.7686 0.1647 70.0804)',
  Other: 'oklch(0.9846 0.0017 247.8389)',
};

export const getGenderColor = (gender?: string): string => {
  const value = gender?.trim().toLowerCase();

  if (value === 'm' || value === 'male' || value === 'homme' || value === 'hombre' || value === 'masculino') {
    return GENDER_COLORS.M;
  }

  if (value === 'f' || value === 'female' || value === 'femme' || value === 'mujer' || value === 'femenino') {
    return GENDER_COLORS.F;
  }

  return GENDER_COLORS.Other;
};
