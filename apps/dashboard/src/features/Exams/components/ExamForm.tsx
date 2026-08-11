'use client'

import { NForm } from 'najm-kit'
import { FormInput } from 'najm-kit';
import { NFormSectionHeader as FormSectionHeader } from 'najm-kit';
import React, { useEffect, useRef } from 'react'
import { useActiveForm } from '@/hooks/useActiveForm'
import {
  GraduationCap, FileText, Tag, Building, DoorOpen, BookOpen, User,
  Calendar, Clock, Award, Activity, Hash,
} from 'lucide-react'
import { useDialog } from 'najm-kit'
import { examSchema } from '@/lib/validations'
import { buildFill, isDevFill } from '@/lib/devFill'
import { useTranslation } from '@/hooks/useLanguage'
import { useEnum } from '@/hooks/useEnum'
import { useClasses } from '@/hooks/useClasses'
import { useSections } from '@/features/Sections/hooks/useSections'
import { useSubjects } from '@/features/Subjects/hooks/useSubjects'
import { useTeachers } from '@/features/Teachers/hooks/useTeachers'

const SectionsMultiselect = ({ initialClassId }) => {
  const { t } = useTranslation();
  const { watch, setValue } = useActiveForm();
  const { sections, isSectionsLoading } = useSections();

  const classId = watch('classId');

  const hydratedRef = useRef(false);
  useEffect(() => {
    if (!hydratedRef.current) {
      hydratedRef.current = true;
      return;
    }
    if (classId !== initialClassId) {
      setValue('sectionIds', []);
      setValue('sectionId', '');
    }
  }, [classId, initialClassId, setValue]);

  const sectionOptions = (sections || [])
    .filter((s) => !classId || s.classId === classId)
    .map((s) => ({ value: s.id, label: s.name }));

  return (
    <FormInput
      name='sectionIds'
      type='multiselect'
      formLabel={t('exams.form.section')}
      placeholder={t('exams.form.sectionPlaceholder')}
      icon={DoorOpen}
      items={sectionOptions}
      searchPlaceholder='Search sections...'
      emptyMessage='No sections found'
      maxDisplay={3}
      required={true}
      disabled={isSectionsLoading || !classId}
    />
  );
};

const pickTeacherAssignment = (teachers, sectionId = '', subjectId = '') => {
  const assignments = (teachers || []).flatMap((teacher) =>
    (teacher.assignments || []).flatMap((assignment) =>
      (assignment.sectionIds || []).flatMap((assignmentSectionId) =>
        (assignment.subjectIds || []).map((assignmentSubjectId) => ({
          teacherId: teacher.id,
          classId: assignment.classId,
          sectionId: assignmentSectionId,
          subjectId: assignmentSubjectId,
        }))
      )
    )
  );

  const matchingAssignments = assignments.filter((assignment) => {
    const sectionMatches = !sectionId || assignment.sectionId === sectionId;
    const subjectMatches = !subjectId || assignment.subjectId === subjectId;
    return sectionMatches && subjectMatches;
  });

  const pool = matchingAssignments.length ? matchingAssignments : assignments;
  return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
};

const mergeDescriptionAndInstructions = (description?: string, instructions?: string) =>
  [description, instructions].filter(Boolean).join('\n\n');

