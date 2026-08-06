import { z } from 'zod';
import { optionalDateField, optionalId, requiredId } from '@server/shared/fields';
import { latitudeDto, longitudeDto, placeIdDto } from '@server/shared/locationDto';

const studentRouteSchema = z.object({
  id: optionalId,
  studentId: requiredId,
  vehicleId: requiredId,
  assignmentDate: optionalDateField,
  unassignmentDate: optionalDateField,
  status: z.enum(['active', 'completed', 'cancelled']).default('active'),
  pickupLocation: z.string().max(500).optional().nullable(),
  pickupPlaceId: placeIdDto,
  pickupLatitude: latitudeDto,
  pickupLongitude: longitudeDto,
  dropoffLocation: z.string().max(500).optional().nullable(),
  dropoffPlaceId: placeIdDto,
  dropoffLatitude: latitudeDto,
  dropoffLongitude: longitudeDto,
  notes: z.string().max(1000).optional().nullable(),
  assignedBy: optionalId.nullable(),
});

export const createStudentRouteDto = studentRouteSchema.omit({ id: true });
export const updateStudentRouteDto = createStudentRouteDto.omit({
  studentId: true,
  vehicleId: true,
  assignmentDate: true,
  unassignmentDate: true,
  status: true,
  assignedBy: true,
}).partial();
export const reassignStudentRouteDto = updateStudentRouteDto.extend({
  vehicleId: requiredId,
  assignmentDate: optionalDateField,
});
export const studentRouteIdParam = z.object({ id: z.string().min(1) });
export const vehicleIdParam = z.object({ vehicleId: z.string().min(1) });
export const studentIdParam = z.object({ studentId: z.string().min(1) });

type CreateStudentRouteOutput = z.output<typeof createStudentRouteDto>;
export type CreateStudentRouteDto = Omit<CreateStudentRouteOutput, 'status'> & {
  status?: CreateStudentRouteOutput['status'];
};
export type UpdateStudentRouteDto = z.output<typeof updateStudentRouteDto>;
export type ReassignStudentRouteDto = z.output<typeof reassignStudentRouteDto>;
