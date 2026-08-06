import { describe, expect, it } from 'bun:test';
import {
  createStudentRouteDto,
  reassignStudentRouteDto,
  updateStudentRouteDto,
} from '@server/modules/transport/studentRoutes/StudentRouteDto';

const validRoute = {
  studentId: 'stu_01',
  vehicleId: 'vhl_01',
  assignmentDate: '2026-09-01',
  pickupLocation: '12 Rue Atlas, Casablanca',
  pickupPlaceId: 'place_pickup',
  pickupLatitude: 33.5731,
  pickupLongitude: -7.5898,
  dropoffLocation: 'Najm School, Casablanca',
  dropoffPlaceId: 'place_school',
  dropoffLatitude: 33.584,
  dropoffLongitude: -7.61,
};

describe('student route DTOs', () => {
  it('accepts a complete geocoded assignment', () => {
    const result = createStudentRouteDto.safeParse(validRoute);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.status).toBe('active');
  });

  it('accepts manual addresses without Google metadata', () => {
    expect(createStudentRouteDto.safeParse({
      studentId: 'stu_01',
      vehicleId: 'vhl_01',
      pickupLocation: 'Manual pickup address',
    }).success).toBe(true);
  });

  it('rejects out-of-range coordinates', () => {
    expect(createStudentRouteDto.safeParse({
      ...validRoute,
      pickupLatitude: 91,
      pickupLongitude: -181,
    }).success).toBe(false);
  });

  it('rejects an invalid assignment date', () => {
    expect(createStudentRouteDto.safeParse({
      ...validRoute,
      assignmentDate: '09/01/2026',
    }).success).toBe(false);
  });

  it('only allows location and notes changes through update', () => {
    expect(updateStudentRouteDto.safeParse({ notes: 'Use side gate' }).success).toBe(true);
    const parsed = updateStudentRouteDto.parse({ vehicleId: 'vhl_other', notes: 'Use side gate' });
    expect(parsed).toEqual({ notes: 'Use side gate' });
  });

  it('requires a target vehicle for reassignment', () => {
    expect(reassignStudentRouteDto.safeParse({ pickupLocation: 'New stop' }).success).toBe(false);
    expect(reassignStudentRouteDto.safeParse({
      vehicleId: 'vhl_02',
      assignmentDate: '2026-10-01',
    }).success).toBe(true);
  });
});
