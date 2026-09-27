import type { AcademicYearList } from '@sms/contracts/academic-years';
import { api } from './http';

export const getAcademicYearsApi = async (): Promise<AcademicYearList> => {
  const outer = (await api.get('/academic-years')).data as { data?: AcademicYearList } | AcademicYearList;
  const list = outer && typeof outer === 'object' && 'data' in outer ? outer.data : outer;
  return (list as AcademicYearList | undefined) ?? { activeAcademicYearId: null, years: [] };
};
