import { describe, expect, it } from 'bun:test';
import { COMPETENCY_LEVEL_VALUES, type CompetencyEvaluation } from '@sms/contracts';
import { translations } from '@sms/contracts/locales';
import { translate } from 'najm-i18n';

import {
  averageRank, competencyMonths, competencySummary, defaultMonth, filledBars, formatChange, indexEvaluations, levelOfRank,
  monthLabel, rankChange, rosterDay, studentSummary,
} from '@/features/Competencies/config/competencyLevels';
import { levelOptions, NOT_EVALUATED } from '@/features/Competencies/config/competencyOptions';
import { createCompetencyNameSchema } from '@/features/Competencies/config/competencySchemas';
import { catalogLanguage, isArabicText } from '@/features/Competencies/config/competencyLanguage';

const echo = (key: string) => key;

describe('competency levels', () => {
  // The mockups: Avancé fills four of five bars, En cours three, Début two; the grid's Non acquis one.
  it('fill one bar per rank, and none when not evaluated', () => {
    expect(COMPETENCY_LEVEL_VALUES.map(filledBars)).toEqual([1, 2, 3, 4, 5]);
    expect(filledBars(null)).toBe(0);
  });

  it('average and round to a level, with nothing evaluated having none', () => {
    expect(averageRank([])).toBeNull();
    expect(averageRank([null, undefined])).toBeNull();
    expect(averageRank(['advanced', 'in_progress', null])).toBe(3.5);
    expect(levelOfRank(3.5)).toBe('advanced');
    expect(levelOfRank(3.4)).toBe('in_progress');
    expect(levelOfRank(0.2)).toBe('not_acquired');
    expect(levelOfRank(2)).toBe('beginning');
    expect(levelOfRank(9)).toBe('mastered');
    expect(levelOfRank(null)).toBeNull();
  });

  it('show the change since September to one decimal, signed', () => {
    expect(rankChange(3.1, 2.2)).toBe(0.9);
    expect(rankChange(2, 3)).toBe(-1);
    expect(rankChange(null, 2)).toBeNull();
    expect(rankChange(2, null)).toBeNull();
    expect(formatChange(0.9)).toBe('+0.9');
    expect(formatChange(-1)).toBe('−1');
    expect(formatChange(0)).toBe('0');
  });
});

describe('competency summaries', () => {
  const evaluations: CompetencyEvaluation[] = [
    { competencyId: 'c1', studentId: 's1', month: '2026-12', level: 'advanced' },
    { competencyId: 'c2', studentId: 's1', month: '2026-12', level: 'in_progress' },
    { competencyId: 'c1', studentId: 's2', month: '2026-12', level: 'beginning' },
    { competencyId: 'c1', studentId: 's1', month: '2026-09', level: 'in_progress' },
  ];
  const index = indexEvaluations(evaluations);

  it('count a pupil\'s evaluated competencies of the month, and their level', () => {
    expect(studentSummary(index, ['c1', 'c2', 'c3'], 's1', '2026-12')).toEqual({ evaluated: 2, total: 3, rank: 3.5, level: 'advanced' });
    expect(studentSummary(index, ['c1', 'c2', 'c3'], 's3', '2026-12')).toEqual({ evaluated: 0, total: 3, rank: null, level: null });
    // Another month is another figure.
    expect(studentSummary(index, ['c1', 'c2', 'c3'], 's1', '2026-09').evaluated).toBe(1);
  });

  it('count a competency\'s evaluated pupils and how they spread', () => {
    const summary = competencySummary(index, 'c1', ['s1', 's2', 's3'], '2026-12');
    expect(summary.evaluated).toBe(2);
    expect(summary.total).toBe(3);
    expect(summary.distribution).toEqual({ not_acquired: 0, beginning: 1, in_progress: 0, advanced: 1, mastered: 0 });
  });
});

