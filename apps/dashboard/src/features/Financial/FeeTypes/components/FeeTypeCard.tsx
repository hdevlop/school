"use client";

import React from 'react';
import { DollarSign, Tag } from 'lucide-react';
import { NSectionInfo } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { Label } from 'najm-kit';
import { usePublicSettings } from '@/features/Settings/hooks/useSettings';

const FeeTypeCard = ({ data }: any) => {
  const { t } = useTranslation();
  const { publicSettings } = usePublicSettings();
  const currency = publicSettings?.currency || 'USD';
  const feeType = data;

  const categoryMap: Record<string, string> = {
    'tuition': t('feeTypes.category.tuition'),
    'registration': t('feeTypes.category.registration'),
    'books': t('feeTypes.category.books'),
    'transport': t('feeTypes.category.transport'),
    'activities': t('feeTypes.category.activities'),
    'lunch': t('feeTypes.category.lunch'),
    'exam': t('feeTypes.category.exam'),
    'uniform': t('feeTypes.category.uniform'),
    'other': t('feeTypes.category.other'),
  };

  return (
    <div className="flex items-start gap-4 p-4">
      <div className="shrink-0">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center dark:bg-primary">
          <DollarSign className="w-6 h-6 text-primary dark:text-white" />
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-2">
        <Label className="text-md font-bold">
          {feeType.name}
        </Label>

        <div className="space-y-2">
          <NSectionInfo
            icon={Tag}
            iconColor="text-primary"
            label={t('feeTypes.table.category')}
            value={categoryMap[feeType.category] || feeType.category}
            valueColor="text-primary"
          />

          <NSectionInfo
            icon={DollarSign}
            iconColor="text-muted-foreground"
            label={t('feeTypes.table.amount')}
            value={`${Number(feeType.amount).toFixed(2)} ${currency}`}
            valueColor="text-green-600 font-bold"
          />
        </div>
      </div>
    </div>
  );
};

export default FeeTypeCard;