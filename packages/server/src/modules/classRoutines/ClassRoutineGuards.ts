import { composeGuards, createGuard } from 'najm-guard';
import { matchPermission } from 'najm-auth/client';
import { Injectable, User } from '../../najm';
import { isAuth } from '../../auth';

/** Candidate contact details belong to timetable editors, not every reader. */
@Injectable()
export class RoutineCandidateGuard {
  canActivate(@User('permissions') permissions: string[] | undefined) {
    return ['create', 'update', 'delete'].some((action) =>
      matchPermission(permissions ?? [], `${action}:class-routines`));
  }
}

export const canReadRoutineCandidates = composeGuards(isAuth(), createGuard(RoutineCandidateGuard)());
