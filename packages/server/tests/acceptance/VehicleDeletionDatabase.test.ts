import { describe, expect, it } from 'bun:test';
import { and, eq, isNull, sql } from 'drizzle-orm';

const rawUrl = process.env.SCHOOL_HISTORY_TEST_DB_URL;
if (!rawUrl) throw new Error('SCHOOL_HISTORY_TEST_DB_URL is required');
const target = new URL(rawUrl);
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
  || target.pathname !== '/school_history_test') throw new Error('Expected local school_history_test');
process.env.DB_URL = rawUrl;
const { db } = await import('../../src/database/db');
const { vehicles, studentRoutes, vehicleAssignments, busAssistantAssignments, refuels, maintenance, students, staff, drivers } = await import('../../src/database/schema');
const { VehicleRepository } = await import('../../src/modules/transport/vehicles/VehicleRepository');
const { VehicleValidator } = await import('../../src/modules/transport/vehicles/VehicleValidator');
const { withEnglishMessages } = await import('../support/englishMessages');
const marker = await db.execute<{ id: string }>(sql`select id from school_history_fixture_marker`);
if (marker.length !== 1 || marker[0].id !== 'academic-history-alerts-v1') throw Error('Fixture marker mismatch');
const rollback = Symbol('rollback');
const vehicleId = 'history-vehicle-retention';

async function withFixture(run: (tx: typeof db, validator: InstanceType<typeof VehicleValidator>, repository: InstanceType<typeof VehicleRepository>) => Promise<void>) {
  try {
    await db.transaction(async transaction => {
      const tx = transaction as unknown as typeof db;
      await tx.insert(vehicles).values({ id: vehicleId, name: 'Navette Agdal', brand: 'Renault', model: 'Master',
        year: 2025, capacity: 4, licensePlate: vehicleId });
      const repository = new VehicleRepository(); repository.db = tx;
      await repository.lockForDeletion(vehicleId);
      const validator = withEnglishMessages(new VehicleValidator(repository));
      await run(tx, validator, repository);
      throw rollback;
    });
  } catch (error) { if (error !== rollback) throw error; }
}

describe('vehicle reference retention on marked PostgreSQL', () => {
  it.each(['activeRoute', 'pastRoute', 'driverAssignment', 'busAssistant', 'refuel', 'maintenance'] as const)(
    'refuses deleting a vehicle with %s without removing its history', async kind => {
      await withFixture(async (tx, validator) => {
        if (kind === 'activeRoute' || kind === 'pastRoute') {
          const [student] = await tx.select({ id: students.id }).from(students)
            .leftJoin(studentRoutes, and(eq(studentRoutes.studentId, students.id), eq(studentRoutes.status, 'active')))
            .where(isNull(studentRoutes.id)).limit(1);
          if (!student) throw Error('Fixture needs one student without an active route');
          await tx.insert(studentRoutes).values({ id: 'history-vehicle-ref-route', studentId: student.id, vehicleId,
            assignmentDate: '2025-09-01', status: kind === 'activeRoute' ? 'active' : 'completed',
            ...(kind === 'pastRoute' ? { unassignmentDate: '2025-10-01' } : {}) });
        } else if (kind === 'maintenance') {
          await tx.insert(maintenance).values({ id: 'history-vehicle-ref-maintenance', vehicleId, type: 'repair', title: 'Entretien navette' });
        } else {
          const staffId = 'history-vehicle-ref-staff', driverId = 'history-vehicle-ref-driver';
          await tx.insert(staff).values({ id: staffId, employeeCode: staffId, name: 'Youssef Benali', role: 'driver', hireDate: '2024-09-01' });
          if (kind === 'busAssistant') {
            await tx.insert(busAssistantAssignments).values({ id: 'history-vehicle-ref-assistant', staffId, vehicleId, status: 'completed' });
          } else {
            await tx.insert(drivers).values({ id: driverId, staffId, licenseNumber: driverId, licenseType: 'D', licenseExpiry: '2030-01-01' });
            if (kind === 'driverAssignment') {
              await tx.insert(vehicleAssignments).values({ id: 'history-vehicle-ref-assignment', vehicleId, driverId,
                assignmentDate: '2025-09-01', unassignmentDate: '2025-10-01', status: 'completed' });
            } else {
              await tx.insert(refuels).values({ id: 'history-vehicle-ref-refuel', vehicleId, drivers: driverId,
                datetime: '2025-10-01 12:00:00', liters: '10' });
            }
          }
        }
        let refusal: unknown;
        try { await validator.ensureCanDelete(vehicleId); } catch (error) { refusal = error; }
        expect(refusal).toMatchObject({ status: 409 });
        expect(await tx.select({ id: vehicles.id }).from(vehicles).where(eq(vehicles.id, vehicleId))).toHaveLength(1);
      });
    });

  it('deletes an unreferenced vehicle', async () => {
    await withFixture(async (tx, validator, repository) => {
      await validator.ensureCanDelete(vehicleId);
      await repository.delete(vehicleId);
      expect(await tx.select({ id: vehicles.id }).from(vehicles).where(eq(vehicles.id, vehicleId))).toHaveLength(0);
    });
  });
});
