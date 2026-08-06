"use client";

import React from 'react';
import { Card } from 'najm-kit';
import { NSectionHeader, NSectionInfo } from 'najm-kit';
import { useTranslation } from '@/hooks/useLanguage';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Hash,
  Briefcase,
  Users,
} from 'lucide-react';

interface PersonalDetailsTabProps {
  parent: any;
}

const PersonalDetailsTab: React.FC<PersonalDetailsTabProps> = ({ parent }) => {
  const { t } = useTranslation();

  const genderDisplay =
    parent?.gender === 'M'
      ? t('common.male')
      : parent?.gender === 'F'
      ? t('common.female')
      : parent?.gender || t('common.notSpecified');

  const relationshipLabels = {
    father: t('parents.relationships.father'),
    mother: t('parents.relationships.mother'),
    guardian: t('parents.relationships.guardian'),
    stepparent: t('parents.relationships.stepparent'),
    grandparent: t('parents.relationships.grandparent'),
    other: t('parents.relationships.other'),
  };

  const relationshipDisplay = relationshipLabels[parent?.relationshipType] || parent?.relationshipType || t('common.notSpecified');

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <Card className="overflow-hidden">
        <NSectionHeader
          icon={User}
          iconColor="text-primary"
          showImage={false}
        >
          <NSectionHeader.Title>
            {t('parents.profile.basicInfo')}
          </NSectionHeader.Title>
          <NSectionHeader.Subtitle>
            {t('parents.profile.personalInformation')}
          </NSectionHeader.Subtitle>

          <NSectionHeader.Content>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <NSectionInfo
                icon={User}
                label={t('parents.form.name')}
                value={parent?.name || t('common.notSpecified')}
              />

              {parent?.cin && (
                <NSectionInfo
                  icon={Hash}
                  label={t('parents.form.cin')}
                  value={parent.cin}
                />
              )}

              <NSectionInfo
                icon={User}
                label={t('parents.table.gender')}
                value={genderDisplay}
              />

              {parent?.dateOfBirth && (
                <NSectionInfo
                  icon={Calendar}
                  label={t('parents.form.dateOfBirth')}
                  value={new Date(parent.dateOfBirth).toLocaleDateString()}
                />
              )}

              <NSectionInfo
                icon={Users}
                label={t('parents.table.relationship')}
                value={relationshipDisplay}
              />

              {parent?.occupation && (
                <NSectionInfo
                  icon={Briefcase}
                  label={t('parents.table.occupation')}
                  value={parent.occupation}
                />
              )}
            </div>
          </NSectionHeader.Content>
        </NSectionHeader>
      </Card>

      {/* Contact Information */}
      <Card className="overflow-hidden">
        <NSectionHeader
          icon={Mail}
          iconColor="text-blue-500"
          showImage={false}
        >
          <NSectionHeader.Title>
            {t('parents.profile.contactInfo')}
          </NSectionHeader.Title>
          <NSectionHeader.Subtitle>
            {t('parents.profile.contactDetails')}
          </NSectionHeader.Subtitle>

          <NSectionHeader.Content>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {parent?.email && (
                <NSectionInfo
                  icon={Mail}
                  label={t('parents.form.email')}
                  value={parent.email}
                />
              )}

              {parent?.phone && (
                <NSectionInfo
                  icon={Phone}
                  label={t('parents.form.phone')}
                  value={parent.phone}
                />
              )}
            </div>
          </NSectionHeader.Content>
        </NSectionHeader>
      </Card>

      {/* Address Information */}
      <Card className="overflow-hidden">
        <NSectionHeader
          icon={MapPin}
          iconColor="text-green-500"
          showImage={false}
        >
          <NSectionHeader.Title>
            {t('parents.profile.addressInfo')}
          </NSectionHeader.Title>
          <NSectionHeader.Subtitle>
            {t('parents.profile.residentialAddress')}
          </NSectionHeader.Subtitle>

          <NSectionHeader.Content>
            <div className="grid grid-cols-1 gap-4">
              {parent?.address && (
                <NSectionInfo
                  icon={MapPin}
                  label={t('parents.form.address')}
                  value={parent.address}
                />
              )}
            </div>
          </NSectionHeader.Content>
        </NSectionHeader>
      </Card>

      {/* Additional Information */}
      <Card className="overflow-hidden">
        <NSectionHeader
          icon={Briefcase}
          iconColor="text-purple-500"
          showImage={false}
        >
          <NSectionHeader.Title>
            {t('parents.profile.additionalInfo')}
          </NSectionHeader.Title>
          <NSectionHeader.Subtitle>
            {t('parents.profile.otherDetails')}
          </NSectionHeader.Subtitle>

          <NSectionHeader.Content>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <NSectionInfo
                icon={Briefcase}
                label={t('parents.profile.financialResponsibility')}
                value={parent?.financialResponsibility ? t('common.yes') : t('common.no')}
              />

              <NSectionInfo
                icon={Users}
                label={t('parents.profile.emergencyContact')}
                value={parent?.isEmergencyContact ? t('common.yes') : t('common.no')}
              />
            </div>
          </NSectionHeader.Content>
        </NSectionHeader>
      </Card>
    </div>
  );
};

export default PersonalDetailsTab;
