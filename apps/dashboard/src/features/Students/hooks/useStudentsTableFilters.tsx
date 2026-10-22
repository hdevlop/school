import { useMemo, useState } from 'react';
import { useTranslation } from 'najm-i18n/react';
import { useClassSectionTableScope } from '@/features/Classes/hooks/useClassSectionTableScope';
import { STUDENT_YEAR_ENROLLMENT_STATUS_VALUES } from '@sms/contracts';
import { useTableViewFilter } from '@/hooks/useTableViewFilter';

type StudentFilterRow = { status?: string; missingParentDetails?: boolean };

export const useStudentsTableFilters = (students = []) => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const { matches, filters: scopeFilters } = useClassSectionTableScope();
  const statusOptions = useMemo(() => [{
    value: 'missing-parent-details', label: t('students.filters.missingParentDetails'),
    matches: (student: StudentFilterRow) => student.missingParentDetails === true,
  }, ...STUDENT_YEAR_ENROLLMENT_STATUS_VALUES.map(status => ({
    value: status, label: t(`students.status.${status}`),
    matches: (student: StudentFilterRow) => student.status === status,
  }))], [t]);
  const { matches: matchesView, filter: viewFilter } = useTableViewFilter(statusOptions);

  const filteredStudents = useMemo(() => {
    const needle = name.toLowerCase().trim();
    return students.filter(student => matches(student) && matchesView(student)
      && (!needle || String(student.name ?? '').toLowerCase().includes(needle)
        || String(student.arabicName ?? '').toLowerCase().includes(needle)
        || String(student.studentCode ?? '').toLowerCase().includes(needle)));
  }, [students, name, matches, matchesView]);

  const filters = useMemo(() => [
    ...scopeFilters,
    {
      name: 'name',
      placeholder: t('students.filters.searchByName'),
      type: 'text',
      value: name,
      onChange: setName,
      className: 'w-full lg:w-64',
    },
    viewFilter,
  ], [t, name, scopeFilters, viewFilter]);

  return { filters, filteredStudents };
};
