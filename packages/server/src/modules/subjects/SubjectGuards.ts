import { composeGuards } from 'najm-guard';
import { Can } from 'najm-auth';
import { isAdministrator } from '@server/auth';

export const canAccessSubject = composeGuards(Can('read:subjects'));
export const canUpdateSubject = composeGuards(Can('update:subjects'), isAdministrator());
export const canCreateSubject = composeGuards(Can('create:subjects'), isAdministrator());
export const canDeleteSubject = composeGuards(Can('delete:subjects'), isAdministrator());
export const canAccessAllSubjects = composeGuards(Can('read:subjects'), isAdministrator());
