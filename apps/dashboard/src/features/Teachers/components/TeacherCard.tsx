"use client";

import React from 'react';
import { Phone, GraduationCap, Mail } from 'lucide-react';
import { NAvatar, NBadge } from 'najm-kit';
import { NSectionInfo } from 'najm-kit';
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

         <div className="flex-1 flex flex-col gap-2">

            <div className='flex flex-col gap-1'>
               <Label className="text-md font-bold">
                  {teacher.name}
               </Label>

               {teacher.specialization && (
                  <NBadge className="rounded-full bg-primary/10 text-primary ring-1 ring-inset ring-primary/20">
                     {teacher.specialization}
                  </NBadge>
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
