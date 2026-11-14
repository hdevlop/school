'use client'

import { FormInput, NErrorState, NForm, NFormSectionHeader as FormSectionHeader, NLoadingState } from 'najm-kit';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { BookMarked, BookOpen, Building, Calendar, CalendarClock, DoorOpen, FileText, NotebookPen, Paperclip, User } from 'lucide-react';
import { localDateInput } from 'najm-kit/format';
import { useTranslation } from 'najm-i18n/react';
import type { HomeworkRow } from '@sms/contracts';
import { useDialog } from '@/shared/useDialog';
import { useClasses } from '@/features/Classes/hooks/useClasses';
import { useSections } from '@/features/Sections/hooks/useSections';
import { useSubjects } from '@/features/Subjects/hooks/useSubjects';
import { useTeachers } from '@/features/Teachers/hooks/useTeachers';
import { useAcademicYearOptions, useViewingAcademicYear } from '@/features/AcademicYears/hooks/useViewingAcademicYear';
import { teachingDateWithinYear } from '@/features/AcademicYears/utils/viewingYear';
import { eligibleAssessmentTeachers } from '@/features/Assessments/config/assessmentTeachers';
import { useViewerRole } from '@/features/Users/hooks/useViewerRole';
import { useTeacherOverview } from '@/features/Dashboard/hooks/useTeacherDashboard';
import { useYearScopedList } from '@/features/AcademicYears/hooks/useYearScopedQuery';
import { getHomeworkPartsApi } from '@/services/homeworkApi';
import { createHomeworkSchema, type HomeworkSubmitValues } from '../config/homeworkSchemas';
import { taughtClassIds, taughtSectionIds, taughtSubjectIds, type TeachingAssignment } from '../config/homeworkTeaching';
import { liveAttachments } from '../config/homeworkFiles';
import type { HomeworkSave } from '../hooks/useHomework';
import HomeworkFilePicker from './HomeworkFilePicker';

// Only the teachers who teach the subject in every chosen section: the
// server refuses anyone else.
const HomeworkTeacherSelect = () => {
  const { t } = useTranslation();
  const { setValue } = useFormContext();
  const { teachers, isTeachersLoading } = useTeachers();
  const [classId, sectionIds, subjectId, teacherId] = useWatch({ name: ['classId', 'sectionIds', 'subjectId', 'teacherId'] });
  const options = useMemo(() => eligibleAssessmentTeachers(teachers || [], classId, sectionIds || [], subjectId)
    .map((teacher: any) => ({ value: teacher.id, label: teacher.name || teacher.email || teacher.id })),
  [teachers, classId, sectionIds, subjectId]);

  useEffect(() => {
    if (!isTeachersLoading && teachers && teacherId && !options.some((option) => option.value === teacherId)) {
      setValue('teacherId', '', { shouldValidate: true, shouldDirty: true });
    }
  }, [teachers, isTeachersLoading, teacherId, options, setValue]);

  return (
    <FormInput
      name="teacherId"
      type="select"
      formLabel={t('homework.form.teacher')}
      placeholder={t('homework.form.teacherPlaceholder')}
      icon={User}
      items={options}
      required
      disabled={isTeachersLoading || !classId || !sectionIds?.length || !subjectId}
    />
  );
};

type OwnTeaching = { assignments: TeachingAssignment[] | null; isLoading: boolean };

// A teacher posts only where they teach. Other roles get `null`: every class,
// section and subject, narrowed afterwards by the teacher select.
function useOwnTeaching(isTeacher: boolean): OwnTeaching {
  const { data: overview, isLoading: isOverviewLoading } = useTeacherOverview(undefined, isTeacher);
  const { teachers, isTeachersLoading } = useTeachers({ enabled: isTeacher });
  return useMemo(() => {
    if (!isTeacher) return { assignments: null, isLoading: false };
    const self = (teachers || []).find((teacher: any) => teacher.id === overview?.teacher?.id);
    return {
      assignments: Array.isArray(self?.assignments) ? self.assignments : [],
      isLoading: isOverviewLoading || isTeachersLoading,
    };
  }, [isTeacher, teachers, overview, isOverviewLoading, isTeachersLoading]);
}

