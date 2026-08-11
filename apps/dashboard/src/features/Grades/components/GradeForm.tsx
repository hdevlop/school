'use client'

import { NForm } from 'najm-kit'
import { FormInput } from 'najm-kit';
import { NFormSectionHeader as FormSectionHeader } from 'najm-kit';
import React, { useEffect, useMemo, useRef } from 'react'
import { useActiveForm } from '@/hooks/useActiveForm'
import {
  GraduationCap, ClipboardList, Building, DoorOpen, BookOpen, User, Award,
  ListChecks, UserCircle,
} from 'lucide-react'
import { useDialog } from 'najm-kit'
import { gradeSchema } from '@/lib/validations'
import { buildFill, isDevFill, pick } from '@/lib/devFill'
import { useTranslation } from '@/hooks/useLanguage'
import { useClasses } from '@/hooks/useClasses'
import { useSections } from '@/features/Sections/hooks/useSections'
import { useSubjects } from '@/features/Subjects/hooks/useSubjects'
import { useTeachers } from '@/features/Teachers/hooks/useTeachers'
import { useStudents } from '@/features/Students/hooks/useStudents'
import { useAssessments } from '@/features/Assessments/hooks/useAssessments'

const SectionDropdown = ({ initialClassId, isEdit }) => {
  const { t } = useTranslation();
  const { watch, setValue, getValues } = useActiveForm();
  const { sections, isSectionsLoading } = useSections();

  const classId = watch('classId');

  const hydratedRef = useRef(false);
  useEffect(() => {
    if (!hydratedRef.current) {
      hydratedRef.current = true;
      return;
    }
    const currentSectionId = getValues('sectionId');
    const sectionStillMatchesClass = (sections || []).some(
      (section) => section.id === currentSectionId && section.classId === classId
    );
    if (classId !== initialClassId && !sectionStillMatchesClass) {
      setValue('sectionId', '');
    }
  }, [classId, getValues, initialClassId, sections, setValue]);

  const sectionOptions = (sections || [])
    .filter((s) => !classId || s.classId === classId)
    .map((s) => ({ value: s.id, label: s.name }));

  return (
    <FormInput
      name='sectionId'
      type='select'
      formLabel={t('grades.form.section')}
      placeholder={t('grades.form.sectionPlaceholder')}
      icon={DoorOpen}
      items={sectionOptions}
      required={true}
      disabled={isEdit || isSectionsLoading || !classId}
    />
  );
};

const getAssessmentClassId = (assessment) => assessment?.classId || assessment?.class?.id || '';
const getAssessmentSectionId = (assessment) => assessment?.sectionId || assessment?.section?.id || '';
const getAssessmentSubjectId = (assessment) => assessment?.subjectId || assessment?.subject?.id || '';
const getAssessmentTeacherId = (assessment) => assessment?.teacherId || assessment?.teacher?.id || '';

const AssessmentContextSync = ({ assessments, isEdit }) => {
  const { watch, setValue } = useActiveForm();
  const assessmentId = watch('assessmentId');

  useEffect(() => {
    if (isEdit || !assessmentId) return;
    const assessment = (assessments || []).find((item) => item.id === assessmentId);
    if (!assessment) return;

    const classId = getAssessmentClassId(assessment);
    const sectionId = getAssessmentSectionId(assessment);
    const subjectId = getAssessmentSubjectId(assessment);
    const teacherId = getAssessmentTeacherId(assessment);

    if (classId) setValue('classId', classId, { shouldDirty: true, shouldValidate: true });
    if (sectionId) setValue('sectionId', sectionId, { shouldDirty: true, shouldValidate: true });
    if (subjectId) setValue('subjectId', subjectId, { shouldDirty: true, shouldValidate: true });
    if (teacherId) setValue('teacherId', teacherId, { shouldDirty: true, shouldValidate: true });
  }, [assessmentId, assessments, isEdit, setValue]);

  return null;
};

const MarksRefHelper = ({ assessments }) => {
  const { t } = useTranslation();
  const { watch } = useActiveForm();
  const assessmentId = watch('assessmentId');
  const selected = useMemo(
    () => (assessments || []).find((a) => a.id === assessmentId),
    [assessments, assessmentId]
  );

  if (!selected) return null;
  return (
    <div className="text-xs text-muted-foreground -mt-1 pl-1">
      {t('grades.form.totalMarksRef')}: <span className="font-medium">{selected.totalMarks}</span>
      {selected.passingMarks != null && (
        <>
          {' · '}{t('grades.form.passingMarksRef')}: <span className="font-medium">{selected.passingMarks}</span>
        </>
      )}
    </div>
  );
};

