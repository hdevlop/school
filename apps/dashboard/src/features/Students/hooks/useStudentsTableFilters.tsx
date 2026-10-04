import { useMemo, useState } from 'react';
import { useTranslation } from 'najm-i18n/react';
import { useClassSectionTableScope } from '@/shared/useClassSectionTableScope';

export const useStudentsTableFilters = (students = []) => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const { matches, filters: scopeFilters } = useClassSectionTableScope();

  const filteredStudents = useMemo(() => {
    const needle = name.toLowerCase().trim();
    return students.filter(student => matches(student)
      && (!needle || String(student.name ?? '').toLowerCase().includes(needle)
        || String(student.studentCode ?? '').toLowerCase().includes(needle)));
  }, [students, name, matches]);

  const filters = useMemo(() => [
    {
      name: 'name',
      placeholder: t('students.filters.searchByName'),
      type: 'text',
      value: name,
      onChange: setName,
      className: 'w-full lg:w-64',
    },
    ...scopeFilters,
  ], [t, name, scopeFilters]);

  return { filters, filteredStudents };
};
