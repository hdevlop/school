import { isAdmin } from '@server/auth';

export const canAccessVehicle     = isAdmin;
export const canUpdateVehicle     = isAdmin;
export const canCreateVehicle     = isAdmin;
export const canDeleteVehicle     = isAdmin;
export const canAccessAllVehicles = isAdmin;
