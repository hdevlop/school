#!/usr/bin/env bun

import {
  SubjectService,
  ClassService,
  ClassRepository,
  SectionService,
} from '@sms/server/modules/seed';
import { runSeedTask } from '../shared/run-seed';
import { getConfiguredSeedAcademicYear } from '../shared/academic-year';
import { academicStructure, parseAcademicLevels } from '../shared/academic-structure';

// Only the school's academic frame: no settings, years, fees or people. A
// class, section or subject that already exists is kept as it is, so the
// command can be run again, or after a reset, without duplicating anything.
const academicYear = getConfiguredSeedAcademicYear();
const levels = parseAcademicLevels();
const structure = academicStructure(academicYear, levels);

runSeedTask(`academic structure for ${academicYear}`, async (server) => {
  const subjectService = await server.container.resolve(SubjectService);
  const classService = await server.container.resolve(ClassService);
  const classRepository = await server.container.resolve(ClassRepository);
  const sectionService = await server.container.resolve(SectionService);

  console.log(`🌱 Levels: ${levels.join(', ')}`);

  const subjects = await subjectService.seedDemoSubjects(structure.subjects);
  console.log(`✅ Subjects: ${subjects.length} added, ${structure.subjects.length - subjects.length} already there`);

  const classes = await classService.seedDemoClasses(structure.classes);
  console.log(`✅ Classes: ${classes.length} added, ${structure.classes.length - classes.length} already there`);

  const classIds = new Map<string, string>();
  for (const { name } of structure.classes) {
    const schoolClass = await classRepository.getByName(name, academicYear);
    if (!schoolClass) throw new Error(`Class ${name} was not created in ${academicYear}`);
    classIds.set(name, schoolClass.id);
  }

  const sections = await sectionService.seedDemoSections(structure.sections.map(({ className, ...section }) => ({
    ...section,
    classId: classIds.get(className)!,
    status: 'active' as const,
  })));
  console.log(`✅ Sections: ${sections.length} added, ${structure.sections.length - sections.length} already there`);

  console.log(`\n✨ Academic structure ready for ${academicYear}. It shows in the dashboard once that year exists.`);
});
