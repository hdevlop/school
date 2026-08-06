import { Can } from '@server/auth';
import { composeGuards } from 'najm-guard';

export const canReadDiscipline = composeGuards(Can('read:discipline'));
export const canCreateDiscipline = composeGuards(Can('create:discipline'));
export const canUpdateDiscipline = composeGuards(Can('update:discipline'));
export const canDeleteDiscipline = composeGuards(Can('delete:discipline'));
export const canResolveDiscipline = composeGuards(Can('resolve:discipline'));
