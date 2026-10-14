"use client";

import React from 'react';
import { Phone, GraduationCap, Mail } from 'lucide-react';
import { NAvatar, NBadge } from 'najm-kit';
import { NCardInfo } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { Label } from 'najm-kit';
import { useRouter } from 'next/navigation';
import { useClasses } from '@/features/Classes/hooks/useClasses';
import { useViewingAcademicYear } from '@/features/AcademicYears/hooks/useViewingAcademicYear';

const TeacherCard = ({ data }) => {
   const { t } = useTranslation();
   const router = useRouter();
   const teacher = data;
   const openTeacher = () => router.push(`/teachers/${teacher.id}`);

   const { viewingYear } = useViewingAcademicYear();
   const { classes = [] } = useClasses({ enabled: !!viewingYear });

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
      <div
         role="link"
         tabIndex={0}
         aria-label={teacher.name}
         onClick={openTeacher}
         onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
               event.preventDefault();
               openTeacher();
            }
         }}
         className="flex cursor-pointer items-start gap-4 p-4 transition-all hover:bg-primary/[0.035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
      >
         <div className="shrink-0">
            <NAvatar src={teacher?.image} fallback={teacher.name} size="lg" version={teacher?.updatedAt} />
         </div>

         {/* min-w-0 lets a long name or email shrink to the card instead of
             widening the row and pushing the avatar out of view. */}
         <div className="flex min-w-0 flex-1 flex-col gap-2">

            <div className='flex min-w-0 flex-col gap-1'>
               <Label className="text-md block truncate font-bold">
                  {teacher.name}
               </Label>

               {teacher.specialization && (
                  <NBadge className="rounded-full bg-primary/10 text-primary ring-1 ring-inset ring-primary/20">
                     {teacher.specialization}
                  </NBadge>
               )}
            </div>

            <div className="space-y-2">

               {/* NCardInfo truncates to the card width, so a long email
                   ends in an ellipsis instead of running under the border. */}
               <NCardInfo
                  icon={Phone}
                  label={t('teachers.table.phone')}
                  value={teacher.phone}
               />

               <NCardInfo
                  icon={Mail}
                  label={t('teachers.table.email')}
                  value={teacher.email}
               />

               <NCardInfo
                  icon={GraduationCap}
                  label={t('teachers.table.classes')}
                  value={getAllClasses()}
                  iconClassName="text-primary"
                  valueClassName="text-primary"
               />
            </div>
         </div>
      </div>
   );
};

export default TeacherCard;
