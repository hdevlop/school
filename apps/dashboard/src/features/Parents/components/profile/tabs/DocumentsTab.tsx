"use client";

import { NButton } from 'najm-kit';

import React from 'react';
import { Card } from 'najm-kit';
import { NSectionHeader } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { FileText, Download, Eye, Upload, Award } from 'lucide-react';
import { Label } from 'najm-kit';

interface DocumentsTabProps {
  parent: any;
}

const DocumentsTab: React.FC<DocumentsTabProps> = () => {
  const { t } = useTranslation();

  // Placeholder documents
  const documents = [];

  const getDocumentIcon = (_type: string) => {
    return <FileText className="w-5 h-5 text-primary" />;
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card className="overflow-hidden">
        <NSectionHeader
          icon={Upload}
          iconColor="text-primary"
          showImage={false}
        >
          <NSectionHeader.Title>
            {t('parents.profile.uploadDocuments')}
          </NSectionHeader.Title>
          <NSectionHeader.Subtitle>
            {t('parents.profile.uploadParentDocuments')}
          </NSectionHeader.Subtitle>

          <NSectionHeader.Actions>
            <NButton>
              <Upload className="w-4 h-4 mr-2" />
              {t('parents.profile.uploadDocument')}
            </NButton>
          </NSectionHeader.Actions>
        </NSectionHeader>
      </Card>

      {/* Documents List */}
      <Card className="overflow-hidden">
        <NSectionHeader
          icon={FileText}
          iconColor="text-primary"
          showImage={false}
        >
          <NSectionHeader.Title>
            {t('parents.profile.documents')}
          </NSectionHeader.Title>
          <NSectionHeader.Subtitle>
            {t('parents.profile.viewAllDocuments')}
          </NSectionHeader.Subtitle>
        </NSectionHeader>

        <div className="p-6">
          {documents.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <Label className="text-muted-foreground">
                {t('parents.profile.noDocuments')}
              </Label>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc: any) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-4 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    {getDocumentIcon(doc.type)}
                    <div className="flex-1">
                      <Label className="font-medium block">
                        {doc.name}
                      </Label>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <Label className="text-sm text-muted-foreground">
                          {doc.size}
                        </Label>
                        <span>•</span>
                        <Label className="text-sm text-muted-foreground">
                          {doc.uploadDate}
                        </Label>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <NButton variant="ghost" size="sm">
                      <Eye className="w-4 h-4" />
                    </NButton>
                    <NButton variant="ghost" size="sm">
                      <Download className="w-4 h-4" />
                    </NButton>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Document Categories */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 text-center">
          <Award className="w-8 h-8 text-primary mx-auto mb-2" />
          <Label className="text-sm text-muted-foreground block mb-1">
            {t('parents.profile.idDocuments')}
          </Label>
          <Label className="text-2xl font-bold">0</Label>
        </Card>

        <Card className="p-4 text-center">
          <FileText className="w-8 h-8 text-primary mx-auto mb-2" />
          <Label className="text-sm text-muted-foreground block mb-1">
            {t('parents.profile.agreements')}
          </Label>
          <Label className="text-2xl font-bold">0</Label>
        </Card>

        <Card className="p-4 text-center">
          <FileText className="w-8 h-8 text-primary mx-auto mb-2" />
          <Label className="text-sm text-muted-foreground block mb-1">
            {t('parents.profile.otherDocuments')}
          </Label>
          <Label className="text-2xl font-bold">0</Label>
        </Card>
      </div>
    </div>
  );
};

export default DocumentsTab;