const ExamForm = ({ exam = null }) => {
  const { t } = useTranslation();
  const { pop } = useDialog();

  const { classes, isClassesLoading } = useClasses();
  const { subjects, isSubjectsLoading } = useSubjects();
  const { teachers, isTeachersLoading } = useTeachers();

  const typeOptions = useEnum('examType');
  const statusOptions = useEnum('examStatus');

  const initialClassId = exam?.classId || exam?.class?.id || '';
  const initialSectionId = exam?.sectionId || exam?.section?.id || '';
  const initialSectionIds = Array.isArray(exam?.sectionIds) && exam.sectionIds.length > 0
    ? exam.sectionIds
    : initialSectionId
      ? [initialSectionId]
      : [];
  const initialSubjectId = exam?.subjectId || exam?.subject?.id || '';
  const initialTeacherId = exam?.teacherId || exam?.teacher?.id || '';

  const defaultValues = {
    ...(exam?.id && { id: exam.id }),
    title: exam?.title || '',
    description: mergeDescriptionAndInstructions(exam?.description, exam?.instructions),
    type: exam?.type || 'midterm',
    classId: initialClassId,
    sectionId: initialSectionIds[0] || '',
    sectionIds: initialSectionIds,
    subjectId: initialSubjectId,
    teacherId: initialTeacherId,
    date: exam?.date || undefined,
    startTime: exam?.startTime || '',
    endTime: exam?.endTime || '',
    duration: exam?.duration ?? 60,
    totalMarks: exam?.totalMarks ?? 20,
    passingMarks: exam?.passingMarks ?? 10,
    roomNumber: exam?.roomNumber ?? undefined,
    status: exam?.status || 'scheduled',
  };

  const classOptions = classes?.map((cls) => ({
    value: cls.id,
    label: `${cls.name}${cls.academicYear ? ` (${cls.academicYear})` : ''}`,
  })) || [];

  const subjectOptions = subjects?.map((s) => ({
    value: s.id,
    label: s.code ? `${s.name} (${s.code})` : s.name,
  })) || [];

  const teacherOptions = teachers?.map((t) => ({
    value: t.id,
    label: t.name || t.email || t.id,
  })) || [];

  const handleSubmit = async (formData) => {
    const sectionIds = [...new Set((formData.sectionIds || []).filter(Boolean))];
    pop({
      ...formData,
      instructions: '',
      sectionIds,
      sectionId: sectionIds[0] || undefined,
      startTime: formData.startTime || undefined,
      endTime: formData.endTime || undefined,
    });
  };

  const fill = () => {
    const a = pickTeacherAssignment(teachers);
    return buildFill(examSchema, {
      classId: a?.classId ?? classOptions,
      sectionId: a?.sectionId ?? '',
      sectionIds: a?.sectionId ? [a.sectionId] : [],
      subjectId: a?.subjectId ?? subjectOptions,
      teacherId: a?.teacherId ?? teacherOptions,
    });
  };

  return (
    <div className='flex flex-col justify-center items-center w-full'>
      <div className='flex flex-col h-full w-full gap-4'>
        <NForm
          id='exam-form'
          schema={examSchema}
          defaultValues={defaultValues}
          onSubmit={handleSubmit}
          devTools={{ enabled: isDevFill, fill }}
        >
          <div className='flex flex-col gap-4'>

            <FormSectionHeader
              icon={GraduationCap}
              title={t('exams.form.examDetails')}
            />

            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <FormInput
                name='title'
                type='text'
                formLabel={t('exams.form.title')}
                placeholder={t('exams.form.titlePlaceholder')}
                icon={GraduationCap}
                required={true}
              />

              <FormInput
                name='type'
                type='select'
                formLabel={t('exams.form.type')}
                placeholder={t('exams.form.typePlaceholder')}
                icon={Tag}
                items={typeOptions}
                required={true}
              />
            </div>

            <div className='grid grid-cols-1'>
              <FormInput
                name='description'
                type='textarea'
                formLabel={t('exams.form.description')}
                placeholder={t('exams.form.descriptionPlaceholder')}
                icon={FileText}
              />
            </div>

            <FormSectionHeader
              icon={BookOpen}
              title={t('exams.form.academicContext')}
            />

            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <FormInput
                name='classId'
                type='select'
                formLabel={t('exams.form.class')}
                placeholder={t('exams.form.classPlaceholder')}
                icon={Building}
                items={classOptions}
                disabled={isClassesLoading}
              />

              <SectionsMultiselect initialClassId={initialClassId} />

              <FormInput
                name='subjectId'
                type='select'
                formLabel={t('exams.form.subject')}
                placeholder={t('exams.form.subjectPlaceholder')}
                icon={BookOpen}
                items={subjectOptions}
                required={true}
                disabled={isSubjectsLoading}
              />

              <FormInput
                name='teacherId'
                type='select'
                formLabel={t('exams.form.teacher')}
                placeholder={t('exams.form.teacherPlaceholder')}
                icon={User}
                items={teacherOptions}
                required={true}
                disabled={isTeachersLoading}
              />
            </div>

            <FormSectionHeader
              icon={Calendar}
              title={t('exams.form.scheduleAndGrading')}
            />

            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <FormInput
                name='date'
                type='date'
                formLabel={t('exams.form.date')}
                placeholder={t('exams.form.datePlaceholder')}
                icon={Calendar}
                required={true}
              />

              <FormInput
                name='roomNumber'
                type='number'
                formLabel={t('exams.form.roomNumber')}
                placeholder={t('exams.form.roomNumberPlaceholder')}
                icon={Hash}
              />

              <FormInput
                name='duration'
                type='number'
                formLabel={t('exams.form.duration')}
                placeholder={t('exams.form.durationPlaceholder')}
                icon={Clock}
                required={true}
              />

              <FormInput
                name='totalMarks'
                type='number'
                formLabel={t('exams.form.totalMarks')}
                placeholder={t('exams.form.totalMarksPlaceholder')}
                icon={Award}
                required={true}
              />

              <FormInput
                name='passingMarks'
                type='number'
                formLabel={t('exams.form.passingMarks')}
                placeholder={t('exams.form.passingMarksPlaceholder')}
                icon={Award}
                required={true}
              />

              <FormInput
                name='status'
                type='select'
                formLabel={t('exams.form.status')}
                placeholder={t('exams.form.statusPlaceholder')}
                icon={Activity}
                items={statusOptions}
                required={true}
              />
            </div>

          </div>
        </NForm>
      </div>
    </div>
  );
};

export default ExamForm;
