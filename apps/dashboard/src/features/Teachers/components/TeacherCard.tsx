"use client";

import React from 'react';
import { Phone, GraduationCap, Mail } from 'lucide-react';
import { NAvatar } from 'najm-kit';
import { NSectionInfo } from 'najm-kit';
import { useTranslation } from '@/hooks/useLanguage';
import { getAvatarFallback, personAvatarClassNames } from '@/lib/avatar';
import { Label } from 'najm-kit';
import { useClasses } from '@/features/Classes/hooks/useClasses';

const TeacherCard = ({ data }) => {
   const { t } = useTranslation();
   const teacher = data;

   // Fetch classes and subjects from cache
   const { classes = [] } = useClasses();

   const getClassName = (classId) => {
      const classItem = classes.find(c => c.id === classId);
      return classItem?.name || classId;
   };

   const getAllClasses = () => {
      if (!teacher.assignments || teacher.assignments.length === 0) return '-';
      const classIds = teacher.assignments.map(a => a.classId);
      const uniqueClassIds = [...new Set(classIds)];
      return uniqueClassIds.map(id => getClassName(id)).join(', ');
   };

   return (
      <div className="flex items-start gap-4 p-4">
         <div className="shrink-0">
            <NAvatar src={teacher?.image} fallback={getAvatarFallback(teacher.name)} size="lg" version={teacher?.updatedAt} classNames={personAvatarClassNames} />
         </div>

         <div className="flex-1 flex flex-col gap-2">

            <div className='flex flex-col gap-1'>
               <Label className="text-md font-bold">
                  {teacher.name}
               </Label>

               {teacher.specialization && (
                  <span className="inline-flex w-fit items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary ring-1 ring-inset ring-primary/20">
                     {teacher.specialization}
                  </span>
               )}
            </div>

            <div className="space-y-2">

               <NSectionInfo
                  icon={Phone}
                  iconColor="text-muted-foreground"
                  label={t('teachers.table.phone')}
                  value={teacher.phone}
               />

               <NSectionInfo
                  icon={Mail}
                  iconColor="text-muted-foreground"
                  label={t('teachers.table.email')}
                  value={teacher.email}
                  maxChars={22}
               />

               <NSectionInfo
                  icon={GraduationCap}
                  iconColor="text-primary"
                  label={t('teachers.table.classes')}
                  value={getAllClasses()}
                  valueColor="text-primary"
               />


            </div>
         </div>
      </div>
   );
};

export default TeacherCard;
