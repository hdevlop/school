import { useMemo } from 'react';
import { useTranslation } from '@/hooks/useLanguage';

export const useStudentAttendanceTableFilters = () => {
  const { t } = useTranslation();

  return useMemo(() => [
    {
      name: 'student.name',
      placeholder: t('attendance.filters.searchByStudent'),
      type: 'text',
    },
    {
      name: 'status',
      placeholder: t('attendance.filters.filterByStatus'),
      type: 'select',
      options: [
        { label: t('attendance.status.present'), value: 'present' },
        { label: t('attendance.status.absent'), value: 'absent' },
        { label: t('attendance.status.late'), value: 'late' },
      ],
    },
  ], [t]);
};

interface DateBinding { value: string; onChange: (v: string) => void }

export const useStudentRosterFilters = (classes: any[] = [], date?: DateBinding) => {
  const { t } = useTranslation();

  return useMemo(() => {
    const classOptions = classes.map((c) => ({ value: c.name, label: c.name }));
    const sectionOptions = ['A', 'B', 'C', 'D', 'E'].map((s) => ({ value: s, label: s }));

    return [
      ...(date ? [{
        name: 'date',
        type: 'date',
        placeholder: t('attendance.roster.date'),
        value: date.value,
        onChange: date.onChange,
        className: 'w-full lg:w-52',
      }] : []),
      {
        name: 'name',
        placeholder: t('attendance.roster.searchPlaceholder'),
        type: 'text',
        className: 'w-full lg:w-64',
      },
      {
        name: 'class',
        placeholder: t('attendance.roster.class'),
        type: 'combobox',
        options: classOptions,
        className: 'w-full lg:w-48',
      },
      {
        name: 'section',
        placeholder: t('attendance.roster.section'),
        type: 'select',
        options: sectionOptions,
        className: 'w-full lg:w-48',
      },
      {
        name: 'status',
        placeholder: t('attendance.roster.status'),
        type: 'select',
        options: [
          { value: 'present', label: t('attendance.roster.present') },
          { value: 'absent', label: t('attendance.roster.absent') },
          { value: 'late', label: t('attendance.roster.late') },
        ],
        className: 'w-full lg:w-40',
      },
    ];
  }, [t, classes, date]);
};

export const useTeacherRosterFilters = (date?: DateBinding, roles: any[] = []) => {
  return useStaffRosterFilters(date, roles);
};

export const useStaffRosterFilters = (date?: DateBinding, roles: any[] = []) => {
  const { t } = useTranslation();

  const roleOptions = useMemo(() => roles.map((role) => ({
    value: role.code,
    label: role.label || role.code,
  })), [roles]);

  return useMemo(() => [
    ...(date ? [{
      name: 'date',
      type: 'date',
      placeholder: t('attendance.roster.date'),
      value: date.value,
      onChange: date.onChange,
      className: 'w-full lg:w-52',
    }] : []),
    {
      name: 'name',
      placeholder: t('attendance.roster.searchPlaceholder'),
      type: 'text',
      className: 'w-full lg:w-64',
    },
    {
      name: 'role',
      placeholder: t('staff.table.role'),
      type: 'select',
      options: roleOptions,
      className: 'w-full lg:w-48',
    },
    {
      name: 'status',
      placeholder: t('attendance.roster.status'),
      type: 'select',
      options: [
        { value: 'present', label: t('attendance.roster.present') },
        { value: 'absent', label: t('attendance.roster.absent') },
        { value: 'late', label: t('attendance.roster.late') },
      ],
      className: 'w-full lg:w-40',
    },
  ], [t, date, roleOptions]);
};

export const useTeacherAttendanceTableFilters = () => {
  return useStaffAttendanceTableFilters();
};

export const useStaffAttendanceTableFilters = () => {
  const { t } = useTranslation();

  return useMemo(() => [
    {
      name: 'staff.name',
      placeholder: t('attendance.filters.searchByStaff'),
      type: 'text',
    },
    {
      name: 'status',
      placeholder: t('attendance.filters.filterByStatus'),
      type: 'select',
      options: [
        { label: t('attendance.status.present'), value: 'present' },
        { label: t('attendance.status.absent'), value: 'absent' },
        { label: t('attendance.status.late'), value: 'late' },
      ],
    },
  ], [t]);
};
