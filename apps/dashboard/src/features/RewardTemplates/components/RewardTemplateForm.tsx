'use client';

import { useMemo } from 'react';
import { Award, FileText, Gift, Star, ToggleRight, Type } from 'lucide-react';
import { FormInput, NForm, NFormSectionHeader } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { useDialog } from '@/shared/useDialog';
import {
  buildBehaviorRewardCategoryOptions,
  buildBehaviorRewardTypeOptions,
} from '@/features/BehaviorRewards/config/behaviorRewardOptions';
import { createRewardTemplateSchema } from '../config/rewardTemplateSchemas';
import type { RewardTemplate } from '../config/rewardTemplateMatch';

const RewardTemplateForm = ({ template = null }: { template?: RewardTemplate | null }) => {
  const { t } = useTranslation();
  const schema = useMemo(() => createRewardTemplateSchema(t), [t]);
  const { pop } = useDialog();

  const defaultValues = {
    title: template?.title ?? '',
    category: template?.category ?? 'academic_effort',
    rewardType: template?.rewardType ?? 'verbal_praise',
    points: template?.points ?? 0,
    description: template?.description ?? '',
    active: template?.active ?? true,
  };

  return (
    <NForm
      id="reward-template-form"
      schema={schema}
      defaultValues={defaultValues}
      onSubmit={(data) => { void pop({ ...data, points: Number(data.points || 0) }); }}
    >
      <div className="space-y-5">
        <NFormSectionHeader icon={Star} title={t('rewardTemplates.form.section')} />

        <FormInput
          name="title"
          type="text"
          icon={Type}
          formLabel={t('rewardTemplates.form.title')}
          placeholder={t('rewardTemplates.form.titlePlaceholder')}
          required
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormInput
            name="category"
            type="select"
            icon={Star}
            formLabel={t('behaviorRewards.form.category')}
            placeholder={t('behaviorRewards.form.categoryPlaceholder')}
            items={buildBehaviorRewardCategoryOptions(t)}
            required
          />
          <FormInput
            name="rewardType"
            type="select"
            icon={Gift}
            formLabel={t('behaviorRewards.form.rewardType')}
            placeholder={t('behaviorRewards.form.rewardTypePlaceholder')}
            items={buildBehaviorRewardTypeOptions(t)}
            required
          />
        </div>

        <FormInput
          name="points"
          type="number"
          icon={Award}
          formLabel={t('behaviorRewards.form.points')}
          placeholder="0"
        />

        <FormInput
          name="description"
          type="textarea"
          icon={FileText}
          formLabel={t('behaviorRewards.form.description')}
          placeholder={t('rewardTemplates.form.descriptionPlaceholder')}
        />

        <FormInput name="active" type="switch" icon={ToggleRight} formLabel={t('rewardTemplates.form.active')} />
      </div>
    </NForm>
  );
};

export default RewardTemplateForm;
