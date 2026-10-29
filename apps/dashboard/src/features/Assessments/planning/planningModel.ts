import { compareClassNames, toOfficialClassName, type AssessmentPlanning, type RevisionGroup } from '@sms/contracts';

export type PlanningAssessment = {
  id: string;
  title: string;
  date: string;
  status: string;
  description?: string | null;
  instructions?: string | null;
  planning?: AssessmentPlanning | null;
  sectionIds?: string[] | null;
  class?: { id: string; name: string } | null;
  section?: { id: string; name: string } | null;
  targetSections?: { id: string; name: string; classId: string }[];
  subject?: { id: string; name: string } | null;
  teacher?: { id: string; name: string | null } | null;
};

export type PlanningFilters = {
  classId?: string;
  sectionId?: string;
  round?: string | null;
  semester?: 1 | 2;
  from?: string;
  to?: string;
};

export const CLASS_DOCUMENT_COLORS = [
  ['#D94F8A', '#FCE8F1'], ['#E07B12', '#FDF0E1'], ['#2E9A57', '#E5F4EB'],
  ['#11899A', '#E0F2F4'], ['#2F66C4', '#E5EDFA'], ['#7A4DBA', '#EFE8F8'],
] as const;

export function classDocumentColors(name: string): readonly [string, string] {
  const grade = /^([1-6])APG$/i.exec(toOfficialClassName(name));
  return CLASS_DOCUMENT_COLORS[grade ? Number(grade[1]) - 1 : 4];
}

/** The reference uses smaller lesson type for the denser upper-primary schedules. */
export function classDocumentTypography(name: string): readonly [number, number] {
  const grade = /^([1-6])APG$/i.exec(toOfficialClassName(name));
  const sizes = [[12.5, 13.5], [12.5, 13.5], [11.5, 12.5], [11, 12], [11, 12], [9.5, 10.5]] as const;
  return sizes[grade ? Number(grade[1]) - 1 : 3];
}

export function revisionGroups(record: PlanningAssessment): RevisionGroup[] {
  if (record.planning) return record.planning.groups;
  const lessons = [record.description, record.instructions].filter(Boolean)
    .join('\n').split(/\r?\n/).map(line => line.replace(/^\s*[•*-]\s*/, '').trim()).filter(Boolean);
  return [{ label: '', language: /[\u0600-\u06ff]/.test(lessons.join(' ')) ? 'ar' : 'fr', lessons }];
}

export function targetSections(record: PlanningAssessment) {
  if (record.targetSections?.length) return record.targetSections;
  return record.section ? [{ ...record.section, classId: record.class?.id ?? '' }] : [];
}

export function filterPlanningAssessments(records: readonly PlanningAssessment[], filters: PlanningFilters) {
  return records.filter(record => record.status !== 'cancelled'
    && (!filters.classId || record.class?.id === filters.classId)
    && (!filters.sectionId || (record.sectionIds?.length
      ? record.sectionIds.includes(filters.sectionId) : record.section?.id === filters.sectionId))
    && (filters.round == null || (record.planning?.round ?? '') === filters.round)
    && (!filters.semester || !record.planning || record.planning.semester === filters.semester)
    && (!filters.from || record.date >= filters.from)
    && (!filters.to || record.date <= filters.to))
    .sort((a, b) => a.date.localeCompare(b.date)
      || (a.subject?.name ?? '').localeCompare(b.subject?.name ?? '') || a.id.localeCompare(b.id));
}

export function planningClasses(records: readonly PlanningAssessment[]) {
  return [...new Map(records.filter(record => record.class?.id)
    .map(record => [record.class!.id, record.class!])).values()]
    .sort((a, b) => compareClassNames(a.name, b.name));
}

export function planningDays(records: readonly PlanningAssessment[]) {
  const days = new Map<string, PlanningAssessment[]>();
  for (const record of records) days.set(record.date, [...(days.get(record.date) ?? []), record]);
  return [...days.entries()].sort(([a], [b]) => a.localeCompare(b));
}
