'use client'

import { NForm } from 'najm-kit'
import { FormInput } from 'najm-kit';
import { NFormSectionHeader as FormSectionHeader } from 'najm-kit';
import React, { useEffect, useRef } from 'react'
import { useActiveForm } from '@/hooks/useActiveForm'
import {
  ClipboardList, FileText, Tag, Building, DoorOpen, BookOpen, User,
  Calendar, Clock, Award, Activity,
} from 'lucide-react'
import { useDialog } from 'najm-kit'
import { assessmentSchema } from '@/lib/validations'
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
      formLabel={t('assessments.form.section')}
      placeholder={t('assessments.form.sectionPlaceholder')}
      icon={DoorOpen}
      items={sectionOptions}
      searchPlaceholder={t('assessments.form.searchSections')}
      emptyMessage={t('assessments.form.noSections')}
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

const AssessmentForm = ({ assessment = null }) => {
  const { t } = useTranslation();
  const { pop } = useDialog();

  const { classes, isClassesLoading } = useClasses();
  const { subjects, isSubjectsLoading } = useSubjects();
  const { teachers, isTeachersLoading } = useTeachers();

  const typeOptions = useEnum('assessmentType');
  const statusOptions = useEnum('assessmentStatus');

  const initialClassId = assessment?.classId || assessment?.class?.id || '';
  const initialSectionId = assessment?.sectionId || assessment?.section?.id || '';
  const initialSectionIds = Array.isArray(assessment?.sectionIds) && assessment.sectionIds.length > 0
    ? assessment.sectionIds
    : initialSectionId
      ? [initialSectionId]
      : [];
  const initialSubjectId = assessment?.subjectId || assessment?.subject?.id || '';
  const initialTeacherId = assessment?.teacherId || assessment?.teacher?.id || '';

  const defaultValues = {
    ...(assessment?.id && { id: assessment.id }),
    title: assessment?.title || '',
    description: mergeDescriptionAndInstructions(assessment?.description, assessment?.instructions),
    type: assessment?.type || 'quiz',
    classId: initialClassId,
    sectionId: initialSectionIds[0] || '',
    sectionIds: initialSectionIds,
    subjectId: initialSubjectId,
    teacherId: initialTeacherId,
    date: assessment?.date || undefined,
    duration: assessment?.duration ?? 60,
    totalMarks: assessment?.totalMarks ?? 100,
    passingMarks: assessment?.passingMarks ?? 50,
    status: assessment?.status || 'scheduled',
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
    });
  };

  const fill = () => {
    const a = pickTeacherAssignment(teachers);
    return buildFill(assessmentSchema, {
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
          id='assessment-form'
          schema={assessmentSchema}
          defaultValues={defaultValues}
          onSubmit={handleSubmit}
          devTools={{ enabled: isDevFill, fill }}
        >
          <div className='flex flex-col gap-4'>

            <FormSectionHeader
              icon={ClipboardList}
              title={t('assessments.form.assessmentDetails')}
            />

            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <FormInput
                name='title'
                type='text'
                formLabel={t('assessments.form.title')}
                placeholder={t('assessments.form.titlePlaceholder')}
                icon={ClipboardList}
                required={true}
              />

              <FormInput
                name='type'
                type='select'
                formLabel={t('assessments.form.type')}
                placeholder={t('assessments.form.typePlaceholder')}
                icon={Tag}
                items={typeOptions}
                required={true}
              />
            </div>

            <div className='grid grid-cols-1'>
              <FormInput
                name='description'
                type='textarea'
                formLabel={t('assessments.form.description')}
                placeholder={t('assessments.form.descriptionPlaceholder')}
                icon={FileText}
              />
            </div>

            <FormSectionHeader
              icon={BookOpen}
              title={t('assessments.form.academicContext')}
            />

            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <FormInput
                name='classId'
                type='select'
                formLabel={t('assessments.form.class')}
                placeholder={t('assessments.form.classPlaceholder')}
                icon={Building}
                items={classOptions}
                required={true}
                disabled={isClassesLoading}
              />

              <SectionsMultiselect
                initialClassId={initialClassId}
              />

              <FormInput
                name='subjectId'
                type='select'
                formLabel={t('assessments.form.subject')}
                placeholder={t('assessments.form.subjectPlaceholder')}
                icon={BookOpen}
                items={subjectOptions}
                required={true}
                disabled={isSubjectsLoading}
              />

              <FormInput
                name='teacherId'
                type='select'
                formLabel={t('assessments.form.teacher')}
                placeholder={t('assessments.form.teacherPlaceholder')}
                icon={User}
                items={teacherOptions}
                required={true}
                disabled={isTeachersLoading}
              />
            </div>

            <FormSectionHeader
              icon={Calendar}
              title={t('assessments.form.scheduleAndGrading')}
            />

            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <FormInput
                name='date'
                type='date'
                formLabel={t('assessments.form.date')}
                placeholder={t('assessments.form.datePlaceholder')}
                icon={Calendar}
                required={true}
              />

              <FormInput
                name='duration'
                type='number'
                formLabel={t('assessments.form.duration')}
                placeholder={t('assessments.form.durationPlaceholder')}
                icon={Clock}
                required={true}
              />

              <FormInput
                name='totalMarks'
                type='number'
                formLabel={t('assessments.form.totalMarks')}
                placeholder={t('assessments.form.totalMarksPlaceholder')}
                icon={Award}
                required={true}
              />

              <FormInput
                name='passingMarks'
                type='number'
                formLabel={t('assessments.form.passingMarks')}
                placeholder={t('assessments.form.passingMarksPlaceholder')}
                icon={Award}
                required={true}
              />

              <FormInput
                name='status'
                type='select'
                formLabel={t('assessments.form.status')}
                placeholder={t('assessments.form.statusPlaceholder')}
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

export default AssessmentForm;
