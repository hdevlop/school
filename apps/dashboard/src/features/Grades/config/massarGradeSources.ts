import type { MassarGradeSource, MassarMark } from '@sms/contracts';

/** The Massar component replaces its exact linked exam, keeping one mark entry. */
export function examSourcesWithMassar<T extends { id: string }>(exams: T[], components: MassarGradeSource[]) {
  const linked = new Set(components.flatMap(source => source.linkedExamId ? [source.linkedExamId] : []));
  return [
    ...[...components].sort((a, b) => a.term - b.term || a.exam - b.exam),
    ...exams.filter(exam => !linked.has(exam.id)),
  ];
}

/** Repeated components name their semester and control so marks cannot land in the wrong round. */
export function massarSourceLabels(sources: MassarGradeSource[]) {
  const key = (source: MassarGradeSource) => JSON.stringify([source.classId, source.sectionId, source.subjectId, source.title]);
  const counts = new Map<string, number>();
  for (const source of sources) counts.set(key(source), (counts.get(key(source)) ?? 0) + 1);
  return new Map(sources.map(source => [source.id, counts.get(key(source))! > 1
    ? `${source.title} · ${source.termLabel} · ${source.examLabel}`
    : source.title]));
}

/** Empty marks clear a cell; missed exams become Massar's justified absence. */
export function massarMarkFromGrade(studentId: string, componentCode: string, grade: { marksObtained: unknown; status?: string }): MassarMark {
  const absent = grade.status === 'missed';
  return {
    studentId, componentCode,
    mark: absent || grade.marksObtained == null || grade.marksObtained === '' ? null : Number(grade.marksObtained),
    absence: absent ? 'justified' : 'none',
  };
}
