import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'najm-i18n/react';

export const useStudentsTableFilters = (classes = [], students = []) => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [className, setClassName] = useState('');
  const [section, setSection] = useState('');

  useEffect(() => {
    if (className && !classes.some(cls => cls.name === className)) setClassName('');
  }, [classes, className]);

  const filteredStudents = useMemo(() => {
    const needle = name.toLowerCase().trim();
    return students.filter(student => (
      (!needle || String(student.name ?? '').toLowerCase().includes(needle)
        || String(student.studentCode ?? '').toLowerCase().includes(needle))
      && (!className || student.class?.name === className)
      && (!section || student.section?.name === section)
    ));
  }, [students, name, className, section]);

  const filters = useMemo(() => {
    const classOptions = classes?.map(cls => ({
      value: cls.name,
      label: cls.name
    })) || [];

    const sectionOptions = [
      { value: 'A', label: 'A' },
      { value: 'B', label: 'B' },
      { value: 'C', label: 'C' },
      { value: 'D', label: 'D' },
      { value: 'E', label: 'E' }
    ];

    return [
      {
        name: 'name',
        placeholder: t('students.filters.searchByName'),
        type: 'text',
        value: name,
        onChange: setName,
        className: 'w-full lg:w-64'
      },
      {
        name: 'class',
        placeholder: t('students.filters.filterByClass'),
        type: 'combobox',
        value: className,
        onChange: setClassName,
        options: classOptions,
        className: 'w-full lg:w-48'
      },
      {
        name: 'section',
        placeholder: t('students.filters.filterBySection'),
        type: 'select',
        value: section,
        onChange: (value: string) => setSection(value === '__clear__' ? '' : value),
        options: sectionOptions,
        className: 'w-full lg:w-48'
      }
    ];
  }, [t, classes, name, className, section]);

  return { filters, filteredStudents };
};
