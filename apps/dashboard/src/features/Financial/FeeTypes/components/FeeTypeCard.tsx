"use client";

import React from 'react';
import { DollarSign, Tag } from 'lucide-react';
import { NSectionInfo } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { Label } from 'najm-kit';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';

const FeeTypeCard = ({ data }: any) => {
  const { t } = useTranslation();
  const { majorMoney } = useSchoolFormat();
  const feeType = data;

  const categoryKey = `feeTypes.category.${feeType.category}`;
  const categoryLabel = t(categoryKey);

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
            value={categoryLabel === categoryKey ? feeType.category : categoryLabel}
            valueColor="text-primary"
          />

          <NSectionInfo
            icon={DollarSign}
            iconColor="text-muted-foreground"
            label={t('feeTypes.table.amount')}
            value={majorMoney(feeType.amount)}
            valueColor="text-green-600 font-bold"
          />
        </div>
      </div>
    </div>
  );
};

export default FeeTypeCard;
