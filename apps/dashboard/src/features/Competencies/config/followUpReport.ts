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

/** Report labels use the nearest level, with an exact halfway mean kept at the lower level. */
export function reportLevel(rank: number) {
  const nearest = Math.ceil(rank - 0.5);
  return COMPETENCY_LEVEL_VALUES[Math.min(COMPETENCY_LEVEL_VALUES.length, Math.max(1, nearest)) - 1];
}

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
/**
 * Where a mark stands in the class: its rank among the pupils with a mark
 * (ties share a rank, 1, 1, 3), and the class's highest and lowest marks.
 */
export type Standing = { rank: number | null; ranked: number; high: number | null; low: number | null };
export type Trend = 'up' | 'down' | 'same';
export type CompetencyLine = { id: string; name: string; levels: Record<string, CompetencyLevel | null>; current: CompetencyLevel | null; trend: Trend | null };
export type DomainBlock = { id: string; name: string; lines: CompetencyLine[] };
/** A competency's current level as a rank (1–5), the pupil's beside the class's mean. */
export type SkillRow = { id: string; name: string; rank: number | null; classAverage: number | null };
export type FollowUp = {
  student: MassarStudent;
  parts: PartRow[];
  average: number | null;
  classAverage: number | null;
  diff: number | null;
  appreciation: Appreciation | null;
  /** The subject average's standing, and each part's by its code. */
  standing: { total: Standing; parts: Record<string, Standing> };
  /** The months of the competencies table, the year's first to the Contrôle's. */
  months: string[];
  examMonth: string | null;
  domains: DomainBlock[];
  /** Every competency in the catalog's order: the profile's axes when the Contrôle has too few parts. */
  skills: SkillRow[];
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

const round2 = (value: number) => Math.round(value * 100) / 100;
const mean = (values: number[]) => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null);

