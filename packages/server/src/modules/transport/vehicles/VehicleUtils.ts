import { vehicles } from '@server/database/schema';
import { sql } from 'drizzle-orm';

// ============================================
// Vehicle Field Helpers
// ============================================

export const getTotalMileageCalculated = () => {
  return sql<number>`COALESCE(
    CAST(${vehicles.currentMileage} AS NUMERIC) - CAST(${vehicles.initialMileage} AS NUMERIC),
    0
  )`;
};

export const getVehicleBaseFields = () => {
  return {
    id: vehicles.id,
    name: vehicles.name,
    brand: vehicles.brand,
    model: vehicles.model,
    year: vehicles.year,
    type: vehicles.type,
    capacity: vehicles.capacity,
    licensePlate: vehicles.licensePlate,
    purchaseDate: vehicles.purchaseDate,
    purchasePrice: vehicles.purchasePrice,
    initialMileage: vehicles.initialMileage,
    currentMileage: vehicles.currentMileage,
    status: vehicles.status,
    notes: vehicles.notes,
    createdAt: vehicles.createdAt,
    updatedAt: vehicles.updatedAt,
  };
};

export const getVehicleComputedFields = () => {
  return {
    totalMileageCalculated: getTotalMileageCalculated().as('total_mileage_calculated'),
    activeStudentCount: sql<number>`(
      SELECT COUNT(*)::int
      FROM student_routes AS active_routes
      WHERE active_routes.vehicle_id = "vehicles"."id"
      AND active_routes.status = 'active'
    )`.as('active_student_count'),
    availableSeats: sql<number>`GREATEST(
      ${vehicles.capacity} - (
        SELECT COUNT(*)::int
        FROM student_routes AS active_routes
        WHERE active_routes.vehicle_id = "vehicles"."id"
        AND active_routes.status = 'active'
      ),
      0
    )`.as('available_seats'),
  };
};
