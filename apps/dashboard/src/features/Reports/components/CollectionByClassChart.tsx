'use client';

import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { NCard } from 'najm-kit';
import { BarChart2 } from 'lucide-react';
import { NSkeletonChart } from 'najm-kit';
import { useFinanceCollectionByClass } from '@/features/Dashboard/hooks/useDashboardHooks';
import { formatMAD, type SupportedLocale } from '@/lib/format';
import { useTranslation } from 'najm-i18n/react';

type ClassRow = {
  classId: string | null;
  className: string;
  due: number;
  paid: number;
  rate: number;
  studentCount: number;
};

interface Props {
  academicYear?: string;
  className?: string;
}

const rateColor = (rate: number) => {
  if (rate >= 90) return '#10b981';
  if (rate >= 70) return '#f59e0b';
  return '#ef4444';
};

const CustomTooltip = ({ active, payload, locale, t }: any) => {
  if (active && payload?.length) {
    const d = payload[0].payload as ClassRow;
    return (
      <div className="bg-white px-3 py-2 rounded shadow border border-gray-200 text-sm space-y-1">
        <p className="font-semibold text-gray-800">{d.className}</p>
        <p className="text-gray-600">{t('reports.collection.due')} : <span className="font-medium">{formatMAD(d.due, locale)}</span></p>
        <p className="text-gray-600">{t('reports.collection.paid')} : <span className="font-medium text-green-600">{formatMAD(d.paid, locale)}</span></p>
        <p className="text-gray-600">{t('reports.collection.rate')} : <span className="font-medium" style={{ color: rateColor(d.rate) }}>{d.rate.toFixed(1)}%</span></p>
        <p className="text-gray-400">{t('reports.collection.students', { count: d.studentCount })}</p>
      </div>
    );
  }
  return null;
};

const CollectionByClassChart: React.FC<Props> = ({ academicYear, className = '' }) => {
  const { t, language } = useTranslation();
  const locale = (language as SupportedLocale) ?? 'en';
  const { data, isLoading } = useFinanceCollectionByClass(academicYear);

  const rows: ClassRow[] = useMemo(() => Array.isArray(data) ? data : [], [data]);

  const chartData = useMemo(
    () => rows.map((r) => ({ ...r, rate: Number(r.rate.toFixed(1)) })),
    [rows],
  );

  return (
    <NCard
      title={t('reports.collection.title')}
      icon={BarChart2}
      className={`flex w-full h-full ${className}`}
      loading={isLoading}
      skeleton={<NSkeletonChart />}
      noData={!isLoading && rows.length === 0}
      noDataText={t('reports.collection.noData')}
    >
      <div className="flex flex-col h-full gap-3">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="0" stroke="#f0f0f0" vertical={false} />
            <XAxis
              dataKey="className"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#6b7280', fontSize: 11 }}
              dy={6}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#6b7280', fontSize: 11 }}
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
              dx={-4}
            />
            <Tooltip content={<CustomTooltip locale={locale} t={t} />} />
            <Bar dataKey="rate" radius={[4, 4, 0, 0]} maxBarSize={48}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={rateColor(entry.rate)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Table */}
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="text-left py-1 font-medium">{t('reports.collection.class')}</th>
                <th className="text-right py-1 font-medium">{t('reports.collection.due')}</th>
                <th className="text-right py-1 font-medium">{t('reports.collection.paid')}</th>
                <th className="text-right py-1 font-medium">{t('reports.collection.rate')}</th>
                <th className="text-right py-1 font-medium">{t('students.title')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.classId ?? r.className} className="border-b border-border/40 hover:bg-muted/30">
                  <td className="py-1 font-medium">{r.className}</td>
                  <td className="py-1 text-right tabular-nums">{formatMAD(r.due, locale)}</td>
                  <td className="py-1 text-right tabular-nums text-green-600">{formatMAD(r.paid, locale)}</td>
                  <td className="py-1 text-right tabular-nums font-semibold" style={{ color: rateColor(r.rate) }}>
                    {r.rate.toFixed(1)}%
                  </td>
                  <td className="py-1 text-right text-muted-foreground">{r.studentCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </NCard>
  );
};

export default CollectionByClassChart;
