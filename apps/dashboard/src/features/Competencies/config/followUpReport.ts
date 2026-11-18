import { COMPETENCY_LEVEL_VALUES, type CompetencyDomain, type CompetencyEvaluation, type CompetencyLevel, type CompetencyRemark, type MassarSheetDetail, type MassarStudent } from '@sms/contracts';
import { LEVEL_RANK } from './competencyLevels';

/**
 * تقرير التتبع: one pupil after one Massar Contrôle, in one class and subject.
 * The Contrôle's marks part by part beside the class's, the pupil's
 * competencies month by month up to the Contrôle's month, the mastery
 * indicators drawn from both, and the teacher's remark. Shared by the screen
 * and the printout.
 */

/** A level's share of mastery: Maîtrisé 100 %, Début 40 %. */
export const levelShare = (level: CompetencyLevel) => LEVEL_RANK[level] * 20;
/** Avancé or more counts as acquired; Début or less needs support. */
export const ACQUIRED_RANK = LEVEL_RANK.advanced;
export const SUPPORT_RANK = LEVEL_RANK.beginning;

export type Appreciation = 'excellent' | 'veryGood' | 'good' | 'average' | 'weak';
/** A mark's appraisal from its share of the maximum: 6/10 is average, 7 good, 8 very good. */
export function appreciation(mark: number | null, max: number): Appreciation | null {
  if (mark == null || !max) return null;
  const share = mark / max;
  return share >= 0.9 ? 'excellent' : share >= 0.8 ? 'veryGood' : share >= 0.7 ? 'good' : share >= 0.5 ? 'average' : 'weak';
}

export type PartRow = {
  code: string;
  name: string;
  mark: number | null;
  absent: boolean;
  classAverage: number | null;
  diff: number | null;
  appreciation: Appreciation | null;
};
export type Trend = 'up' | 'down' | 'same';
export type CompetencyLine = { id: string; name: string; levels: Record<string, CompetencyLevel | null>; current: CompetencyLevel | null; trend: Trend | null };
export type DomainBlock = { id: string; name: string; average: number | null; acquiredShare: number | null; lines: CompetencyLine[] };
export type FollowUp = {
  student: MassarStudent;
  parts: PartRow[];
  average: number | null;
  classAverage: number | null;
  diff: number | null;
  appreciation: Appreciation | null;
  /** The months of the competencies table, the year's first to the Contrôle's. */
  months: string[];
  examMonth: string | null;
  domains: DomainBlock[];
  indicators: {
    level: number | null;
    acquired: number;
    support: number;
    total: number;
    /** Acquired over all, in percent. */
    mastery: number | null;
    distribution: Record<CompetencyLevel, number>;
  };
  remark: string | null;
};

const round1 = (value: number) => Math.round(value * 10) / 10;
const round2 = (value: number) => Math.round(value * 100) / 100;
const mean = (values: number[]) => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null);

