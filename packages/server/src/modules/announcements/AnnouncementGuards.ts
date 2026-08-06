import { Can } from '@server/auth';
import { composeGuards } from 'najm-guard';

export const canAccessAnnouncement     = composeGuards(Can('read:announcements'));
export const canUpdateAnnouncement     = composeGuards(Can('update:announcements'));
export const canCreateAnnouncement     = composeGuards(Can('create:announcements'));
export const canDeleteAnnouncement     = composeGuards(Can('delete:announcements'));
export const canAccessAllAnnouncements = composeGuards(Can('read:announcements'));
export const canPublishAnnouncement    = composeGuards(Can('update:announcements'));
