"use client";

import React, { useEffect, useState } from 'react';
import { Card } from 'najm-kit';
import { NSectionHeader } from 'najm-kit';
import { useTranslation } from '@/hooks/useLanguage';
import { Users, GraduationCap, BookOpen } from 'lucide-react';
import { getParentChildrenApi } from '@/services/parentApi';
import { Label } from 'najm-kit';
import InfoWidget from '@/features/Dashboard/components/Widgets/Widget';
import studentImage from '@/assets/images/studentImage.png';
import { Badge } from 'najm-kit';
import { NAvatar } from 'najm-kit';
import { getAvatarFallback, personAvatarClassNames } from '@/lib/avatar';
import PageLoadingState from '@/shared/PageLoadingState';

interface ChildrenTabProps {
  parentId: string;
}

const ChildrenTab: React.FC<ChildrenTabProps> = ({ parentId }) => {
  const { t } = useTranslation();
  const [children, setChildren] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChildren = async () => {
      try {
        setLoading(true);
        const data = await getParentChildrenApi(parentId);
        setChildren(data?.data || []);
      } catch {
      } finally {
        setLoading(false);
      }
    };

    if (parentId) {
      fetchChildren();
    }
  }, [parentId]);

  const calculateStats = () => {
    if (!children || children.length === 0) {
      return {
        totalChildren: 0,
        activeStudents: 0,
        graduatedStudents: 0,
      };
    }

    const activeStudents = children.filter((c) => c.status === 'active').length;
    const graduatedStudents = children.filter((c) => c.status === 'graduated').length;

    return {
      totalChildren: children.length,
      activeStudents,
      graduatedStudents,
    };
  };

  const stats = calculateStats();

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'inactive':
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
      case 'graduated':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'transferred':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
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
      {/* Children Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <InfoWidget
          title={t('parents.profile.totalChildren')}
          image={studentImage}
          value={stats.totalChildren}
        />
        <InfoWidget
          title={t('parents.profile.activeStudents')}
          image={studentImage}
          value={stats.activeStudents}
        />
        <InfoWidget
          title={t('parents.profile.graduatedStudents')}
          image={studentImage}
          value={stats.graduatedStudents}
        />
      </div>

      {/* Children List */}
      <Card className="overflow-hidden">
        <NSectionHeader
          icon={Users}
          iconColor="text-primary"
          showImage={false}
        >
          <NSectionHeader.Title>
            {t('parents.profile.linkedChildren')}
          </NSectionHeader.Title>
          <NSectionHeader.Subtitle>
            {t('parents.profile.viewAllChildren')}
          </NSectionHeader.Subtitle>
        </NSectionHeader>

        <div className="p-6">
          {children.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <Label className="text-muted-foreground">
                {t('parents.profile.noChildrenLinked')}
              </Label>
            </div>
          ) : (
            <div className="space-y-3">
              {children.map((child, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <NAvatar
                      src={child.image}
                      fallback={getAvatarFallback(child.name)}
                      size="md"
                      classNames={personAvatarClassNames}
                    />
                    <div className="flex-1">
                      <Label className="font-medium block">
                        {child.name || t('common.notSpecified')}
                      </Label>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        {child.studentCode && (
                          <>
                            <Label className="text-sm text-muted-foreground">
                              {child.studentCode}
                            </Label>
                            <span>•</span>
                          </>
                        )}
                        {child.class && (
                          <div className="flex items-center gap-1">
                            <GraduationCap className="w-3 h-3" />
                            <Label className="text-sm text-muted-foreground">
                              {child.class.name}
                            </Label>
                          </div>
                        )}
                        {child.section && (
                          <>
                            <span>•</span>
                            <div className="flex items-center gap-1">
                              <BookOpen className="w-3 h-3" />
                              <Label className="text-sm text-muted-foreground">
                                {child.section.name}
                              </Label>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <Badge className={getStatusBadgeColor(child.status)}>
                    {child.status
                      ? t(`students.status.${child.status}`)
                      : t('common.notSpecified')}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default ChildrenTab;
