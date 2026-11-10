import { useDeferredValue, useMemo, useState } from 'react';
import { useTranslation } from 'najm-i18n/react';
import { useClassSectionTableScope } from '@/features/Classes/hooks/useClassSectionTableScope';
import { STUDENT_YEAR_ENROLLMENT_STATUS_VALUES } from '@sms/contracts';
import { useTableViewFilter } from '@/hooks/useTableViewFilter';
import { compareStudentListRows } from '../config/studentActivity';

type StudentFilterRow = { status?: string };

export const useStudentsTableFilters = (students = []) => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const deferredName = useDeferredValue(name);
  const { matches, filters: scopeFilters } = useClassSectionTableScope();
  const statusOptions = useMemo(() => STUDENT_YEAR_ENROLLMENT_STATUS_VALUES.map(status => ({
    value: status, label: t(`students.status.${status}`),
    matches: (student: StudentFilterRow) => student.status === status,
  })), [t]);
  const { matches: matchesView, filter: viewFilter } = useTableViewFilter(statusOptions);

  // Filtering preserves this order, so typing never sorts the roster again.
  const sortedStudents = useMemo(() => [...students].sort(compareStudentListRows), [students]);
  const filteredStudents = useMemo(() => {
    const needle = deferredName.toLowerCase().trim();
    return sortedStudents.filter(student => matches(student) && matchesView(student)
      && (!needle || String(student.name ?? '').toLowerCase().includes(needle)
        || String(student.arabicName ?? '').toLowerCase().includes(needle)
        || String(student.studentCode ?? '').toLowerCase().includes(needle)));
  }, [sortedStudents, deferredName, matches, matchesView]);

  const searchFilter = useMemo(() => ({
    name: 'name',
    placeholder: t('students.filters.searchByNameOrCode'),
    type: 'text',
    value: name,
    onChange: setName,
    className: 'w-full lg:w-64',
  }), [t, name]);

  const filters = useMemo(() => [
    ...scopeFilters,
    searchFilter,
    viewFilter,
  ], [scopeFilters, searchFilter, viewFilter]);

  return { filters, filteredStudents, searchFilter, scopeFilters, viewFilter };
};
