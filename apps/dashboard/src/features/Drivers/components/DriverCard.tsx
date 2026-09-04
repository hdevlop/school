"use client";

import React from 'react';
import { Phone, Calendar, CreditCard, Shield } from 'lucide-react';
import { NAvatar } from 'najm-kit';
import { NSectionInfo } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { getAvatarFallback } from '@/lib/avatar';
import { Label } from 'najm-kit';

const DriverCard = ({ data }) => {
   const { t } = useTranslation();
   const driver = data;

   return (
      <div className="flex items-start gap-4 p-4">
         <div className="shrink-0">
            <NAvatar src={driver?.image} fallback={getAvatarFallback(driver.name)} size="lg" version={driver?.updatedAt} />
         </div>

         <div className="flex-1 flex flex-col gap-2">

            <div className='flex flex-col'>
               <Label className="text-md font-bold">
                  {driver.name}
               </Label>

               <Label className="text-sm font-medium text-primary">
                  {driver.licenseNumber}
               </Label>
            </div>

            <div className="space-y-2">

               <NSectionInfo
                  icon={Phone}
                  iconColor="text-muted-foreground"
                  label={t('drivers.table.phone')}
                  value={driver.phone}
               />

               <NSectionInfo
                  icon={CreditCard}
                  iconColor="text-muted-foreground"
                  label={t('drivers.table.licenseType')}
                  value={driver.licenseType}
               />

               <NSectionInfo
                  icon={Shield}
                  iconColor="text-muted-foreground"
                  label={t('drivers.table.licenseExpiry')}
                  value={new Date(driver.licenseExpiry).toLocaleDateString()}
               />

               <NSectionInfo
                  icon={Calendar}
                  iconColor="text-muted-foreground"
                  label={t('drivers.table.hireDate')}
                  value={new Date(driver.hireDate).toLocaleDateString()}
               />



            </div>
         </div>
      </div>
   );
};

export default DriverCard;
