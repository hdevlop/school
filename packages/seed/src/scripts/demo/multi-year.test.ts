import { expect, it } from 'bun:test';

function generateYear(year: string) {
  const generator = new URL('./generator.ts', import.meta.url).href;
  const structure = new URL('../shared/school-seed-data.ts', import.meta.url).href;
  // Each CLI run has its own year configuration; no database or output files are used.
  const script = `
    import * as g from ${JSON.stringify(generator)};
    import { schoolSeedData } from ${JSON.stringify(structure)};
    const { students, fees } = await g.studentsPack();
    const { teachers } = await g.teachersPack();
    const { vehicles } = await g.transportPack();
    console.log(JSON.stringify({
      structure: schoolSeedData, students, fees, teachers, vehicles,
      ...await g.expensesPack(), ...g.assessmentsPack(teachers), ...g.examsPack(teachers),
      ...g.eventsPack(), ...g.disciplinePack(students, teachers), ...g.behaviorRewardsPack(students, teachers),
      ...g.refuelsPack(vehicles, []), ...g.maintenancePack(vehicles), ...g.payrollPack(), ...g.staffPack(),
    }));
  `;
  const result = Bun.spawnSync([process.execPath, '--eval', script, '--',
    'demo-year-probe', `--year=${year}`, '--students=12', '--teachers=6', '--staff=4', '--expenses=8',
  ]);
  expect(result.exitCode).toBe(0);
  if (result.exitCode) throw new Error(result.stderr.toString());
  return JSON.parse(result.stdout.toString());
}

it('generates two independent year datasets with matching relationships and historical dates', () => {
  const datasets = ['2023-2024', '2024-2025'].map(generateYear);
  for (const [index, data] of datasets.entries()) {
    const label = ['2023-2024', '2024-2025'][index];
    const startsOn = `${label.slice(0, 4)}-09-01`;
    const endsOn = `${label.slice(5)}-08-31`;
    const classes = new Map<string, any>(data.structure.classesData.map((item: any) => [item.id, item]));
    const sections = new Map<string, any>(data.structure.sectionsData.map((item: any) => [item.id, item]));
    expect(data.students).toHaveLength(12);
    for (const student of data.students) {
      expect(classes.get(student.classId)?.academicYear).toBe(label);
      expect(sections.get(student.sectionId)?.classId).toBe(student.classId);
      expect(student.yearEnrolledOn >= startsOn && student.yearEnrolledOn <= endsOn).toBe(true);
    }
    for (const fee of data.fees) expect(fee.academicYear).toBe(label);
    for (const teacher of data.teachers) {
      for (const assignment of teacher.assignments) {
        expect(classes.has(assignment.classId)).toBe(true);
        for (const section of assignment.sectionIds) expect(sections.get(section)?.classId).toBe(assignment.classId);
      }
    }
    const dates = [
      ...data.expenses.map((item: any) => item.expenseDate),
      ...data.assessments.map((item: any) => item.date), ...data.exams.map((item: any) => item.date),
      ...data.events.map((item: any) => item.startDate),
      ...data.refuels.map((item: any) => item.datetime.slice(0, 10)),
      ...data.maintenance.map((item: any) => item.scheduledDate),
      ...data.disciplineIncidents.map((item: any) => item.incidentAt.slice(0, 10)),
      ...data.behaviorRewards.map((item: any) => item.behaviorAt.slice(0, 10)),
    ];
    for (const date of dates) expect(date >= startsOn && date <= endsOn).toBe(true);
    expect(data.payrollPeriods).toHaveLength(10);
    expect(data.payrollPeriods[0]).toBe(`${label.slice(0, 4)}-09`);
    expect(data.payrollPeriods.at(-1)).toBe(`${label.slice(5)}-06`);
  }
  const identityValues = (data: any) => [
    ...data.structure.classesData.map((item: any) => item.id),
    ...data.structure.sectionsData.map((item: any) => item.id),
    ...data.assessments.map((item: any) => item.id), ...data.exams.map((item: any) => item.id),
    ...data.staff.map((item: any) => item.id), ...data.staff.map((item: any) => item.employeeCode),
    ...data.vehicles.map((item: any) => item.licensePlate),
    ...data.refuels.map((item: any) => item.voucherNumber),
  ];
  const first = new Set(identityValues(datasets[0]));
  expect(identityValues(datasets[1]).some((id) => first.has(id))).toBe(false);
  const repeated = generateYear('2023-2024');
  expect(repeated.structure.classesData.map((item: any) => item.id))
    .toEqual(datasets[0].structure.classesData.map((item: any) => item.id));
  for (const collection of ['assessments', 'exams', 'staff']) {
    const earlier = new Set(datasets[0][collection].map((item: any) => item.id));
    expect(repeated[collection].some((item: any) => earlier.has(item.id))).toBe(false);
  }
  expect(repeated.vehicles.some((item: any) => datasets[0].vehicles.some((vehicle: any) => vehicle.licensePlate === item.licensePlate)))
    .toBe(false);
  const priorVouchers = new Set(datasets[0].refuels.map((item: any) => item.voucherNumber));
  expect(repeated.refuels.some((item: any) => priorVouchers.has(item.voucherNumber))).toBe(false);
});
