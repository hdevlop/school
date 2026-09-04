"use client";

import React from 'react';
import { Shield, Tag, FileText, Hash } from 'lucide-react';
import { useTranslation } from 'najm-i18n/react';

const RoleCard = ({ data }) => {
  const { t } = useTranslation();
  const role = data;

  return (
    <div className="space-y-4 p-4">
      {/* Header with Role Icon and Name */}
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-foreground">{role.name || t('common.notAvailable')}</h3>
      </div>

      {/* Role Basic Information */}
      <div className="space-y-2">
        <div className="flex items-center text-sm text-muted-foreground">
          <Hash className="h-4 w-4 mr-2" />
          <span className="text-xs mr-2">{t('roles.table.id')}:</span>
          <span>#{role.id}</span>
        </div>

        <div className="flex items-center text-sm text-muted-foreground">
          <Tag className="h-4 w-4 mr-2" />
          <span className="text-xs mr-2">{t('roles.table.roleName')}:</span>
          <span className="font-medium text-primary">{role.name}</span>
        </div>
      </div>

      {/* Role Description */}
      <div className="space-y-2 pt-2 border-t">
        <div className="flex items-start text-sm text-muted-foreground">
          <FileText className="h-4 w-4 mr-2 mt-0.5 shrink-0" />
          <div className="flex-1">
            <span className="text-xs text-muted-foreground block">{t('roles.form.description')}:</span>
            <span className="text-sm text-foreground mt-1 block">
              {role.description || t('roles.table.noDescription')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoleCard;