#!/usr/bin/env bun

import {
  SubjectService,
  ClassService,
  ClassRepository,
  SectionService,
  FeeTypeService,
  SettingsService,
} from '@sms/server/modules/seed';
import { getConfiguredSeedAcademicYear } from '../shared/academic-year';
import { academicStructure, parseAcademicLevels } from '../shared/academic-structure';
import { normalizedSettingsData } from '../shared/school-seed-data';

// Seed the school's frame without demo people. The default-data menu choice
// also installs settings once; existing settings and academic records stay.
export async function seedAcademic({ includeSettings = false }: { includeSettings?: boolean } = {}) {
  // Validate all selections before starting the server or writing settings.
  const academicYear = getConfiguredSeedAcademicYear();
  const levels = parseAcademicLevels();
  const structure = academicStructure(academicYear, levels);
  const { runSeedTask } = await import('../shared/run-seed');

  await runSeedTask(`${includeSettings ? 'default data' : 'academic structure'} for ${academicYear}`, async (server) => {
    const subjectService = await server.container.resolve(SubjectService);
    const classService = await server.container.resolve(ClassService);
    const classRepository = await server.container.resolve(ClassRepository);
    const sectionService = await server.container.resolve(SectionService);
    const feeTypeService = await server.container.resolve(FeeTypeService);

    if (includeSettings) {
      const settingsService = await server.container.resolve(SettingsService);
      const existing = await settingsService.getAdminSettings();
      if (!existing) {
        await settingsService.create({ ...normalizedSettingsData, currentAcademicYear: academicYear });
        console.log('✅ Default settings created');
      } else {
        console.log('✅ Existing settings and active academic year kept');
      }
    }

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

    const feeTypes = await feeTypeService.seedDemoFeeTypes(structure.feeTypes);
    console.log(`✅ Fee types: ${feeTypes.length} added, ${structure.feeTypes.length - feeTypes.length} already there`);

    console.log(`\n✨ Academic structure ready for ${academicYear}. It shows in the dashboard once that year exists.`);
  });
}

if (import.meta.main) await seedAcademic();