const HomeworkSubjectSelect = ({ own }: { own: OwnTeaching }) => {
  const { t } = useTranslation();
  const { setValue } = useFormContext();
  const { subjects, isSubjectsLoading } = useSubjects();
  const [classId, sectionIds, subjectId] = useWatch({ name: ['classId', 'sectionIds', 'subjectId'] });
  const taught = useMemo(() => taughtSubjectIds(own.assignments, classId, sectionIds || []), [own.assignments, classId, sectionIds]);
  const options = useMemo(() => (subjects || [])
    .filter((subject: any) => !taught || taught.has(subject.id))
    .map((subject: any) => ({
      value: subject.id,
      label: subject.code ? `${subject.name} (${subject.code})` : subject.name,
    })), [subjects, taught]);

  // A section the teacher does not teach the subject in drops the subject; a
  // single possible subject is chosen for them, and there is nothing to show.
  const only = !own.isLoading && !isSubjectsLoading && options.length === 1 ? options[0].value : null;
  useEffect(() => {
    if (!taught || own.isLoading) return;
    if (only && subjectId !== only) setValue('subjectId', only, { shouldValidate: true });
    else if (!only && subjectId && !taught.has(subjectId)) setValue('subjectId', '', { shouldValidate: true, shouldDirty: true });
  }, [taught, only, own.isLoading, subjectId, setValue]);

  if (taught && only) return null;
  return (
    <FormInput
      name="subjectId"
      type="select"
      formLabel={t('homework.form.subject')}
      placeholder={t('homework.form.subjectPlaceholder')}
      icon={BookOpen}
      items={options}
      required
      disabled={isSubjectsLoading || own.isLoading}
    />
  );
};

// The part of the chosen subject as this class is taught it: Massar's parts for
// the class's level that year (CP Français: Graphisme…), or without Massar the
// subject's own sub-subjects. The server decides the list and checks it again.
// Shown only when there is one; optional, and dropped when it no longer applies.
const HomeworkSubSubjectSelect = () => {
  const { t } = useTranslation();
  const { setValue } = useFormContext();
  const [classId, sectionIds, subjectId, subSubject] = useWatch({ name: ['classId', 'sectionIds', 'subjectId', 'subSubject'] });
  const targets = useMemo(() => [...(sectionIds || [])].filter(Boolean).sort(), [sectionIds]);
  const { data: parts, isLoading } = useYearScopedList({
    resource: 'homework-parts',
    parts: [subjectId, classId, targets.join(',')],
    fetch: () => getHomeworkPartsApi({ subjectId, classId, sectionIds: targets }),
    enabled: Boolean(subjectId && classId),
  });
  const options = useMemo(() => (subjectId && classId ? parts as string[] : [])
    .map((part) => ({ value: part, label: part })), [parts, subjectId, classId]);

  useEffect(() => {
    if (!isLoading && subSubject && !options.some((option) => option.value === subSubject)) {
      setValue('subSubject', null, { shouldDirty: true });
    }
  }, [isLoading, subSubject, options, setValue]);

  if (!options.length) return null;
  return (
    <FormInput
      name="subSubject"
      type="select"
      formLabel={t('homework.form.subSubject')}
      placeholder={t('homework.form.subSubjectPlaceholder')}
      icon={BookMarked}
      items={options}
    />
  );
};

const SectionsMultiselect = ({ initialClassId, own }: { initialClassId: string; own: OwnTeaching }) => {
  const { t } = useTranslation();
  const { setValue } = useFormContext();
  const { sections, isSectionsLoading } = useSections();
  const classId = useWatch({ name: 'classId' });
  const taught = useMemo(() => taughtSectionIds(own.assignments, classId), [own.assignments, classId]);

  const hydrated = useRef(false);
  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true;
      return;
    }
    if (classId !== initialClassId) setValue('sectionIds', []);
  }, [classId, initialClassId, setValue]);

  const options = (sections || [])
    .filter((section: any) => !classId || section.classId === classId)
    .filter((section: any) => !taught || taught.has(section.id))
    .map((section: any) => ({ value: section.id, label: section.name }));

  // Half a phone's width: the placeholder ends in "…" rather than wrapping the box.
  return (
    <div className="min-w-0 [&_[role=combobox]>div>span]:truncate">
    <FormInput
      name="sectionIds"
      type="multiselect"
      formLabel={t('homework.form.section')}
      placeholder={t('homework.form.sectionPlaceholder')}
      icon={DoorOpen}
      items={options}
      searchPlaceholder={t('homework.form.searchSections')}
      emptyMessage={t('homework.form.noSections')}
      maxDisplay={3}
      required
      disabled={isSectionsLoading || own.isLoading || !classId}
    />
    </div>
  );
};

