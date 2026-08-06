import { Card } from 'najm-kit';
import { Label } from 'najm-kit';
import Image from 'next/image';
import React from 'react';

export type InfoWidgetProps = {
   title: string,
   image: string | any,
   value: string | number | any
}

const InfoWidget: React.FC<InfoWidgetProps> = ({ title, image, value = 0 }) => {
   return (
      <Card className='flex flex-row p-4 gap-4 w-full items-center justify-between border-foreground'>
         <Image
            src={image}
            alt={title}

            className='w-12 h-12 object-contain'
         />

         <div className='flex flex-col items-center  gap-1'>
            <Label className='text-sm items-center font-semibold text-center text-muted-foreground'>{title}</Label>
            <Label className=' text-xl font-semibold'>{value}</Label>
         </div>
      </Card>
   )
}

export default InfoWidget