import 'reflect-metadata';
import assert from 'node:assert/strict';
import { describe, expect, it } from 'bun:test';
import { Container } from 'diject';
import { and, eq, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

const raw = process.env.SCHOOL_HISTORY_TEST_DB_URL;
if (!raw) throw new Error('SCHOOL_HISTORY_TEST_DB_URL is required');
const target = new URL(raw);
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(target.hostname));
assert.equal(target.pathname, '/school_history_test');
process.env.DB_URL = raw;

const { db } = await import('../../src/database/db');
const { users, roles, students, parents, studentParents, academicYears } = await import('../../src/database/schema');
const { ScopeContext } = await import('../../src/auth');
const { registerYearPropertyInjector, runWithResolvedYear } = await import('../../src/modules/academicYears/requestYear');
const { StudentRepository } = await import('../../src/modules/students/StudentRepository');
const { StudentService } = await import('../../src/modules/students/StudentService');
const { StudentValidator } = await import('../../src/modules/students/StudentValidator');
const { importStudentDto } = await import('../../src/modules/students/StudentDto');
const { ParentRepository } = await import('../../src/modules/parents/ParentRepository');
const { ParentChildrenRepository } = await import('../../src/modules/parents/ParentChildrenRepository');
const { ParentService } = await import('../../src/modules/parents/ParentService');
const { ParentValidator } = await import('../../src/modules/parents/ParentValidator');
const { importParentDto } = await import('../../src/modules/parents/ParentDto');
const { StudentEnrollmentRepository } = await import('../../src/modules/studentEnrollments/StudentEnrollmentRepository');
const { withEnglishMessages } = await import('../support/englishMessages');
const rollback = Symbol('rollback');

