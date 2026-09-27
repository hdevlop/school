import { z } from 'zod';
import { academicYearField } from '../../shared/fields';

// Without a year each dashboard read keeps its existing figures.
export const dashboardYearQuery = z.object({ academicYear: academicYearField.optional() });
export type DashboardYearQuery = z.infer<typeof dashboardYearQuery>;
