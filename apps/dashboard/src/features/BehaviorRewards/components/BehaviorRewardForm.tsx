'use client';

import { useEffect, useMemo } from 'react';
import { Award, BookOpen, CalendarClock, FileBadge, FileText, Gift, Star, UserRound } from 'lucide-react';
import { useFormContext, useWatch } from 'react-hook-form';
import { FormInput, NForm, NFormSectionHeader } from 'najm-kit';
import { useDialog } from '@/shared/useDialog';
import { useTranslation } from 'najm-i18n/react';
import { createBehaviorRewardSchema } from '../config/behaviorRewardSchemas';
import { useStudents } from '@/features/Students/hooks/useStudents';
import { FormStudentCombobox } from '@/features/Students/components/StudentCombobox';
import { toLocalDateTimeInput } from '../behaviorRewardConstants';
import { useViewingYearCalendar } from '@/features/AcademicYears/hooks/useViewingAcademicYear';
import { teachingDateWithinYear } from '@/features/AcademicYears/utils/viewingYear';
import {
  buildBehaviorRewardCategoryOptions,
  buildBehaviorRewardCertificatePlaceOptions,
  buildBehaviorRewardTypeOptions,
  buildRewardSubjectOptions,
  NO_REWARD_SUBJECT,
} from '../config/behaviorRewardOptions';
import { RewardTemplateGenerateButton } from '@/features/RewardTemplates/components/RewardTemplateGenerateButton';
import { useSubjects } from '@/features/Subjects/hooks/useSubjects';
import { useViewerRole } from '@/features/Users/hooks/useViewerRole';
import { useOwnTeaching } from '@/features/Homework/hooks/useOwnTeaching';
import { taughtSubjectIds } from '@/features/Homework/config/homeworkTeaching';

type PlacedStudent = { id: string; classId?: string | null; sectionId?: string | null };

/**
 * The subject the behavior was in, optional. A teacher's subjects for the
 * pupil's section come first, and a new reward from a teacher who teaches the
 * pupil one subject starts on it.
 */
function RewardSubjectField({ students, isNew }: { students: readonly PlacedStudent[]; isNew: boolean }) {
  const { t } = useTranslation();
  const { role } = useViewerRole();
  const own = useOwnTeaching(role === 'teacher');
  const { subjects, isSubjectsLoading } = useSubjects();
  const { getFieldState, setValue } = useFormContext();
  const studentId = useWatch({ name: 'studentId' });
  const student = students.find((item) => item.id === studentId);
  const taught = useMemo(() => (own.assignments && student?.classId
    ? taughtSubjectIds(own.assignments, student.classId, student.sectionId ? [student.sectionId] : [])
    : own.assignments ? taughtSubjectIds(own.assignments, '', []) : null), [own.assignments, student?.classId, student?.sectionId]);
  const items = useMemo(() => buildRewardSubjectOptions(subjects || [], taught, t), [subjects, taught, t]);
  const only = taught?.size === 1 ? [...taught][0] : null;
  useEffect(() => {
    if (isNew && only && student && !getFieldState('subjectId').isDirty) setValue('subjectId', only);
  }, [isNew, only, student, getFieldState, setValue]);

  return (
    <FormInput
      name="subjectId"
      type="combobox"
      icon={BookOpen}
      formLabel={t('behaviorRewards.form.subject')}
      placeholder={t('behaviorRewards.form.subjectPlaceholder')}
      items={items}
      disabled={isSubjectsLoading || own.isLoading}
    />
  );
}

/** A certificate names its place, printed on it; the field shows only while the reward is a certificate. */
function CertificatePlaceField() {
  const { t } = useTranslation();
  if (useWatch({ name: 'rewardType' }) !== 'certificate') return null;
  return (
    <FormInput
      name="certificatePlace"
      type="select"
      icon={FileBadge}
      formLabel={t('behaviorRewards.form.certificatePlace')}
      placeholder={t('behaviorRewards.form.certificatePlacePlaceholder')}
      items={buildBehaviorRewardCertificatePlaceOptions(t)}
      required
    />
  );
}