describe('family records on the local history fixture, rolled back', () => {
  it('stores siblings without accounts and exposes both only through their linked parent account', async () => {
    const before = await db.execute(sql`select (select count(*) from students)::int as students, (select count(*) from parents)::int as parents, (select count(*) from users)::int as users`);
    try {
      await db.transaction(async tx => {
        const [year] = await tx.select().from(academicYears).where(eq(academicYears.id, 'history-year-2026'));
        assert.ok(year, 'Expected the marked history fixture');
        const container = Container.create();
        registerYearPropertyInjector(container);
        container.set(ScopeContext);
        container.set(StudentRepository); container.set(ParentRepository); container.set(ParentChildrenRepository);
        const studentRepo = await container.resolve(StudentRepository);
        const parentRepo = await container.resolve(ParentRepository);
        const childrenRepo = await container.resolve(ParentChildrenRepository);
        for (const repo of [studentRepo, parentRepo, childrenRepo]) repo.db = tx as unknown as typeof db;
        const enrollmentRepo = new StudentEnrollmentRepository();
        enrollmentRepo.db = tx as unknown as typeof db;
        const parentValidator = withEnglishMessages(new ParentValidator(parentRepo, {} as any));
        const storage = { processFile: async (_namespace: string, image: unknown, options: any) => image || options.fallback };
        // Exercise School's provisioning decision with an identity-enforcing
        // account writer. No mail, real password issuance or auth tokens leave this test.
        const invitedRoles: string[] = [];
        const auth = { inviteUser: async (input: any) => {
          assert.ok(input.email || input.phone, 'A login must have an identity');
          invitedRoles.push(input.role);
          let [role] = await tx.select().from(roles).where(eq(roles.name, input.role));
          if (!role) [role] = await tx.insert(roles).values({ id: nanoid(10), name: input.role }).returning();
          const [user] = await tx.insert(users).values({
            id: nanoid(10), name: input.name, email: input.email, phone: input.phone,
            password: 'unusable-test-hash', roleId: role.id, status: 'pending',
          }).returning();
          return { ...user, emailSent: false };
        } };
        const parentService = new ParentService(parentRepo, parentValidator, {} as any, auth as any, storage as any, childrenRepo);
        const validator = withEnglishMessages(new StudentValidator(studentRepo, {} as any, {
          ensureClassId: async (id: string) => { assert.equal(id, 'history-class-2026'); return id; },
        } as any, {
          ensureSectionInClass: async (id: string) => assert.equal(id, 'history-section-2026-a'),
        } as any, enrollmentRepo));
        const enrollments = {
          resolveNewStudentPlacement: async () => year,
          create: async (data: any, actorId: string) => {
            const row = await enrollmentRepo.create({ studentId: data.studentId, academicYearId: year.id, enrolledOn: data.enrolledOn });
            await enrollmentRepo.addPlacement({ enrollmentId: row.id, classId: data.classId, sectionId: data.sectionId, validFrom: data.enrolledOn, actorId });
          },
        };
        const service = new StudentService(studentRepo, validator, {} as any, auth as any, parentService,
          { processFees: async () => {} } as any, {} as any, enrollments as any, storage as any);
        const asActor = <T>(actor: { id: string; role: string }, run: () => T) =>
          container.run({ user: actor }, () => runWithResolvedYear(container, year, run));
        const admin = { id: 'history-admin', role: 'admin' };
        const created: string[] = [];
        for (const code of ['family-probe-1', 'family-probe-2']) {
          const row = await asActor(admin, () => service.createForImport(importStudentDto.parse({
            studentCode: code, name: 'Family Probe Student', arabicName: 'ياسمين العلوي', gender: 'F',
            classId: 'history-class-2026', sectionId: 'history-section-2026-a',
            enrollmentDate: '2026-09-01', yearEnrolledOn: '2026-09-01',
            parents: [{ name: 'Family Probe Guardian', phone: '+212699999991', relationshipType: 'guardian' }],
          }), admin));
          expect(row.userId).toBeNull();
          created.push(row.id);
        }
        expect(invitedRoles).toEqual(['parent']);
        const [parent] = await tx.select().from(parents).where(eq(parents.phone, '+212699999991'));
        expect(parent.cin).toBeNull();
        expect(await tx.select().from(studentParents).where(eq(studentParents.parentId, parent.id))).toHaveLength(2);
        const parentActor = { id: parent.userId!, role: 'parent' };
        const roster = await asActor(parentActor, () => studentRepo.getAll());
        expect(roster.map(row => row.id).sort()).toEqual(created.toSorted());
        expect(roster.every(row => row.missingParentDetails === true)).toBe(true);
        await tx.update(parents).set({ cin: 'FAMILY99' }).where(eq(parents.id, parent.id));
        expect((await asActor(parentActor, () => studentRepo.getAll())).every(row => row.missingParentDetails === false)).toBe(true);

        const withoutParent = await asActor(admin, () => service.createForImport(importStudentDto.parse({
          studentCode: 'family-probe-no-parent', name: 'Family Probe Without Guardian', gender: 'F',
          classId: 'history-class-2026', sectionId: 'history-section-2026-a',
          enrollmentDate: '2026-09-01', yearEnrolledOn: '2026-09-01',
        }), admin));
        expect((await asActor(admin, () => studentRepo.getAll({ studentId: withoutParent.id })))[0].missingParentDetails).toBe(true);
        const incomplete = await asActor(admin, () => parentService.createForImport(importParentDto.parse({ name: 'Family Probe Additional Guardian', relationshipType: 'guardian' })));
        await asActor(admin, () => parentService.linkStudent(incomplete.id, created[0]));
        expect((await asActor(admin, () => studentRepo.getAll({ studentId: created[0] })))[0].missingParentDetails).toBe(true);
        // Keep the original sibling-link assertions below focused on their shared parent.
        await tx.delete(studentParents).where(eq(studentParents.parentId, incomplete.id));
        expect(roster.every(row => row.arabicName === 'ياسمين العلوي')).toBe(true);
        expect((await asActor(admin, () => studentRepo.getById(created[0])))?.arabicName).toBe('ياسمين العلوي');
        const children = await asActor(parentActor, () => childrenRepo.getChildren(parent.id));
        expect(children.map(row => row.id).sort()).toEqual(created.toSorted());
        expect(await asActor({ id: 'unknown-parent-user', role: 'parent' }, () => studentRepo.getAll())).toEqual([]);
        await asActor(admin, () => service.update(created[0], { name: 'Family Probe Updated', arabicName: 'ياسمين بناني', image: '/probe-student.png' }, admin));
        const [updated] = await tx.select().from(students).where(and(eq(students.id, created[0]), sql`${students.userId} is null`));
        expect(updated.image).toBe('/probe-student.png');
        expect(updated.arabicName).toBe('ياسمين بناني');
        await asActor(admin, () => studentRepo.delete(created[1]));
        expect(await tx.select().from(students).where(eq(students.id, created[1]))).toEqual([]);
        await tx.delete(users).where(eq(users.id, parent.userId!));
        const [retainedParent] = await tx.select().from(parents).where(eq(parents.id, parent.id));
        expect(retainedParent.userId).toBeNull();
        expect(retainedParent.image).toBeTruthy();
        expect(await tx.select().from(studentParents).where(eq(studentParents.parentId, parent.id))).toHaveLength(1);
        if (process.env.FAMILY_IMPORT_PAYLOAD_FILE) {
          const payloads = await Bun.file(process.env.FAMILY_IMPORT_PAYLOAD_FILE).json();
          assert.ok(Array.isArray(payloads));
          const loginsBefore = invitedRoles.length;
          for (const [index, payload] of payloads.entries()) {
            const imported = await asActor(admin, () => service.createForImport(importStudentDto.parse({
              ...payload, studentCode: `family-workbook-${index}`,
              classId: 'history-class-2026', sectionId: 'history-section-2026-a',
            }), admin));
            expect(imported.userId).toBeNull();
          }
          expect(invitedRoles.slice(loginsBefore).every(role => role === 'parent')).toBe(true);
          console.log(JSON.stringify({ workbookRowsCreatedAndRolledBack: payloads.length, parentAccountsCreated: invitedRoles.length - loginsBefore, studentAccountsCreated: 0 }));
        }
        throw rollback;
      });
    } catch (error) { if (error !== rollback) throw error; }
    const after = await db.execute(sql`select (select count(*) from students)::int as students, (select count(*) from parents)::int as parents, (select count(*) from users)::int as users`);
    expect(after).toEqual(before);
  });
});
