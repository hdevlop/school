"use client";

import React from 'react';
import { Card } from 'najm-kit';
import { NAvatar } from 'najm-kit';
import { Label } from 'najm-kit';
import { Badge } from 'najm-kit';
import { getAvatarFallback, personAvatarClassNames } from '@/lib/avatar';
import InfoWidget from '@/features/Dashboard/components/Widgets/Widget';
import { useTranslation } from 'najm-i18n/react';
import { User, Users, Briefcase, Calendar } from 'lucide-react';
import parentsImage from '@/assets/images/parentsImage.png';

interface ProfileSidebarProps {
  parent: any;
  analytics?: {
    totalChildren?: number;
    linkedStudents?: number;
  };
}

const ProfileSidebar: React.FC<ProfileSidebarProps> = ({ parent, analytics }) => {
  const { t } = useTranslation();

  const relationshipLabels = {
    father: t('parents.relationships.father'),
    mother: t('parents.relationships.mother'),
    guardian: t('parents.relationships.guardian'),
    stepparent: t('parents.relationships.stepparent'),
    grandparent: t('parents.relationships.grandparent'),
    other: t('parents.relationships.other'),
  };

  const relationshipDisplay = relationshipLabels[parent?.relationshipType] || parent?.relationshipType || t('common.notSpecified');

  const getRelationshipColor = (type: string) => {
    switch (type) {
      case 'father':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'mother':
        return 'bg-pink-500/10 text-pink-500 border-pink-500/20';
      case 'guardian':
        return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'stepparent':
        return 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20';
      case 'grandparent':
        return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  return (
    <div className="space-y-4">
      {/* Profile Card */}
      <Card className="p-6">
        <div className="flex flex-col items-center text-center space-y-4">
          {/* Avatar */}
          <NAvatar
            src={parent?.image}
            fallback={getAvatarFallback(parent?.name)}
            size="xl"
            classNames={personAvatarClassNames}
          />

          {/* Name & CIN */}
          <div className="space-y-1">
            <Label className="text-2xl font-bold block">
              {parent?.name}
            </Label>
            {parent?.cin && (
              <Label className="text-sm text-muted-foreground block">
                {t('parents.form.cin')}: {parent.cin}
              </Label>
            )}
          </div>

          {/* Relationship Badge */}
          <Badge className={getRelationshipColor(parent?.relationshipType)}>
            {relationshipDisplay}
          </Badge>

          {/* Role */}
          <div className="flex items-center gap-2 text-sm">
            <User className="w-4 h-4 text-muted-foreground" />
            <Label className="text-muted-foreground">
              {t('common.parent')}
            </Label>
          </div>
        </div>
      </Card>

      {/* Quick Stats */}
      <Card className="p-4">
        <Label className="text-lg font-semibold mb-4 block">
          {t('parents.profile.quickStats')}
        </Label>

        <div className="space-y-3">
          {/* Occupation */}
          {parent?.occupation && (
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <Briefcase className="w-5 h-5 text-primary" />
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground block">
                  {t('parents.table.occupation')}
                </Label>
                <Label className="text-sm font-semibold">
                  {parent.occupation}
                </Label>
              </div>
            </div>
          )}

          {/* Relationship Type */}
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <Users className="w-5 h-5 text-primary" />
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground block">
                {t('parents.table.relationship')}
              </Label>
              <Label className="text-sm font-semibold">
                {relationshipDisplay}
              </Label>
            </div>
          </div>

          {/* Date of Birth */}
          {parent?.dateOfBirth && (
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <Calendar className="w-5 h-5 text-primary" />
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground block">
                  {t('parents.form.dateOfBirth')}
                </Label>
                <Label className="text-sm font-semibold">
                  {new Date(parent.dateOfBirth).toLocaleDateString()}
                </Label>
              </div>
            </div>
          )}

          {/* Financial Responsibility */}
          {parent?.financialResponsibility && (
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <Briefcase className="w-5 h-5 text-primary" />
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground block">
                  {t('parents.profile.financialResponsibility')}
                </Label>
                <Label className="text-sm font-semibold">
                  {t('common.yes')}
                </Label>
              </div>
            </div>
          )}

          {/* Emergency Contact */}
          {parent?.isEmergencyContact && (
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <Users className="w-5 h-5 text-primary" />
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground block">
                  {t('parents.profile.emergencyContact')}
                </Label>
                <Label className="text-sm font-semibold">
                  {t('common.yes')}
                </Label>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Analytics Widgets */}
      {analytics && (
        <div className="space-y-3">
          {analytics.totalChildren !== undefined && (
            <InfoWidget
              title={t('parents.profile.totalChildren')}
              image={parentsImage}
              value={analytics.totalChildren}
            />
          )}

          {analytics.linkedStudents !== undefined && (
            <InfoWidget
              title={t('parents.profile.linkedStudents')}
              image={parentsImage}
              value={analytics.linkedStudents}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default ProfileSidebar;
