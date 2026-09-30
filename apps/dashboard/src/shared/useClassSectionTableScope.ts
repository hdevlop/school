import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'najm-i18n/react';
import { useClasses } from '@/features/Classes/hooks/useClasses';
import { useSections } from '@/features/Sections/hooks/useSections';

type ScopedRow = {
  classId?: string | null;
  sectionId?: string | null;
  sectionIds?: string[] | null;
  class?: { id?: string | null } | null;
  section?: { id?: string | null } | null;
};

export function useClassSectionTableScope() {
  const { t } = useTranslation();
  const { classes } = useClasses();
  const { sections } = useSections();
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');

  useEffect(() => {
    if (classId && classes && !classes.some((item) => item.id === classId)) {
      setClassId('');
      setSectionId('');
    }
  }, [classId, classes]);

  useEffect(() => {
    if (sectionId && sections && !sections.some((item) => item.id === sectionId && item.classId === classId)) {
      setSectionId('');
    }
  }, [classId, sectionId, sections]);

  const filters = useMemo(() => [
    {
      name: 'classScope',
      type: 'combobox',
      placeholder: t('students.filters.filterByClass'),
      value: classId,
      onChange: (value: string) => { setClassId(value); setSectionId(''); },
      options: (classes || []).map((item) => ({ value: item.id, label: item.name })),
      className: 'w-full lg:w-48',
    },
    {
      name: 'sectionScope',
      type: 'select',
      placeholder: t('students.filters.filterBySection'),
      value: sectionId,
      onChange: setSectionId,
      options: (sections || [])
        .filter((item) => item.classId === classId)
        .map((item) => ({ value: item.id, label: item.name })),
      disabled: !classId,
      className: 'w-full lg:w-48',
    },
  ], [t, classes, sections, classId, sectionId]);

  const matches = useCallback((row: ScopedRow) =>
    (!classId || (row.classId ?? row.class?.id) === classId)
    && (!sectionId || (row.sectionIds?.length
      ? row.sectionIds.includes(sectionId)
      : (row.sectionId ?? row.section?.id) === sectionId)), [classId, sectionId]);

  return { filters, matches, hasSelection: Boolean(classId || sectionId) };
}
