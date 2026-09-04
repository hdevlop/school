'use client';

import { Award, CalendarClock, FileText, Gift, Star, Trophy, UserRound } from 'lucide-react';
import { FormInput, NForm, NFormSectionHeader, useDialog } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { behaviorRewardSchema } from '@/lib/validations';
import { useStudents } from '@/features/Students/hooks/useStudents';
import {
  BEHAVIOR_RECOGNITION_LEVELS,
  BEHAVIOR_REWARD_CATEGORIES,
  BEHAVIOR_REWARD_TYPES,
  toLocalDateTimeInput,
} from '../behaviorRewardConstants';

const BehaviorRewardForm = ({ behaviorReward = null }: { behaviorReward?: any }) => {
  const { t } = useTranslation();
  const { pop } = useDialog();
  const { students, isStudentsLoading } = useStudents();

  const studentOptions = (students || [])
    .filter((student) => student.status === 'active')
    .map((student) => ({
      value: student.id,
      label: `${student.name} · ${student.studentCode}`,
    }));

  const defaultValues = {
    studentId: behaviorReward?.studentId || '',
    behaviorDate: toLocalDateTimeInput(behaviorReward?.behaviorAt).slice(0, 10),
    behaviorTime: toLocalDateTimeInput(behaviorReward?.behaviorAt).slice(11, 16),
    category: behaviorReward?.category || 'academic_effort',
    recognitionLevel: behaviorReward?.recognitionLevel || 'appreciation',
    description: behaviorReward?.description || '',
    rewardType: behaviorReward?.rewardType || 'verbal_praise',
    points: behaviorReward?.points ?? 0,
    rewardNote: behaviorReward?.rewardNote || '',
  };

  const handleSubmit = async (formData) => {
    const { behaviorDate, behaviorTime, ...payload } = formData;
    pop({
      ...payload,
      behaviorAt: new Date(`${behaviorDate}T${behaviorTime}`).toISOString(),
      points: Number(formData.points || 0),
      rewardNote: formData.rewardNote || null,
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

        <FormInput
          name="studentId"
          type="combobox"
          icon={UserRound}
          formLabel={t('behaviorRewards.form.student')}
          placeholder={t('behaviorRewards.form.studentPlaceholder')}
          searchPlaceholder={t('behaviorRewards.form.studentSearch')}
          emptyMessage={t('behaviorRewards.form.noStudents')}
          items={studentOptions}
          required
          disabled={isStudentsLoading}
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormInput
            name="behaviorDate"
            type="date"
            icon={CalendarClock}
            formLabel={t('behaviorRewards.form.behaviorDate')}
            required
          />
          <FormInput
            name="behaviorTime"
            type="time"
            icon={CalendarClock}
            formLabel={t('behaviorRewards.form.behaviorTime')}
            required
          />
          <FormInput
            name="category"
            type="select"
            icon={Star}
            formLabel={t('behaviorRewards.form.category')}
            placeholder={t('behaviorRewards.form.categoryPlaceholder')}
            items={BEHAVIOR_REWARD_CATEGORIES.map((value) => ({ value, label: t(`behaviorRewards.categories.${value}`) }))}
            required
          />
          <FormInput
            name="recognitionLevel"
            type="select"
            icon={Trophy}
            formLabel={t('behaviorRewards.form.recognitionLevel')}
            placeholder={t('behaviorRewards.form.recognitionLevelPlaceholder')}
            items={BEHAVIOR_RECOGNITION_LEVELS.map((value) => ({ value, label: t(`behaviorRewards.recognitionLevels.${value}`) }))}
            required
          />
        </div>

        <FormInput
          name="description"
          type="textarea"
          icon={FileText}
          formLabel={t('behaviorRewards.form.description')}
          placeholder={t('behaviorRewards.form.descriptionPlaceholder')}
          required
        />

        <NFormSectionHeader icon={Award} title={t('behaviorRewards.form.rewardSection')} />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormInput
            name="rewardType"
            type="select"
            icon={Gift}
            formLabel={t('behaviorRewards.form.rewardType')}
            placeholder={t('behaviorRewards.form.rewardTypePlaceholder')}
            items={BEHAVIOR_REWARD_TYPES.map((value) => ({ value, label: t(`behaviorRewards.rewardTypes.${value}`) }))}
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

        <FormInput
          name="rewardNote"
          type="textarea"
          icon={FileText}
          formLabel={t('behaviorRewards.form.rewardNote')}
          placeholder={t('behaviorRewards.form.rewardNotePlaceholder')}
        />
      </div>
    </NForm>
  );
};

export default BehaviorRewardForm;
