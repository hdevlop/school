import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'najm-i18n/react';
import { compareClassNames } from '@sms/contracts';
import { useClasses } from '@/features/Classes/hooks/useClasses';
import { useSections } from '@/features/Sections/hooks/useSections';
import { useViewingYearKey } from '@/features/AcademicYears/hooks/useViewingAcademicYear';
import { matchesClassSection, type ScopedRow } from './classSectionScope';

/** The "All" entry of the class and section filters; a sheet that lists its own "all" drops it. */
export const SCOPE_ALL_OPTION = '__clear__';
export const withoutScopeAllOption = <Option extends { value: string }>(options: readonly Option[]) =>
  options.filter((option) => option.value !== SCOPE_ALL_OPTION);

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
  // A single class (a teacher of one class) is the filter from the start: "all classes" would show
  // the same rows, and choosing it opens the section filter. Clearing it comes back to it.
  const onlyClassId = classes?.length === 1 ? classes[0].id : '';
  const chosenClassId = selection.yearKey === yearKey ? selection.classId : '';
  const classId = chosenClassId || onlyClassId;
  const sectionId = selection.yearKey === yearKey ? selection.sectionId : '';
  const setClassId = useCallback((value: string) => setSelection({
    yearKey, classId: value === SCOPE_ALL_OPTION ? '' : value, sectionId: '',
  }), [yearKey]);
  const setSectionId = useCallback((value: string) => setSelection((current) => ({
    yearKey,
    classId: current.yearKey === yearKey ? current.classId : '',
    sectionId: value === SCOPE_ALL_OPTION ? '' : value,
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

  // A controlled filter gets no "All" from NTable, so it is listed here. A single-class viewer
  // has none: clearing would come straight back to their one class.
  const all = useMemo(() => ({ value: SCOPE_ALL_OPTION, label: t('common.all') }), [t]);
  const filters = useMemo(() => [
    {
      name: 'classScope',
      type: 'combobox',
      showIcon: false,
      placeholder: t('students.table.class'),
      value: classId,
      onChange: setClassId,
      options: [
        ...(onlyClassId ? [] : [all]),
        ...[...(classes || [])]
          .sort((left, right) => compareClassNames(left.name, right.name))
          .map((item) => ({ value: item.id, label: item.name })),
      ],
      className: 'w-full sm:w-32 xl:w-32',
    },
    ...(includeSection ? [{
      name: 'sectionScope',
      type: 'select',
      showIcon: false,
      placeholder: t('students.table.section'),
      value: sectionId,
      onChange: setSectionId,
      options: [all, ...(sections || [])
        .filter((item) => item.classId === classId)
        .map((item) => ({ value: item.id, label: item.name }))],
      disabled: !classId,
      className: 'w-full sm:w-28 xl:w-28',
    }] : []),
  ], [t, all, classes, sections, classId, onlyClassId, sectionId, setClassId, setSectionId, includeSection]);

  const matches = useCallback((row: ScopedRow) =>
    matchesClassSection(row, classId, sectionId), [classId, sectionId]);

  // The class a single-class viewer starts on is not a filter they chose: an empty list still
  // invites them to add the first record rather than to clear filters.
  return { filters, matches, classId, sectionId, hasSelection: Boolean(chosenClassId || sectionId) };
}
