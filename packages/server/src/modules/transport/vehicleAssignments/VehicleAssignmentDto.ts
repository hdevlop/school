import { z } from 'zod';

export const createVehicleAssignmentDto = z.object({
  vehicleId: z.string().min(1, 'Vehicle ID is required'),
  driverId: z.string().min(1, 'Driver ID is required'),
  assignmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  unassignmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional().nullable(),
  status: z.enum(['active', 'completed', 'cancelled']).optional(),
  notes: z.string().optional().nullable(),
  assignedBy: z.string().optional().nullable(),
});

export const updateVehicleAssignmentDto = createVehicleAssignmentDto.partial();

export const unassignVehicleAssignmentDto = z.object({
  unassignmentDate: z.string().optional().nullable(),
});

export const assignDriverDto = z.object({
  vehicleId: z.string().min(1),
  driverId: z.string().min(1),
  assignmentDate: z.string().optional().nullable(),
});

export const assignmentIdParam = z.object({ id: z.string().min(1) });
export const vehicleIdParam = z.object({ vehicleId: z.string().min(1) });
export const driverIdParam = z.object({ driverId: z.string().min(1) });

export type CreateVehicleAssignmentDto = z.infer<typeof createVehicleAssignmentDto>;
export type UpdateVehicleAssignmentDto = z.infer<typeof updateVehicleAssignmentDto>;
export type AssignDriverDto = z.infer<typeof assignDriverDto>;
export type UnassignVehicleAssignmentDto = z.infer<typeof unassignVehicleAssignmentDto>;