const HomeworkForm = ({ homework = null }: { homework?: HomeworkRow | null }) => {
  const { t } = useTranslation();
  const { pop } = useDialog();
  // A teacher posts as themselves; the administration names the teacher.
  const { role } = useViewerRole();
  const teacherRequired = role !== 'teacher';
  const own = useOwnTeaching(!teacherRequired);
  const schema = useMemo(() => createHomeworkSchema(t, { teacherRequired }), [t, teacherRequired]);
  const { viewingYear, isResolving } = useViewingAcademicYear();
  const { data: registeredYears, isPending: isYearsPending } = useAcademicYearOptions();
  const calendar = registeredYears?.years.find((year) => year.label === viewingYear);

  const { classes, isClassesLoading } = useClasses();

  const [files, setFiles] = useState<File[]>([]);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const stored = useMemo(() => liveAttachments(homework?.attachments), [homework?.attachments]);

  const initialClassId = homework?.class?.id || '';
  const initialSectionIds = homework?.sectionIds?.length
    ? homework.sectionIds
    : homework?.section?.id ? [homework.section.id] : [];

  const defaultValues = {
    title: homework?.title || '',
    content: homework?.content || '',
    classId: initialClassId,
    sectionIds: initialSectionIds,
    subjectId: homework?.subject?.id || '',
    subSubject: homework?.subSubject || null,
    teacherId: homework?.teacher?.id || '',
    date: homework?.date || (calendar ? teachingDateWithinYear(localDateInput(), calendar) : undefined),
    dueOn: homework?.dueOn || '',
  };

  const taughtClasses = taughtClassIds(own.assignments);
  const classOptions = (classes || [])
    .filter((item: any) => !taughtClasses || taughtClasses.has(item.id))
    // The form is for the year being viewed; naming it on every class says nothing.
    .map((item: any) => ({ value: item.id, label: item.name }));

  const handleSubmit = (values: HomeworkSubmitValues) => {
    const save: HomeworkSave = {
      ...(homework?.id ? { id: homework.id } : {}),
      sectionIds: [...new Set(values.sectionIds.filter(Boolean))],
      subjectId: values.subjectId,
      subSubject: values.subSubject || null,
      ...(teacherRequired && values.teacherId ? { teacherId: values.teacherId } : {}),
      title: values.title,
      content: values.content || null,
      date: values.date,
      dueOn: values.dueOn || null,
      files,
      removedAttachmentIds: removedIds,
    };
    pop(save);
  };

  if (isResolving || isYearsPending) {
    return <NLoadingState surface="panel" label={t('common.loading')} className="min-h-64" />;
  }
  if (!calendar) return <NErrorState surface="panel" />;

  return (
    <div className="flex w-full flex-col gap-4">
      <NForm key={viewingYear} id="homework-form" schema={schema} defaultValues={defaultValues} onSubmit={handleSubmit}>
        <div className="flex flex-col gap-4">
          <FormSectionHeader icon={NotebookPen} title={t('homework.form.details')} />
          <FormInput
            name="title"
            type="text"
            formLabel={t('homework.form.title')}
            placeholder={t('homework.form.titlePlaceholder')}
            icon={NotebookPen}
            required
          />
          <FormInput
            name="content"
            type="textarea"
            formLabel={t('homework.form.content')}
            placeholder={t('homework.form.contentPlaceholder')}
            icon={FileText}
          />

          {/* On a phone the fields pair up two per row and speak for themselves, without these headers. */}
          <div className="hidden md:block"><FormSectionHeader icon={BookOpen} title={t('homework.form.context')} /></div>
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <FormInput
              name="classId"
              type="select"
              formLabel={t('homework.form.class')}
              placeholder={t('homework.form.classPlaceholder')}
              icon={Building}
              items={classOptions}
              required
              disabled={isClassesLoading || own.isLoading}
            />
            <SectionsMultiselect initialClassId={initialClassId} own={own} />
            <HomeworkSubjectSelect own={own} />
            <HomeworkSubSubjectSelect />
            {teacherRequired && <HomeworkTeacherSelect />}
          </div>

          {/* The two date labels say what they are; no header above them. */}
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <FormInput name="date" type="date" formLabel={t('homework.form.date')} icon={Calendar} required />
            <FormInput name="dueOn" type="date" formLabel={t('homework.form.dueOn')} icon={CalendarClock} />
          </div>
        </div>
      </NForm>

      {/* Outside the form on purpose: files are not form fields, and picking one must not submit. */}
      <FormSectionHeader icon={Paperclip} title={t('homework.form.attachments')} />
      <HomeworkFilePicker
        homeworkId={homework?.id}
        stored={stored}
        removedIds={removedIds}
        onRemovedIdsChange={setRemovedIds}
        files={files}
        onFilesChange={setFiles}
      />
    </div>
  );
};

export default HomeworkForm;