const BehaviorRewardForm = ({ behaviorReward = null }: { behaviorReward?: any }) => {
  const { t } = useTranslation();
  const behaviorRewardSchema = useMemo(() => createBehaviorRewardSchema(t), [t]);
  const { pop } = useDialog();
  const { students, isStudentsLoading } = useStudents();

  const activeStudents = useMemo(() => (students || []).filter((student) => student.status === 'active'), [students]);

  const yearCalendar = useViewingYearCalendar();
  const storedDate = toLocalDateTimeInput(behaviorReward?.behaviorAt).slice(0, 10);
  const defaultValues = {
    studentId: behaviorReward?.studentId || '',
    // A new record starts on today's date inside the viewed year.
    behaviorDate: behaviorReward?.behaviorAt ? storedDate : teachingDateWithinYear(storedDate, yearCalendar),
    behaviorTime: toLocalDateTimeInput(behaviorReward?.behaviorAt).slice(11, 16),
    category: behaviorReward?.category || 'academic_effort',
    description: behaviorReward?.description || '',
    rewardType: behaviorReward?.rewardType || 'verbal_praise',
    points: behaviorReward?.points ?? 0,
    certificatePlace: behaviorReward?.certificatePlace ?? null,
    subjectId: behaviorReward?.subject?.id || behaviorReward?.subjectId || NO_REWARD_SUBJECT,
  };

  const handleSubmit = async (formData) => {
    const { behaviorDate, behaviorTime, ...payload } = formData;
    pop({
      ...payload,
      behaviorAt: new Date(`${behaviorDate}T${behaviorTime}`).toISOString(),
      points: Number(formData.points || 0),
      certificatePlace: payload.rewardType === 'certificate' ? payload.certificatePlace : null,
      subjectId: payload.subjectId && payload.subjectId !== NO_REWARD_SUBJECT ? payload.subjectId : null,
    });
  };

  return (
    <NForm
      id="behavior-reward-form"
      schema={behaviorRewardSchema}
      defaultValues={defaultValues}
      onSubmit={handleSubmit}
    >
      <div className="space-y-5">
        <NFormSectionHeader icon={Star} title={t('behaviorRewards.form.behaviorSection')} />

        <FormStudentCombobox
          icon={UserRound}
          formLabel={t('behaviorRewards.form.student')}
          placeholder={t('behaviorRewards.form.studentPlaceholder')}
          searchPlaceholder={t('behaviorRewards.form.studentSearch')}
          emptyMessage={t('behaviorRewards.form.noStudents')}
          students={activeStudents}
          required
          disabled={isStudentsLoading}
        />

        {/* One row, even on a phone: the short labels keep the fields aligned, and the date gets the wider column. */}
        <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-3 md:grid-cols-2 md:gap-4 [&>*]:min-w-0">
          <FormInput
            name="behaviorDate"
            type="date"
            icon={CalendarClock}
            formLabel={t('behaviorRewards.form.date')}
            required
          />
          <FormInput
            name="behaviorTime"
            type="time"
            icon={CalendarClock}
            formLabel={t('behaviorRewards.form.time')}
            required
          />
        </div>

        <RewardSubjectField students={activeStudents} isNew={!behaviorReward?.id} />

        <FormInput
          name="category"
          type="select"
          icon={Star}
          formLabel={t('behaviorRewards.form.category')}
          placeholder={t('behaviorRewards.form.categoryPlaceholder')}
          items={buildBehaviorRewardCategoryOptions(t)}
          required
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormInput
            name="rewardType"
            type="select"
            icon={Gift}
            formLabel={t('behaviorRewards.form.rewardType')}
            placeholder={t('behaviorRewards.form.rewardTypePlaceholder')}
            items={buildBehaviorRewardTypeOptions(t)}
            required
          />
          <FormInput
            name="points"
            type="number"
            icon={Award}
            formLabel={t('behaviorRewards.form.points')}
            placeholder="0"
          />
        </div>

        <CertificatePlaceField />

        {/* FormInput's label takes text only, so the bank's button sits over the end of its row. */}
        <div className="relative">
          <FormInput
            name="description"
            type="textarea"
            icon={FileText}
            formLabel={t('behaviorRewards.form.description')}
            placeholder={t('behaviorRewards.form.descriptionPlaceholder')}
          />
          <RewardTemplateGenerateButton className="absolute end-0 top-0" />
        </div>
      </div>
    </NForm>
  );
};

export default BehaviorRewardForm;
