import { isValidMassarMark, type MassarComponent, type MassarStudent } from '@sms/contracts';
import { Err, Service, t } from '../../najm';
import { SCHOOL_WIDE_ROLES } from '../../auth';
import { matchPermission } from 'najm-auth/client';
import type { MassarMarksInput } from './MassarDto';

export type MassarActor = { id: string; role?: string; permissions?: string[] };
export function mayManageMassar(actor: MassarActor) { return !!actor.role && SCHOOL_WIDE_ROLES.includes(actor.role) && matchPermission(actor.permissions ?? [], 'manage:massar'); }
@Service()
export class MassarValidator {
  refuse(key: string, status = 409): never { return Err(status, t(`massar.errors.${key}`)); }
  ensureWriter(actor: MassarActor, sheet: { status: string; teacherUnlocked?: boolean }, manager: boolean) {
    if (!manager && actor.role !== 'teacher') this.refuse('readOnly', 403);
    if (sheet.status === 'exported' || sheet.status === 'changed_after_export' && !sheet.teacherUnlocked) this.refuse('locked');
  }
  ensureMarks(data: MassarMarksInput, roster: MassarStudent[], components: MassarComponent[], maxMark: number) {
    const seen = new Set<string>();
    for (const mark of data.marks) {
      const key = `${mark.studentId}:${mark.componentCode}`;
      if (seen.has(key) || !roster.some(student => student.id === mark.studentId) || !components.some(component => component.code === mark.componentCode) || !isValidMassarMark(mark.mark, mark.absence, maxMark)) this.refuse('invalidMark', 422);
      seen.add(key);
    }
  }
}
