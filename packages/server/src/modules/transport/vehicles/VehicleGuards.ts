import { Can } from '../../../auth';

export const canAccessVehicle     = () => Can('read:vehicles');
export const canUpdateVehicle     = () => Can('update:vehicles');
export const canCreateVehicle     = () => Can('create:vehicles');
export const canDeleteVehicle     = () => Can('delete:vehicles');
export const canAccessAllVehicles = () => Can('read:vehicles');
