"use client";

import React from 'react';
import { Badge } from 'najm-kit';
import { KeyRound, Tag, FileText, Boxes, Zap } from 'lucide-react';
import { useTranslation } from '@/hooks/useLanguage';

const PermissionCard = ({ data }) => {
  const { t } = useTranslation();
  const permission = data;

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-2">
        <KeyRound className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-foreground">{permission.name || t('common.notAvailable')}</h3>
      </div>

      <div className="space-y-2">
        <div className="flex items-center text-sm text-muted-foreground">
          <Boxes className="h-4 w-4 mr-2" />
          <span className="text-xs mr-2">{t('permissions.table.resource')}:</span>
          <Badge variant="outline" className="text-xs font-mono">{permission.resource}</Badge>
        </div>

        <div className="flex items-center text-sm text-muted-foreground">
          <Zap className="h-4 w-4 mr-2" />
          <span className="text-xs mr-2">{t('permissions.table.action')}:</span>
          <Badge variant="outline" className="text-xs font-mono">{permission.action}</Badge>
        </div>

        <div className="flex items-center text-sm text-muted-foreground">
          <Tag className="h-4 w-4 mr-2" />
          <span className="text-xs mr-2">{t('permissions.table.name')}:</span>
          <span className="font-medium text-primary">{permission.name}</span>
        </div>
      </div>

      <div className="space-y-2 pt-2 border-t">
        <div className="flex items-start text-sm text-muted-foreground">
          <FileText className="h-4 w-4 mr-2 mt-0.5 shrink-0" />
          <div className="flex-1">
            <span className="text-xs text-muted-foreground block">{t('permissions.form.description')}:</span>
            <span className="text-sm text-foreground mt-1 block">
              {permission.description || t('permissions.table.noDescription')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PermissionCard;
