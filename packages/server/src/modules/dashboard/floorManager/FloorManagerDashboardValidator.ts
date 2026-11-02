import { Err, I18n, Service } from '../../../najm';

@Service()
export class FloorManagerDashboardValidator {
  @I18n('staff.errors') private ts!: (key: string) => string;
  ensureManagerExists<T>(manager: T | null | undefined) {
    if (!manager) Err(404, this.ts('notFound'));
    return manager;
  }
}
