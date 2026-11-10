import { useDeferredValue, useMemo, useState } from 'react';
import { useTranslation } from 'najm-i18n/react';
import { useMediaQuery } from 'najm-kit';

export const useTeachersTableFilters = (teachers = []) => {
  const { t } = useTranslation();
  const isPhone = useMediaQuery('(max-width: 767px)');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');
  const deferredName = useDeferredValue(name);
  const deferredEmail = useDeferredValue(email);

  const filteredTeachers = useMemo(() => {
    const nameNeedle = deferredName.toLowerCase().trim();
    const emailNeedle = deferredEmail.toLowerCase().trim();
    return teachers.filter(teacher => (isPhone || !status || teacher.status === status)
      && (!nameNeedle || String(teacher.name ?? '').toLowerCase().includes(nameNeedle))
      && (isPhone || !emailNeedle || String(teacher.email ?? '').toLowerCase().includes(emailNeedle)));
  }, [teachers, deferredName, deferredEmail, status, isPhone]);

  const filters = useMemo(() => {
    const statusOptions = [
      { value: 'active', label: t('teachers.status.active') },
      { value: 'inactive', label: t('teachers.status.inactive') },
      { value: 'on_leave', label: t('teachers.status.onLeave') },
    ];

    const allFilters = [
      {
        name: 'name',
        placeholder: t('teachers.filters.searchByName'),
        type: 'text',
        value: name,
        onChange: setName,
        className: 'w-full lg:w-64'
      },
      {
        name: 'email',
        placeholder: t('teachers.filters.searchByEmail'),
        type: 'text',
        value: email,
        onChange: setEmail,
        className: 'w-full lg:w-64'
      },
      {
        name: 'status',
        placeholder: t('teachers.filters.filterByStatus'),
        type: 'select',
        value: status,
        onChange: (value: string) => setStatus(value === '__clear__' ? '' : value),
        showIcon: false,
        options: [{ value: '__clear__', label: t('common.all') }, ...statusOptions],
        className: 'w-full lg:w-48'
      }
    ];
    return isPhone ? allFilters.filter(filter => filter.name === 'name') : allFilters;
  }, [t, name, email, status, isPhone]);

  return { filters, filteredTeachers };
};
