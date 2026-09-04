"use client";

import React from 'react';
import { User, GraduationCap, BookOpen } from 'lucide-react';
import { NAvatar } from 'najm-kit';
import { NSectionInfo } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { getAvatarFallback, studentAvatarClassNames } from '@/lib/avatar';
import { Label } from 'najm-kit';



const StudentCard = ({ data }) => {
  const { t } = useTranslation();
  const student = data;
  
  const getGenderDisplay = (gender: 'M' | 'F') =>
    gender === 'M' ? t('common.male') : t('common.female');

  return (
    <div className="flex items-start gap-4 p-4">
      <div className="shrink-0">
        <NAvatar
          src={student?.image}
          fallback={getAvatarFallback(student.name)}
          size="lg"
          version={student?.updatedAt}
          classNames={studentAvatarClassNames}
        />
      </div>

      <div className="flex-1 flex flex-col gap-2">
        <Label className="text-md font-bold">
          {student.name}
        </Label>

        <div className="space-y-2">
          <NSectionInfo
            icon={User}
            iconColor="text-muted-foreground"
            label={t('students.table.gender')}
            value={getGenderDisplay(student.gender)}
          />

          <NSectionInfo
            icon={GraduationCap}
            iconColor="text-primary"
            label={t('students.table.class')}
            value={student.class.name}
            valueColor="text-primary"
          />

          <NSectionInfo
            icon={BookOpen}
            iconColor="text-primary"
            label={t('students.table.section')}
            value={student.section.name}
            valueColor="text-primary"
          />
        </div>
      </div>
    </div>
  );
};

export default StudentCard;