describe('competency months', () => {
  it('run from September to August', () => {
    const months = competencyMonths('2026-2027');
    expect(months[0]).toBe('2026-09');
    expect(months.at(-1)).toBe('2027-08');
    expect(competencyMonths(undefined)).toEqual([]);
  });

  it('open on this month in the year, else the nearest end', () => {
    const months = competencyMonths('2026-2027');
    expect(defaultMonth(months, '2026-12-14')).toBe('2026-12');
    expect(defaultMonth(months, '2026-07-01')).toBe('2026-09');
    expect(defaultMonth(months, '2027-10-01')).toBe('2027-08');
  });

  it('are named in the page language, capitalised', () => {
    expect(monthLabel('2026-12', 'fr')).toBe('Décembre');
    expect(monthLabel('2026-09', 'en')).toBe('September');
    expect(monthLabel('2026-09', 'es', 'short').toLowerCase().startsWith('sept')).toBe(true);
    expect(monthLabel('bad', 'fr')).toBe('bad');
  });

  it('read a month\'s roster today, on its last day, or on its first ahead', () => {
    expect(rosterDay('2026-12', '2026-12-14')).toBe('2026-12-14');
    expect(rosterDay('2026-11', '2026-12-14')).toBe('2026-11-30');
    expect(rosterDay('2027-02', '2026-12-14')).toBe('2027-02-01');
    expect(rosterDay('2028-02', '2027-12-14')).toBe('2028-02-01');
    expect(rosterDay('2024-02', '2026-12-14')).toBe('2024-02-29');
  });
});

describe('competency options', () => {
  it('offer every level, then Non évalué, each with a catalog label in every language', () => {
    const options = levelOptions(echo);
    expect(options.map((option) => option.value)).toEqual([...COMPETENCY_LEVEL_VALUES, NOT_EVALUATED]);
    for (const language of ['en', 'fr', 'ar', 'es']) {
      for (const option of options) {
        const text = translate(translations, language, option.label);
        expect(text, `${language} ${option.label}`).not.toBe(option.label);
      }
    }
    expect(translate(translations, 'fr', 'competencies.levels.advanced')).toBe('Avancé');
    // Arabic names the school's paper grid, columns أ to ه, then the empty cell.
    expect(options.map((option) => translate(translations, 'ar', option.label))).toEqual(
      ['غياب الاكتساب', 'في بداية الاكتساب', 'في مرحلة متوسطة', 'في مرحلة متقدمة', 'اكتساب متأكد', 'غير مقيَّم'],
    );
  });
});

describe('competency name schema', () => {
  const schema = createCompetencyNameSchema(echo);

  it('takes a name and an optional second-language name, an empty one as none', () => {
    expect(schema.parse({ name: ' Lecture correcte ', altName: 'القراءة السليمة' })).toEqual({ name: 'Lecture correcte', altName: 'القراءة السليمة' });
    expect(schema.parse({ name: 'Copie', altName: '' })).toEqual({ name: 'Copie', altName: null });
  });

  it('refuses an empty or overlong name with a catalog key', () => {
    expect(schema.safeParse({ name: '  ' }).error?.issues[0]?.message).toBe('competencies.errors.nameRequired');
    expect(schema.safeParse({ name: 'x'.repeat(121) }).error?.issues[0]?.message).toBe('competencies.errors.nameTooLong');
  });
});

describe('the language a list is written in', () => {
  const domain = (name: string, items: string[], altName: string | null = null) => ({
    id: name, teacherAssignmentId: 'ta', name, altName, position: 0,
    competencies: items.map((item, position) => ({ id: item, domainId: name, name: item, altName: null, position })),
  });

  it('reads Arabic letters with no Latin ones as Arabic', () => {
    expect(isArabicText('القراءة السليمة')).toBe(true);
    expect(isArabicText('فهم أسئلة النص (1)')).toBe(true);
    expect(isArabicText('Lecture correcte')).toBe(false);
    expect(isArabicText('Lecture · القراءة')).toBe(false);
    expect(isArabicText('2')).toBe(false);
  });

  it('is Arabic only when every domain and competency is named in Arabic', () => {
    expect(catalogLanguage([domain('القراءة', ['القراءة السليمة', 'فهم المقروء']), domain('الكتابة', ['الخط'])])).toBe('ar');
    expect(catalogLanguage([domain('القراءة', ['القراءة السليمة', 'Copie'])])).toBeNull();
    // A French list with Arabic beside it follows the interface, as the mockups show it.
    expect(catalogLanguage([domain('القراءة', ['القراءة السليمة'], 'Lecture')])).toBeNull();
    expect(catalogLanguage([])).toBeNull();
  });
});