const GradeForm = ({ grade = null }) => {
  const { t } = useTranslation();
  const { pop } = useDialog();
  const isEdit = !!grade?.id;

  const { classes, isClassesLoading } = useClasses();
  const { subjects, isSubjectsLoading } = useSubjects();
  const { teachers, isTeachersLoading } = useTeachers();
  const { students, isStudentsLoading } = useStudents();
  const { assessments, isAssessmentsLoading } = useAssessments();

  const initialClassId = grade?.classId || grade?.class?.id || '';
  const initialSectionId = grade?.sectionId || grade?.section?.id || '';
  const initialSubjectId = grade?.subjectId || grade?.subject?.id || '';
  const initialTeacherId = grade?.teacherId || grade?.teacher?.id || '';
  const initialStudentId = grade?.studentId || grade?.student?.id || '';
  const initialAssessmentId = grade?.assessmentId || grade?.assessment?.id || '';

  const defaultValues = {
    ...(grade?.id && { id: grade.id }),
    studentId: initialStudentId,
    assessmentId: initialAssessmentId,
    classId: initialClassId,
    sectionId: initialSectionId,
    subjectId: initialSubjectId,
    teacherId: initialTeacherId,
    marksObtained: grade?.marksObtained ?? 0,
    feedback: grade?.feedback || '',
    status: grade?.status || 'graded',
  };

  const classOptions = classes?.map((cls) => ({
    value: cls.id,
    label: `${cls.name}${cls.academicYear ? ` (${cls.academicYear})` : ''}`,
  })) || [];

  const subjectOptions = subjects?.map((s) => ({
    value: s.id,
    label: s.code ? `${s.name} (${s.code})` : s.name,
  })) || [];

  const teacherOptions = teachers?.map((tc) => ({
    value: tc.id,
    label: tc.name || tc.email || tc.id,
  })) || [];

  const studentOptions = students?.map((s) => ({
    value: s.id,
    label: s.studentCode ? `${s.name} (${s.studentCode})` : s.name,
  })) || [];

  const assessmentOptions = assessments?.map((a) => ({
    value: a.id,
    label: `${a.title}${a.totalMarks ? ` — /${a.totalMarks}` : ''}`,
  })) || [];

  const fill = () => {
    const a: any = pick(assessments || []);
    const s: any = pick(students || []);
    return buildFill(gradeSchema, {
      assessmentId: a?.id ?? assessmentOptions,
      classId: a?.classId ?? classOptions,
      sectionId: a?.sectionId ?? '',
      subjectId: a?.subjectId ?? subjectOptions,
      teacherId: a?.teacherId ?? teacherOptions,
      studentId: s?.id ?? studentOptions,
      marksObtained: a?.totalMarks ? Math.min(10, Number(a.totalMarks)) : 10,
    });
  };

  const handleSubmit = async (formData) => {
    const selectedAssessment = (assessments || []).find((a) => a.id === formData.assessmentId);
    if (selectedAssessment && Number(formData.marksObtained) > Number(selectedAssessment.totalMarks)) {
      // Surface as a thrown error so the dialog stays open and we don't post.
      throw new Error(
        `${t('grades.errors.marksExceedTotal')} (${selectedAssessment.totalMarks})`
      );
    }
    pop(formData);
  };

  return (
    <div className='flex flex-col justify-center items-center w-full'>
      <div className='flex flex-col h-full w-full gap-4'>
        <NForm
          id='grade-form'
          schema={gradeSchema}
          defaultValues={defaultValues}
          onSubmit={handleSubmit}
          devTools={{ enabled: isDevFill, fill }}
        >
          <AssessmentContextSync assessments={assessments} isEdit={isEdit} />

          <div className='flex flex-col gap-4'>

            <FormSectionHeader
              icon={UserCircle}
              title={t('grades.form.studentAndAssessment')}
            />

            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <FormInput
                name='studentId'
                type='combobox'
                formLabel={t('grades.form.student')}
                placeholder={t('grades.form.studentPlaceholder')}
                icon={UserCircle}
                items={studentOptions}
                required={true}
                disabled={isEdit || isStudentsLoading}
              />

              <FormInput
                name='assessmentId'
                type='combobox'
                formLabel={t('grades.form.assessment')}
                placeholder={t('grades.form.assessmentPlaceholder')}
                icon={ClipboardList}
                items={assessmentOptions}
                required={true}
                disabled={isEdit || isAssessmentsLoading}
              />
            </div>

            <FormSectionHeader
              icon={BookOpen}
              title={t('grades.form.academicContext')}
            />

            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <FormInput
                name='classId'
                type='combobox'
                formLabel={t('grades.form.class')}
                placeholder={t('grades.form.classPlaceholder')}
                icon={Building}
                items={classOptions}
                disabled={isEdit || isClassesLoading}
              />

              <SectionDropdown initialClassId={initialClassId} isEdit={isEdit} />

              <FormInput
                name='subjectId'
                type='combobox'
                formLabel={t('grades.form.subject')}
                placeholder={t('grades.form.subjectPlaceholder')}
                icon={BookOpen}
                items={subjectOptions}
                required={true}
                disabled={isEdit || isSubjectsLoading}
              />

              <FormInput
                name='teacherId'
                type='combobox'
                formLabel={t('grades.form.teacher')}
                placeholder={t('grades.form.teacherPlaceholder')}
                icon={User}
                items={teacherOptions}
                required={true}
                disabled={isEdit || isTeachersLoading}
              />
            </div>

            <FormSectionHeader
              icon={GraduationCap}
              title={t('grades.form.gradeDetails')}
            />

            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div className='flex flex-col gap-1'>
                <FormInput
                  name='marksObtained'
                  type='number'
                  formLabel={t('grades.form.marksObtained')}
                  placeholder={t('grades.form.marksObtainedPlaceholder')}
                  icon={Award}
                  required={true}
                />
                <MarksRefHelper assessments={assessments} />
              </div>

            </div>

            <div className='grid grid-cols-1 gap-2'>
              <FormInput
                name='feedback'
                type='textarea'
                formLabel={t('grades.form.feedback')}
                placeholder={t('grades.form.feedbackPlaceholder')}
                icon={ListChecks}
              />
            </div>

          </div>
        </NForm>
      </div>
    </div>
  );
};

export default GradeForm;
