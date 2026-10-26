#!/usr/bin/env bun

import {
  SubjectService,
  ClassService,
  ClassRepository,
  SectionService,
  FeeTypeService,
  SettingsService,
  AcademicYearRepository,
  CycleService,
} from '@sms/server/modules/seed';
import { SCHOOL_ACADEMIC_CYCLES, schoolCycleForLevel } from '@sms/contracts';
import { getConfiguredSeedAcademicYear, getSeedAcademicYear } from '../shared/academic-year';
import { academicStructure, parseAcademicLevels } from '../shared/academic-structure';
import { normalizedSettingsData } from '../shared/school-seed-data';

// Seed the school's frame without demo people. The default-data menu choice
// also installs settings once; existing settings and academic records stay.
// Default data asks for no year: subjects and fee types belong to the school,
// and every registered year gets the same default classes and sections, which
// the school then edits year by year. --year limits the classes to one year.
export async function seedAcademic({ includeSettings = false }: { includeSettings?: boolean } = {}) {
  // Validate all selections before starting the server or writing settings.
  const requestedYear = process.argv.slice(2).some((value) => value === '--year' || value.startsWith('--year='))
    ? getConfiguredSeedAcademicYear()
    : undefined;
  const levels = parseAcademicLevels();
  const { runSeedTask } = await import('../shared/run-seed');

  await runSeedTask(includeSettings ? 'default data' : `academic structure for ${requestedYear ?? getSeedAcademicYear()}`, async (server) => {
    const subjectService = await server.container.resolve(SubjectService);
    const classService = await server.container.resolve(ClassService);
    const classRepository = await server.container.resolve(ClassRepository);
    const sectionService = await server.container.resolve(SectionService);
    const feeTypeService = await server.container.resolve(FeeTypeService);

    let academicYears = [requestedYear ?? getSeedAcademicYear()];
    if (includeSettings) {
      const settingsService = await server.container.resolve(SettingsService);
      const existing = await settingsService.getAdminSettings();
      if (!existing) {
        await settingsService.create({ ...normalizedSettingsData, currentAcademicYear: academicYears[0] });
        console.log(`✅ Default settings created; active academic year ${academicYears[0]}`);
      } else {
        console.log(`✅ Existing settings and active academic year ${existing.currentAcademicYear} kept`);
      }
      if (!requestedYear) {
        const registered = await (await server.container.resolve(AcademicYearRepository)).list();
        academicYears = registered.length
          ? registered.map((year) => year.label)
          : [existing?.currentAcademicYear ?? academicYears[0]];
      }
    }

    console.log(`🌱 Levels: ${levels.join(', ')}`);

    // Cycles belong to every year; classes are linked to theirs by level.
    const cycleService = await server.container.resolve(CycleService);
    const stages = SCHOOL_ACADEMIC_CYCLES.filter((stage) => levels.some((level) => schoolCycleForLevel(level) === stage));
    const cycles = await cycleService.seedDefaultCycles(stages);
    console.log(`✅ Cycles: ${cycles.length} added, ${stages.length - cycles.length} already there`);

    const { subjects: defaultSubjects, feeTypes: defaultFeeTypes } = academicStructure(academicYears[0], levels);
    const subjects = await subjectService.seedDemoSubjects(defaultSubjects);
    console.log(`✅ Subjects: ${subjects.length} added, ${defaultSubjects.length - subjects.length} already there`);

    const feeTypes = await feeTypeService.seedDemoFeeTypes(defaultFeeTypes);
    console.log(`✅ Fee types: ${feeTypes.length} added, ${defaultFeeTypes.length - feeTypes.length} already there`);

    for (const academicYear of academicYears) {
      const structure = academicStructure(academicYear, levels);
      const classes = await classService.seedDemoClasses(structure.classes);
      console.log(`✅ ${academicYear} classes: ${classes.length} added, ${structure.classes.length - classes.length} already there`);

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
      console.log(`✅ ${academicYear} sections: ${sections.length} added, ${structure.sections.length - sections.length} already there`);
    }

    console.log(`
✨ Academic structure ready for ${academicYears.join(', ')}. Each year's classes and sections can now be changed on their own.`);
  });
}

if (import.meta.main) await seedAcademic();
