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
import { CHART_AXIS_TICK_SMALL, CHART_GRID_STROKE, CHART_TOOLTIP_CLASS } from '@/shared/chartTheme';
import { NCard } from 'najm-kit';
import { BarChart2 } from 'lucide-react';
import { NSkeletonChart } from 'najm-kit';
import { useFinanceCollectionByClass } from '@/features/Dashboard/hooks/useDashboardHooks';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';
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

const CustomTooltip = ({ active, payload, majorMoney, t }: any) => {
  if (active && payload?.length) {
    const d = payload[0].payload as ClassRow;
    return (
      <div className={`${CHART_TOOLTIP_CLASS} text-sm space-y-1`}>
        <p className="font-semibold text-foreground">{d.className}</p>
        <p className="text-muted-foreground">{t('reports.collection.due')} : <span className="font-medium">{majorMoney(d.due)}</span></p>
        <p className="text-muted-foreground">{t('reports.collection.paid')} : <span className="font-medium text-green-600">{majorMoney(d.paid)}</span></p>
        <p className="text-muted-foreground">{t('reports.collection.rate')} : <span className="font-medium" style={{ color: rateColor(d.rate) }}>{d.rate.toFixed(1)}%</span></p>
        <p className="text-muted-foreground">{t('reports.collection.students', { count: d.studentCount })}</p>
      </div>
    );
  }
  return null;
};

const CollectionByClassChart: React.FC<Props> = ({ academicYear, className = '' }) => {
  const { t } = useTranslation();
  const { majorMoney } = useSchoolFormat();
  const { data, isLoading, error, refetch } = useFinanceCollectionByClass(academicYear);

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
      error={error}
      errorText={t('common.feedback.errorMessage')}
      onRetry={() => refetch()}
      skeleton={<NSkeletonChart />}
      noData={!isLoading && !error && rows.length === 0}
      noDataText={t('reports.collection.noData')}
    >
      <div className="flex flex-col h-full gap-3">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="0" stroke={CHART_GRID_STROKE} vertical={false} />
            <XAxis
              dataKey="className"
              axisLine={false}
              tickLine={false}
              tick={CHART_AXIS_TICK_SMALL}
              dy={6}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={CHART_AXIS_TICK_SMALL}
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
              dx={-4}
            />
            <Tooltip content={<CustomTooltip majorMoney={majorMoney} t={t} />} />
            <Bar isAnimationActive={false} dataKey="rate" radius={[4, 4, 0, 0]} maxBarSize={48}>
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
                <th className="text-right py-1 font-medium">{t('reports.collection.studentsColumn')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.classId ?? r.className} className="border-b border-border/40 hover:bg-muted/30">
                  <td className="py-1 font-medium">{r.className}</td>
                  <td className="py-1 text-right tabular-nums">{majorMoney(r.due)}</td>
                  <td className="py-1 text-right tabular-nums text-green-600">{majorMoney(r.paid)}</td>
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