export function followUps({ sheet, domains, evaluations, remarks, months }: {
  sheet: MassarSheetDetail;
  domains: readonly CompetencyDomain[];
  evaluations: readonly CompetencyEvaluation[];
  remarks: readonly CompetencyRemark[];
  /** The year's months. */
  months: readonly string[];
}): FollowUp[] {
  const markOf = new Map(sheet.marks.map((item) => [`${item.studentId}\u0000${item.componentCode}`, item]));
  const value = (studentId: string, code: string) => markOf.get(`${studentId}\u0000${code}`)?.mark ?? null;
  const averageOf = (studentId: string) => {
    const marks = sheet.components.flatMap((part) => { const mark = value(studentId, part.code); return mark == null ? [] : [mark]; });
    const average = mean(marks);
    return average == null ? null : round2(average);
  };
  const partAverage = new Map(sheet.components.map((part) => {
    const average = mean(sheet.students.flatMap((student) => { const mark = value(student.id, part.code); return mark == null ? [] : [mark]; }));
    return [part.code, average == null ? null : round2(average)];
  }));
  const classAverage = (() => {
    const average = mean(sheet.students.flatMap((student) => { const mark = averageOf(student.id); return mark == null ? [] : [mark]; }));
    return average == null ? null : round2(average);
  })();
  // Monthly levels can only be attributed to a Contrôle with a known month in this year.
  const plannedMonth = sheet.examFrom?.slice(0, 7);
  const examMonth = plannedMonth && months.includes(plannedMonth) ? plannedMonth : null;
  const shown = examMonth ? months.filter((month) => month <= examMonth) : [];
  const levelOf = new Map(evaluations.map((item) => [`${item.studentId}\u0000${item.competencyId}\u0000${item.month}`, item.level]));
  const remarkOf = new Map(sheet.remarks.map((item) => [item.studentId, item.remark]));

  return sheet.students.map((student) => {
    const parts: PartRow[] = sheet.components.map((part) => {
      const mark = value(student.id, part.code);
      const average = partAverage.get(part.code) ?? null;
      return {
        code: part.code,
        name: part.name,
        mark,
        absent: markOf.get(`${student.id}\u0000${part.code}`)?.absence === 'justified',
        classAverage: average,
        diff: mark != null && average != null ? round2(mark - average) : null,
        appreciation: appreciation(mark, sheet.maxMark),
      };
    });
    const average = averageOf(student.id);

    const blocks: DomainBlock[] = domains.map((domain) => {
      const lines: CompetencyLine[] = domain.competencies.map((item) => {
        const levels = Object.fromEntries(shown.map((month) => [month, levelOf.get(`${student.id}\u0000${item.id}\u0000${month}`) ?? null]));
        const set = shown.filter((month) => levels[month]);
        const current = set.length ? levels[set.at(-1)!] : null;
        const before = set.length > 1 ? levels[set.at(-2)!] : null;
        const trend: Trend | null = current && before
          ? LEVEL_RANK[current] > LEVEL_RANK[before] ? 'up' : LEVEL_RANK[current] < LEVEL_RANK[before] ? 'down' : 'same'
          : null;
        return { id: item.id, name: item.name, levels, current, trend };
      });
      const ranks = lines.flatMap((line) => (line.current ? [LEVEL_RANK[line.current]] : []));
      const domainAverage = mean(ranks);
      return {
        id: domain.id,
        name: domain.name,
        average: domainAverage == null ? null : round1(domainAverage),
        acquiredShare: ranks.length ? Math.round((ranks.filter((rank) => rank >= ACQUIRED_RANK).length / ranks.length) * 100) : null,
        lines,
      };
    });
    const current = blocks.flatMap((block) => block.lines.flatMap((line) => (line.current ? [line.current] : [])));
    const ranks = current.map((level) => LEVEL_RANK[level]);
    const level = mean(ranks);
    const acquired = ranks.filter((rank) => rank >= ACQUIRED_RANK).length;
    const distribution = Object.fromEntries(COMPETENCY_LEVEL_VALUES.map((item) => [item, current.filter((levelItem) => levelItem === item).length])) as Record<CompetencyLevel, number>;
    // The remark the teacher wrote on the Massar grid for this Contrôle, else the one for the parents that month.
    const monthRemark = remarks.find((item) => item.studentId === student.id && item.month === examMonth)?.body.trim();

    return {
      student,
      parts,
      average,
      classAverage,
      diff: average != null && classAverage != null ? round2(average - classAverage) : null,
      appreciation: appreciation(average, sheet.maxMark),
      months: shown,
      examMonth,
      domains: blocks,
      indicators: {
        level: level == null ? null : round1(level),
        acquired,
        support: ranks.filter((rank) => rank <= SUPPORT_RANK).length,
        total: domains.reduce((sum, domain) => sum + domain.competencies.length, 0),
        mastery: ranks.length ? Math.round((acquired / domains.reduce((sum, domain) => sum + domain.competencies.length, 0)) * 100) : null,
        distribution,
      },
      remark: remarkOf.get(student.id)?.trim() || monthRemark || null,
    };
  });
}

/** `+0.2`, `−0.23`, `0`. */
export const signed = (value: number) => (value > 0 ? `+${value}` : value < 0 ? `−${Math.abs(value)}` : '0');
export const formatNumber = (value: number | null) => (value == null ? '' : String(value));

/**
 * The pupil's and the class's marks on each part as two polygons on a radar,
 * 0 at the centre and the maximum at the rim. Needs three parts or more.
 */
export function radar(parts: readonly PartRow[], max: number, size: number, pad = 34) {
  const centre = size / 2;
  const radius = centre - pad;
  const angle = (index: number) => -Math.PI / 2 + (index * 2 * Math.PI) / parts.length;
  const point = (index: number, share: number) => ({
    x: round2(centre + Math.cos(angle(index)) * radius * share),
    y: round2(centre + Math.sin(angle(index)) * radius * share),
  });
  const polygon = (pick: (part: PartRow) => number | null) =>
    parts.map((part, index) => point(index, Math.max(0, Math.min(1, (pick(part) ?? 0) / max))));
  return {
    centre,
    rings: [0.25, 0.5, 0.75, 1].map((share) => parts.map((_, index) => point(index, share))),
    axes: parts.map((part, index) => ({ end: point(index, 1), label: point(index, 1 + 18 / radius), name: part.name })),
    pupil: polygon((part) => part.mark),
    group: polygon((part) => part.classAverage),
  };
}
