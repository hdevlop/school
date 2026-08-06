import { composeGuards } from 'najm-guard';
import { Can } from 'najm-auth';
import { isAdministrator } from '@server/auth';

export const canAccessRefuel = composeGuards(Can('read:refuels'));
export const canUpdateRefuel = composeGuards(Can('update:refuels'), isAdministrator());
export const canCreateRefuel = composeGuards(Can('create:refuels'), isAdministrator());
export const canDeleteRefuel = composeGuards(Can('delete:refuels'), isAdministrator());
export const canAccessAllRefuels = composeGuards(Can('read:refuels'));
