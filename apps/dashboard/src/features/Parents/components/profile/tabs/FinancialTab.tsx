"use client";

import React, { useEffect, useState } from 'react';
import { Card } from 'najm-kit';
import { NSectionHeader } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { DollarSign, Users, Calendar } from 'lucide-react';
import { getParentChildrenApi } from '@/services/parentApi';
import { getFeesByStudentApi } from '@/services/feeApi';
import { Label } from 'najm-kit';
import InfoWidget from '@/features/Dashboard/components/Widgets/Widget';
import feesImage from '@/assets/images/feesImage.png';
import { Badge } from 'najm-kit';
import PageLoadingState from '@/shared/PageLoadingState';

interface FinancialTabProps {
  parentId: string;
}

const FinancialTab: React.FC<FinancialTabProps> = ({ parentId }) => {
  const { t } = useTranslation();
  const [children, setChildren] = useState<any[]>([]);
  const [childrenFees, setChildrenFees] = useState<{[key: string]: any[]}>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFinancialData = async () => {
      try {
        setLoading(true);
        const childrenData = await getParentChildrenApi(parentId);
        const childrenList = childrenData?.data || [];
        setChildren(childrenList);

        // Fetch fees for each child
        const feesPromises = childrenList.map(async (child: any) => {
          try {
            const feesData = await getFeesByStudentApi(child.id);
            return { studentId: child.id, fees: feesData?.data || [] };
          } catch {
             return { studentId: child.id, fees: [] };
           }
        });

        const allFees = await Promise.all(feesPromises);
        const feesMap: {[key: string]: any[]} = {};
        allFees.forEach(({ studentId, fees }) => {
          feesMap[studentId] = fees;
        });
        setChildrenFees(feesMap);
      } catch {
      
      } finally {
        setLoading(false);
      }
    };

    if (parentId) {
      fetchFinancialData();
    }
  }, [parentId]);

  const calculateFinancialStats = () => {
    let totalFees = 0;
    let paidFees = 0;
    let pendingFees = 0;
    let overdueFees = 0;

    Object.values(childrenFees).forEach((fees) => {
      fees.forEach((fee) => {
        const amount = parseFloat(fee.amount) || 0;
        totalFees += amount;

        if (fee.paymentStatus === 'paid') {
          paidFees += amount;
        } else if (fee.paymentStatus === 'pending') {
          pendingFees += amount;
        } else if (fee.paymentStatus === 'overdue') {
          overdueFees += amount;
        }
      });
    });

    return {
      totalFees: totalFees.toFixed(2),
      paidFees: paidFees.toFixed(2),
      pendingFees: pendingFees.toFixed(2),
      overdueFees: overdueFees.toFixed(2),
    };
  };

  const stats = calculateFinancialStats();

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'overdue':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  if (loading) {
    return (
      <PageLoadingState label={`${t('common.loading')}...`} className="min-h-64" />
    );
  }

  return (
    <div className="space-y-6">
      {/* Financial Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <InfoWidget
          title={t('parents.profile.totalFees')}
          image={feesImage}
          value={`$${stats.totalFees}`}
        />
        <InfoWidget
          title={t('parents.profile.paidFees')}
          image={feesImage}
          value={`$${stats.paidFees}`}
        />
        <InfoWidget
          title={t('parents.profile.pendingFees')}
          image={feesImage}
          value={`$${stats.pendingFees}`}
        />
        <InfoWidget
          title={t('parents.profile.overdueFees')}
          image={feesImage}
          value={`$${stats.overdueFees}`}
        />
      </div>

      {/* Fees by Child */}
      <Card className="overflow-hidden">
        <NSectionHeader
          icon={DollarSign}
          iconColor="text-primary"
          showImage={false}
        >
          <NSectionHeader.Title>
            {t('parents.profile.feesByChild')}
          </NSectionHeader.Title>
          <NSectionHeader.Subtitle>
            {t('parents.profile.viewAllFees')}
          </NSectionHeader.Subtitle>
        </NSectionHeader>

        <div className="p-6">
          {children.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <Label className="text-muted-foreground">
                {t('parents.profile.noChildrenLinked')}
              </Label>
            </div>
          ) : (
            <div className="space-y-6">
              {children.map((child) => {
                const fees = childrenFees[child.id] || [];
                const childTotal = fees.reduce((sum, fee) => sum + (parseFloat(fee.amount) || 0), 0);

                return (
                  <div key={child.id} className="space-y-3">
                    {/* Child Header */}
                    <div className="flex items-center justify-between pb-2 border-b">
                      <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-primary" />
                        <Label className="text-lg font-semibold">
                          {child.name}
                        </Label>
                      </div>
                      <Label className="text-sm text-muted-foreground">
                        {t('parents.profile.totalFees')}: ${childTotal.toFixed(2)}
                      </Label>
                    </div>

                    {/* Child Fees */}
                    {fees.length === 0 ? (
                      <div className="text-center py-4 bg-muted rounded-lg">
                        <Label className="text-sm text-muted-foreground">
                          {t('parents.profile.noFeesForChild')}
                        </Label>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {fees.map((fee, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                          >
                            <div className="flex-1">
                              <Label className="font-medium block">
                                {fee.feeType?.name || t('common.notSpecified')}
                              </Label>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Calendar className="w-3 h-3" />
                                <Label className="text-sm text-muted-foreground">
                                  {t('fees.form.dueDate')}:{' '}
                                  {fee.dueDate
                                    ? new Date(fee.dueDate).toLocaleDateString()
                                    : t('common.notSpecified')}
                                </Label>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <Label className="text-lg font-bold text-primary">
                                ${parseFloat(fee.amount || 0).toFixed(2)}
                              </Label>
                              <Badge className={getStatusBadgeColor(fee.paymentStatus)}>
                                {t(`fees.paymentStatus.${fee.paymentStatus}`)}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default FinancialTab;
