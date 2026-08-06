import { isAuth, Can } from '@server/auth';
import { composeGuards } from 'najm-guard';

export const canAccessEvent        = composeGuards(Can('read:events'));
export const canUpdateEvent        = composeGuards(Can('update:events'));
export const canCreateEvent        = composeGuards(Can('create:events'));
export const canDeleteEvent        = composeGuards(Can('delete:events'));
export const canAccessAllEvents    = composeGuards(Can('read:events'));
export const canManageParticipants = composeGuards(Can('manage:participants'));
