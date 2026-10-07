import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'najm-i18n/react';
import { useClasses } from '@/features/Classes/hooks/useClasses';
import { useSections } from '@/features/Sections/hooks/useSections';
import { useViewingYearKey } from '@/features/AcademicYears/hooks/useViewingAcademicYear';
import { matchesClassSection, type ScopedRow } from './classSectionScope';

type NamedPlacement = {
  classId?: string | null;
  className?: string | null;
  sectionId?: string | null;
  sectionName?: string | null;
};

export function useClassSectionTableScope({ includeSection = true, placements }: {
  includeSection?: boolean;
  placements?: NamedPlacement[];
} = {}) {
  const { t } = useTranslation();
  const yearKey = useViewingYearKey();
  const { classes: catalogClasses } = useClasses({ enabled: !placements });
  const { sections: catalogSections } = useSections({ enabled: !placements && includeSection });
  const classes = useMemo(() => placements
    ? Array.from(new Map(placements.filter((row) => row.classId).map((row) => [row.classId!, {
      id: row.classId!, name: row.className || row.classId!,
    }])).values()) : catalogClasses, [placements, catalogClasses]);
  const sections = useMemo(() => placements
    ? Array.from(new Map(placements.filter((row) => row.sectionId).map((row) => [row.sectionId!, {
      id: row.sectionId!, name: row.sectionName || row.sectionId!, classId: row.classId,
    }])).values()) : catalogSections, [placements, catalogSections]);
  const [selection, setSelection] = useState({ yearKey, classId: '', sectionId: '' });
  const classId = selection.yearKey === yearKey ? selection.classId : '';
  const sectionId = selection.yearKey === yearKey ? selection.sectionId : '';
  const setClassId = useCallback((value: string) => setSelection({
    yearKey, classId: value === '__clear__' ? '' : value, sectionId: '',
  }), [yearKey]);
  const setSectionId = useCallback((value: string) => setSelection((current) => ({
    yearKey,
    classId: current.yearKey === yearKey ? current.classId : '',
    sectionId: value === '__clear__' ? '' : value,
  })), [yearKey]);

  useEffect(() => {
    if (selection.yearKey !== yearKey) setClassId('');
  }, [selection.yearKey, yearKey, setClassId]);

  useEffect(() => {
    if (classId && classes && !classes.some((item) => item.id === classId)) {
      setClassId('');
    }
  }, [classId, classes, setClassId]);

  useEffect(() => {
    if (sectionId && sections && !sections.some((item) => item.id === sectionId && item.classId === classId)) {
      setSectionId('');
    }
  }, [classId, sectionId, sections, setSectionId]);

  const filters = useMemo(() => [
    {
      name: 'classScope',
      type: 'combobox',
      showIcon: false,
      placeholder: t('students.filters.filterByClass'),
      value: classId,
      onChange: setClassId,
      options: (classes || []).map((item) => ({ value: item.id, label: item.name })),
      className: 'w-full lg:w-48',
    },
    ...(includeSection ? [{
      name: 'sectionScope',
      type: 'select',
      showIcon: false,
      placeholder: t('students.filters.filterBySection'),
      value: sectionId,
      onChange: setSectionId,
      options: (sections || [])
        .filter((item) => item.classId === classId)
        .map((item) => ({ value: item.id, label: item.name })),
      disabled: !classId,
      className: 'w-full lg:w-48',
    }] : []),
  ], [t, classes, sections, classId, sectionId, setClassId, setSectionId, includeSection]);

  const matches = useCallback((row: ScopedRow) =>
    matchesClassSection(row, classId, sectionId), [classId, sectionId]);

  return { filters, matches, classId, sectionId, hasSelection: Boolean(classId || sectionId) };
}
