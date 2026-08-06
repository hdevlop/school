#!/usr/bin/env bun

import {
  SettingsService,
  SubjectService,
  ClassService,
  SectionService,
  FeeTypeService,
  ParentService,
  TeacherService,
  StudentService,
  AttendanceService,
} from '@server/modules/seed';
import { runSeedTask } from '../shared/run-seed';
import { schoolSeedData } from '../shared/school-seed-data';
import { seedAttendance } from '../shared/seed-attendance';
import { studentsPack, teachersPack } from '../demo/generator';

const { students: studentsData, parents: parentsData } = await studentsPack();
const { teachers: teachersData } = await teachersPack();

runSeedTask('school seed', async (server) => {
  const settingsService = await server.container.resolve(SettingsService);
  const subjectService = await server.container.resolve(SubjectService);
  const classService = await server.container.resolve(ClassService);
  const sectionService = await server.container.resolve(SectionService);
  const feeTypeService = await server.container.resolve(FeeTypeService);
  const parentService = await server.container.resolve(ParentService);
  const teacherService = await server.container.resolve(TeacherService);
  const studentService = await server.container.resolve(StudentService);
  const attendanceService = await server.container.resolve(AttendanceService);

  console.log('🌱 Seeding school structure...');

  await settingsService.create(schoolSeedData.settingsData);
  console.log('✅ Settings seeded');

  await subjectService.seedDemoSubjects(schoolSeedData.subjectsData);
  console.log('✅ Subjects seeded');

  await classService.seedDemoClasses(schoolSeedData.classesData);
  console.log('✅ Classes seeded');

  await sectionService.seedDemoSections(schoolSeedData.sectionsData);
  console.log('✅ Sections seeded');

  await feeTypeService.seedDemoFeeTypes(schoolSeedData.feeTypesData);
  console.log('✅ Fee types seeded');

  await parentService.createBulk(parentsData);
  console.log('✅ Parents seeded');

  await teacherService.createBulk(teachersData);
  console.log('✅ Teachers seeded');

  await studentService.createBulk(studentsData);
  console.log('✅ Students seeded');

  console.log('📋 Seeding attendance...');
  const { studentCount, staffCount } = await seedAttendance(attendanceService, studentService, teacherService);
  console.log(`✅ Attendance seeded (${studentCount} student records, ${staffCount} staff records)`);

  console.log('\n✨ School structure seeded successfully!');
});
