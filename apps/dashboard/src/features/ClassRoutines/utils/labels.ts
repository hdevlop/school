type Translate = (key: string, params?: Record<string, unknown> | null) => string;

export const routineDayLabel = (day: string, t: Translate) =>
  t(`classRoutines.ui.days.${day}`);

const periodPatterns = [
  /^Period\s+(\d+)$/i,
  /^Période\s+(\d+)$/i,
  /^Periodo\s+(\d+)$/i,
  /^الحصة\s+(\d+)$/u,
];

const breakPatterns = [
  /^Break\s+(\d+)$/i,
  /^Pause\s+(\d+)$/i,
  /^Descanso\s+(\d+)$/i,
  /^استراحة\s+(\d+)$/u,
];

export const routinePeriodLabel = (name: string, t: Translate) => {
  for (const pattern of periodPatterns) {
    const match = name.match(pattern);
    if (match) return t('classRoutines.ui.defaultNames.period', { number: match[1] });
  }

  for (const pattern of breakPatterns) {
    const match = name.match(pattern);
    if (match) return t('classRoutines.ui.defaultNames.break', { number: match[1] });
  }

  const normalized = name.trim().toLocaleLowerCase();
  if (['morning break', 'pause du matin', 'descanso de la mañana', 'استراحة الصباح'].includes(normalized)) {
    return t('classRoutines.ui.defaultNames.morningBreak');
  }
  if (['lunch break', 'pause déjeuner', 'pausa para comer', 'استراحة الغداء'].includes(normalized)) {
    return t('classRoutines.ui.defaultNames.lunchBreak');
  }
  if (['afternoon break', 'pause de l’après-midi', 'descanso de la tarde', 'استراحة بعد الظهر'].includes(normalized)) {
    return t('classRoutines.ui.defaultNames.afternoonBreak');
  }

  return name;
};