/** A mark's standing among the class's marks; a missing mark has no rank. */
export function standing(mark: number | null, marks: readonly number[]): Standing {
  return {
    rank: mark == null ? null : marks.filter((other) => other > mark).length + 1,
    ranked: marks.length,
    high: marks.length ? Math.max(...marks) : null,
    low: marks.length ? Math.min(...marks) : null,
  };
}

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
  const averages = sheet.students.flatMap((student) => { const mark = averageOf(student.id); return mark == null ? [] : [mark]; });
  const classAverage = (() => {
    const average = mean(averages);
    return average == null ? null : round2(average);
  })();
  const partMarks = new Map(sheet.components.map((part) => [part.code, sheet.students.flatMap((student) => { const mark = value(student.id, part.code); return mark == null ? [] : [mark]; })]));
  // Monthly levels can only be attributed to a Contrôle with a known month in this year.
  const plannedMonth = sheet.examFrom?.slice(0, 7);
  const examMonth = plannedMonth && months.includes(plannedMonth) ? plannedMonth : null;
  const shown = examMonth ? months.filter((month) => month <= examMonth) : [];
  const levelOf = new Map(evaluations.map((item) => [`${item.studentId}\u0000${item.competencyId}\u0000${item.month}`, item.level]));
  const remarkOf = new Map(sheet.remarks.map((item) => [item.studentId, item.remark]));
  // A pupil's current level on a competency: the last one set up to the Contrôle's month.
  const currentRank = (studentId: string, competencyId: string) => {
    for (const month of [...shown].reverse()) {
      const found = levelOf.get(`${studentId}\u0000${competencyId}\u0000${month}`);
      if (found) return LEVEL_RANK[found];
    }
    return null;
  };
  const competencies = domains.flatMap((domain) => domain.competencies);
  const skillAverage = new Map(competencies.map((item) => {
    const average = mean(sheet.students.flatMap((student) => { const rank = currentRank(student.id, item.id); return rank == null ? [] : [rank]; }));
    return [item.id, average == null ? null : round2(average)];
  }));

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
      return { id: domain.id, name: domain.name, lines };
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
      standing: {
        total: standing(average, averages),
        parts: Object.fromEntries(parts.map((part) => [part.code, standing(part.mark, partMarks.get(part.code) ?? [])])),
      },
      months: shown,
      examMonth,
      domains: blocks,
      skills: competencies.map((item) => ({ id: item.id, name: item.name, rank: currentRank(student.id, item.id), classAverage: skillAverage.get(item.id) ?? null })),
      indicators: {
        level,
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

/**
 * At most this many table rows (competencies, plus the marks table's: 2 when
 * flat, 7 otherwise) leave about a third of the A4 page empty.
 */
export const ROOMY_ROWS = 8;
/** A short report prints larger, with the pupil's strengths and areas to improve. */
export function isRoomy(report: Pick<FollowUp, 'parts' | 'domains'>) {
  const lines = report.domains.reduce((sum, domain) => sum + domain.lines.length, 0);
  return lines + (report.parts.length > 1 ? 7 : 2) <= ROOMY_ROWS;
}

/** The assessed competencies, Avancé and above as strengths (best first), the rest to improve (weakest first). */
export function strengthsAndNeeds(report: Pick<FollowUp, 'domains'>) {
  const rated = report.domains.flatMap((domain) => domain.lines).filter((line) => line.current);
  const rank = (line: CompetencyLine) => LEVEL_RANK[line.current!];
  return {
    strengths: rated.filter((line) => rank(line) >= ACQUIRED_RANK).sort((a, b) => rank(b) - rank(a)),
    needs: rated.filter((line) => rank(line) < ACQUIRED_RANK).sort((a, b) => rank(a) - rank(b)),
  };
}

const reportNumber = new Intl.NumberFormat('en', { maximumFractionDigits: 1, useGrouping: false });
export const formatNumber = (value: number | null) => (value == null ? '' : reportNumber.format(value));

/** `+0.2`, `−0.3`, `0`. */
export function signed(value: number): string {
  const magnitude = formatNumber(Math.abs(value));
  if (magnitude === '0') return magnitude;
  return `${value < 0 ? '−' : '+'}${magnitude}`;
}

/** One spoke of the profile radar: the pupil's value and the class's on it. */
export type RadarAxis = { name: string; value: number | null; group: number | null };

/** The Contrôle's parts as radar spokes, marks out of the sheet's maximum. */
export const partAxes = (parts: readonly PartRow[]): RadarAxis[] =>
  parts.map((part) => ({ name: part.name, value: part.mark, group: part.classAverage }));
/** The competencies as radar spokes, levels as ranks out of 5. */
export const skillAxes = (skills: readonly SkillRow[]): RadarAxis[] =>
  skills.map((skill) => ({ name: skill.name, value: skill.rank, group: skill.classAverage }));

/**
 * What the profile draws: the Contrôle's parts when it has three or more,
 * else the competencies when there are three or more and the pupil has a
 * level on one. Null when neither makes a radar.
 */
export function profileAxes(report: Pick<FollowUp, 'parts' | 'skills'>, maxMark: number) {
  if (report.parts.length >= 3) return { kind: 'parts' as const, axes: partAxes(report.parts), max: maxMark };
  if (report.skills.length >= 3 && report.skills.some((skill) => skill.rank != null)) {
    return { kind: 'skills' as const, axes: skillAxes(report.skills), max: LEVEL_RANK.mastered };
  }
  return null;
}

/**
 * The pupil's and the class's values on each axis as two polygons on a radar,
 * 0 at the centre and the maximum at the rim. Needs three axes or more.
 */
export function radar(axes: readonly RadarAxis[], max: number, size: number, pad = 34, rings: readonly number[] = [0.25, 0.5, 0.75, 1]) {
  const centre = size / 2;
  const radius = centre - pad;
  const angle = (index: number) => -Math.PI / 2 + (index * 2 * Math.PI) / axes.length;
  const point = (index: number, share: number) => ({
    x: round2(centre + Math.cos(angle(index)) * radius * share),
    y: round2(centre + Math.sin(angle(index)) * radius * share),
  });
  const series = (pick: (axis: RadarAxis) => number | null) =>
    axes.map((axis, index) => {
      const value = pick(axis);
      return value == null ? null : point(index, Math.max(0, Math.min(1, value / max)));
    });
  return {
    centre,
    rings: rings.map((share) => axes.map((_, index) => point(index, share))),
    axes: axes.map((axis, index) => ({ end: point(index, 1), label: point(index, 1 + 18 / radius), name: axis.name })),
    pupil: series((axis) => axis.value),
    group: series((axis) => axis.group),
  };
}
