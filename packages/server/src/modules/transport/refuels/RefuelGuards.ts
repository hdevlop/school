import { Can } from '../../../auth';

// The seeded permissions name the resource `refuel`.
export const canAccessRefuel = () => Can('read:refuel');
export const canUpdateRefuel = () => Can('update:refuel');
export const canCreateRefuel = () => Can('create:refuel');
export const canDeleteRefuel = () => Can('delete:refuel');
export const canAccessAllRefuels = () => Can('read:refuel');
