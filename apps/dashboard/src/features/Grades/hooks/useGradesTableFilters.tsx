import { useMemo } from 'react';
import { useTranslation } from 'najm-i18n/react';

type Option = { value: string; label: string };

type Params = {
  classId: string;
  isAllClasses: boolean;
  sectionId: string;
  subjectId: string;
  setClassId: (v: string) => void;
  setSectionId: (v: string) => void;
  setSubjectId: (v: string) => void;
  sourceType: 'assessment' | 'exam';
  sourceId: string;
  setSourceId: (v: string) => void;
  sourceOptions: Option[];
  classOptions: Option[];
  sectionOptions: Option[];
  subjectOptions: Option[];
  isClassesLoading: boolean;
  isSectionsLoading: boolean;
  isSubjectsLoading: boolean;
  isSourceLoading: boolean;
};

export const useGradesTableFilters = (params: Params) => {
  const { t } = useTranslation();
  const {
    classId, isAllClasses, sectionId, subjectId,
    setClassId, setSectionId, setSubjectId,
    sourceType, sourceId, setSourceId, sourceOptions,
    classOptions, sectionOptions, subjectOptions,
    isClassesLoading, isSectionsLoading, isSubjectsLoading, isSourceLoading,
  } = params;

  return useMemo(() => {
    const base: any[] = [
      {
        name: 'class',
        type: 'combobox',
        showIcon: false,
        placeholder: isClassesLoading ? t('common.loading') : t('grades.form.class'),
        searchPlaceholder: t('grades.form.classPlaceholder'),
        value: classId,
        onChange: setClassId,
        options: classOptions,
        disabled: isClassesLoading,
        className: 'w-full lg:w-40 xl:w-40',
      },
      ...(!isAllClasses ? [{
        name: 'section',
        type: 'select',
        showIcon: false,
        placeholder: !classId ? t('grades.toolbar.selectClass') : t('grades.form.section'),
        searchPlaceholder: t('grades.form.sectionPlaceholder'),
        value: sectionId,
        onChange: setSectionId,
        options: sectionOptions,
        disabled: !classId || isSectionsLoading || sectionOptions.length === 0,
        className: 'w-full lg:w-32 xl:w-32',
      }] : []),
      {
        name: 'subject',
        type: 'combobox',
        showIcon: false,
        placeholder: t('grades.form.subject'),
        searchPlaceholder: t('grades.form.subjectPlaceholder'),
        value: subjectId,
        onChange: setSubjectId,
        options: subjectOptions,
        disabled: isSubjectsLoading,
        className: 'w-full lg:w-40',
      },
    ];
    base.push({
      name: 'source',
      type: 'combobox',
      showIcon: false,
      placeholder: isAllClasses
        ? t('grades.toolbar.selectClass')
        : isSourceLoading
          ? t('common.loading')
          : sourceType === 'assessment'
            ? t('grades.form.assessmentPlaceholder')
            : t('grades.toolbar.selectExam'),
      searchPlaceholder: sourceType === 'assessment' ? t('grades.toolbar.searchAssessment') : t('grades.toolbar.searchExam'),
      value: sourceId,
      onChange: setSourceId,
      options: sourceOptions,
      disabled: isAllClasses || !sectionId || isSourceLoading || sourceOptions.length === 0,
      className: 'w-full lg:w-56',
    });
    base.push({
      name: 'studentName',
      placeholder: t('grades.table.student'),
      type: 'text',
      className: 'w-full lg:w-48',
    });
    return base;
  }, [
    t, classOptions, sectionOptions, subjectOptions, sourceOptions,
    classId, isAllClasses, sectionId, subjectId, sourceType, sourceId,
    setClassId, setSectionId, setSubjectId,
    setSourceId,
    isClassesLoading, isSectionsLoading, isSubjectsLoading, isSourceLoading,
  ]);
};
