import React from 'react';
import { Mars, Venus } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { getGenderColor } from './genderColors';

const CenterIcons = () => {
   return (
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center ">
         <Mars
            className=' w-10 h-10 '
            style={{ color: getGenderColor('Male') }}
         />

         <Venus
            className=' w-10 h-10 '
            style={{ color: getGenderColor('Female') }}
         />
      </div>
   );
};

interface DonutChartProps {
   data: Array<{ gender?: string; name: string; value: number }>;
}

// Donut Chart Component
export const DonutChart: React.FC<DonutChartProps> = ({ data }) => {
   return (
      <div className="flex relative justify-center" style={{ height: 250 }}>
         <ResponsiveContainer width="100%" height={250}>
            <PieChart>
               <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius="50%"
                  outerRadius="78%"
                  paddingAngle={2}
                  dataKey="value"
                  startAngle={90}
                  endAngle={450}
                  stroke="var(--card)"
                  strokeWidth={3}
               >
                  {data.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={getGenderColor(entry.gender ?? entry.name)} />
                  ))}
               </Pie>
            </PieChart>
         </ResponsiveContainer>

         <CenterIcons />
      </div>
   );
};
