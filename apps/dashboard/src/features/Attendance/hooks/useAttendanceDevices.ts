'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as deviceApi from '@/services/attendanceDeviceApi';
import type { AttendanceDevice, AttendanceDevicePerson } from '@/services/attendanceDeviceApi';

const DEVICES_KEY = ['attendance-devices'];

/** The fingerprint terminals and the device PINs, refreshed while the panel is open. */
export function useAttendanceDevices(enabled = true) {
  const devices = useQuery({
    queryKey: [...DEVICES_KEY, 'list'],
    queryFn: deviceApi.getAttendanceDevicesApi,
    enabled,
    refetchInterval: 30_000,
  });
  const people = useQuery({
    queryKey: [...DEVICES_KEY, 'people'],
    queryFn: deviceApi.getAttendanceDevicePeopleApi,
    enabled,
    refetchInterval: 30_000,
  });
  return {
    devices: (devices.data?.data?.devices ?? []) as AttendanceDevice[],
    waiting: (devices.data?.data?.waiting ?? []) as string[],
    people: (people.data?.data ?? []) as AttendanceDevicePerson[],
    isLoading: devices.isPending || people.isPending,
    error: devices.error || people.error,
  };
}

export function useLinkDeviceUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deviceApi.linkAttendanceDeviceUserApi,
    onSuccess: (response) => {
      if (response?.message) toast.success(response.message);
      queryClient.invalidateQueries({ queryKey: DEVICES_KEY });
      // Linking counts the PIN's earlier scans: the register changes too.
      queryClient.invalidateQueries({ queryKey: ['attendance-staff'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'attendance'] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || error?.message);
    },
  });
}
