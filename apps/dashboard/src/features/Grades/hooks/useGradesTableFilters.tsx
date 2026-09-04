import { useMemo } from 'react';
import { useTranslation } from 'najm-i18n/react';

type Option = { value: string; label: string };

type Params = {
  classId: string;
  sectionId: string;
  subjectId: string;
  teacherId: string;
  setClassId: (v: string) => void;
  setSectionId: (v: string) => void;
  setSubjectId: (v: string) => void;
  setTeacherId: (v: string) => void;
  sourceType: 'assessment' | 'exam';
  sourceId: string;
  setSourceId: (v: string) => void;
  sourceOptions: Option[];
  classOptions: Option[];
  sectionOptions: Option[];
  subjectOptions: Option[];
  teacherOptions: Option[];
  isClassesLoading: boolean;
  isSectionsLoading: boolean;
  isSubjectsLoading: boolean;
  isTeachersLoading: boolean;
  isSourceLoading: boolean;
  isAdminOrPrincipal: boolean;
};

export const useGradesTableFilters = (params: Params) => {
  const { t } = useTranslation();
  const {
    classId, sectionId, subjectId, teacherId,
    setClassId, setSectionId, setSubjectId, setTeacherId,
    sourceType, sourceId, setSourceId, sourceOptions,
    classOptions, sectionOptions, subjectOptions, teacherOptions,
    isClassesLoading, isSectionsLoading, isSubjectsLoading, isTeachersLoading, isSourceLoading,
    isAdminOrPrincipal,
  } = params;

  return useMemo(() => {
    const noIconClass = 'grades-filter-no-icon';
    const base: any[] = [
      {
        name: 'class',
        type: 'combobox',
        placeholder: isClassesLoading ? 'Loading...' : t('grades.form.class'),
        searchPlaceholder: t('grades.form.classPlaceholder'),
        value: classId,
        onChange: setClassId,
        options: classOptions,
        disabled: isClassesLoading,
        className: `${noIconClass} w-full lg:w-32 xl:w-32`,
      },
      {
        name: 'section',
        type: 'select',
        placeholder: !classId ? 'Select class first' : t('grades.form.section'),
        searchPlaceholder: t('grades.form.sectionPlaceholder'),
        value: sectionId,
        onChange: setSectionId,
        options: sectionOptions,
        disabled: !classId || isSectionsLoading || sectionOptions.length === 0,
        className: `${noIconClass} w-full lg:w-32 xl:w-32`,
      },
      {
        name: 'subject',
        type: 'combobox',
        placeholder: t('grades.form.subject'),
        searchPlaceholder: t('grades.form.subjectPlaceholder'),
        value: subjectId,
        onChange: setSubjectId,
        options: subjectOptions,
        disabled: isSubjectsLoading,
        className: `${noIconClass} w-full lg:w-40`,
      },
    ];
    if (isAdminOrPrincipal) {
      base.push({
        name: 'teacher',
        type: 'combobox',
        placeholder: subjectId ? 'Teacher for subject' : t('grades.form.teacher'),
        searchPlaceholder: t('grades.form.teacherPlaceholder'),
        value: teacherId,
        onChange: setTeacherId,
        options: teacherOptions,
        disabled: isTeachersLoading || teacherOptions.length === 0,
        className: `${noIconClass} w-full lg:w-40`,
      });
    }
    base.push({
      name: 'source',
      type: 'combobox',
      placeholder: isSourceLoading
        ? 'Loading...'
        : sourceType === 'assessment'
          ? 'Select assessment'
          : 'Select exam',
      searchPlaceholder: sourceType === 'assessment' ? 'Search assessment' : 'Search exam',
      value: sourceId,
      onChange: setSourceId,
      options: sourceOptions,
      disabled: !sectionId || isSourceLoading || sourceOptions.length === 0,
      className: `${noIconClass} w-full lg:w-56`,
    });
    base.push({
      name: 'studentName',
      placeholder: t('grades.table.student'),
      type: 'text',
      className: `${noIconClass} w-full lg:w-48`,
    });
    return base;
  }, [
    t, classOptions, sectionOptions, subjectOptions, teacherOptions, sourceOptions,
    classId, sectionId, subjectId, teacherId, sourceType, sourceId,
    setClassId, setSectionId, setSubjectId, setTeacherId,
    setSourceId,
    isClassesLoading, isSectionsLoading, isSubjectsLoading, isTeachersLoading, isSourceLoading,
    isAdminOrPrincipal,
  ]);
};
