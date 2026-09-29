/** Demo fixtures may reuse classes/sections installed by an older seed. */
export function remapDemoAcademicReferences(
  records: any[], classIds: Map<string, string>, sectionIds = new Map<string, string>(),
) {
  for (const record of records) {
    if (record.classId) record.classId = classIds.get(record.classId) ?? record.classId;
    if (record.sectionId) record.sectionId = sectionIds.get(record.sectionId) ?? record.sectionId;
    if (record.sectionIds) record.sectionIds = record.sectionIds.map((id: string) => sectionIds.get(id) ?? id);
    if (record.assignments) remapDemoAcademicReferences(record.assignments, classIds, sectionIds);
  }
}
