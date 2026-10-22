"use client"

import { FEATURE_ICONS } from '@/shared/featureIcons';
import { NPageHeader, NPageHeaderActions, NErrorState, NForbiddenState, NEmptyState, NButton } from 'najm-kit';
import { useDialog } from '@/shared/useDialog';
import { useAcademicTableActions } from '@/features/Classes/hooks/useAcademicTableActions';
import { useRememberedTableMode } from '@/hooks/useRememberedTableMode';
import { deleteSectionApi } from '@/services/sectionApi';
import { SchoolTable as NTable } from '@/components/SchoolTable';
import { Layers, Plus, SearchX } from 'lucide-react';
import React, { useMemo } from 'react';
import { useClassSectionTableScope } from '@/features/Classes/hooks/useClassSectionTableScope';
import SectionForm from './SectionForm';
import { useSections } from '../hooks/useSections';
import { useTranslation } from 'najm-i18n/react';
import SectionCard from './SectionCard';
import { useSectionsTableColumns } from '../hooks/useSectionsTableColumns';
import { useSectionsTableFilters } from '../hooks/useSectionsTableFilters';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';
import { hasFailedToLoad, isCountUnknown, isAuthorizationError } from '@/services/apiError';

function SectionsTable() {

  const { t } = useTranslation();
  const columns = useSectionsTableColumns();
  const scope = useClassSectionTableScope({ includeSection: false });
  const sectionFilters = useSectionsTableFilters();
  const rawFilters = useMemo(() => [...sectionFilters, ...scope.filters], [sectionFilters, scope.filters]);

  const {
    sections,
    createSection,
    updateSection,
    error,
    isSectionsLoading,
    isUpdating,
    isCreating,
  } = useSections();
  const filteredSections = useMemo(() => (sections || []).filter(scope.matches), [sections, scope.matches]);

  const { openDialog } = useDialog();
  const tableActions = useAcademicTableActions('sections', deleteSectionApi);
  const tableMode = useRememberedTableMode('sections', 'table');

  const handleAddClick = () => {
    openDialog({
      title: t('sections.dialogs.createTitle'),
      children: <SectionForm />,
      primaryButton: {
        form: 'section-form',
        text: t('sections.dialogs.createButton'),
        loading: isCreating,
        onClick: async (sectionData) => {
          await createSection(sectionData);
        }
      }
    });
  };

  const handleView = (section) => {
    openDialog({
      title: t('sections.dialogs.viewTitle'),
      children: <SectionCard data={section} />,
      showButtons: false,
    });
  };

  const handleEdit = (section) => {
    openDialog({
      title: `${t('sections.dialogs.editTitle')} - ${section.name}`,
      children: <SectionForm section={section} />,
      primaryButton: {
        form: 'section-form',
        text: t('sections.dialogs.updateButton'),
        loading: isUpdating,
        onClick: async (sectionData) => {
          await updateSection(sectionData);
        }
      }
    });
  };


  const handleCellEdit = async (row, columnId, value) => {
    await updateSection({ ...row, [columnId]: value });
  };

  const total = sections?.length ?? 0;

  return (
    <div className='flex flex-col gap-2 w-full h-full min-h-0'>
      <NPageHeader
        icon={Layers}
        title={t('navigation.sections')}
        subtitle={isCountUnknown(error, sections, isSectionsLoading) ? undefined : t('sections.subtitle.count', { count: total })}
      >
        <NPageHeaderActions>
          <PageHeaderGlobalActions />
        </NPageHeaderActions>
      </NPageHeader>

      <NTable
        responsiveSkeleton
        className='min-h-0 flex-1'
        data={filteredSections}
        columns={columns}
        filters={rawFilters}
        onCreate={handleAddClick}
        onView={handleView}
        onEdit={handleEdit}
        {...tableActions}
        {...tableMode}
        onCellEdit={handleCellEdit}
        loading={isSectionsLoading}
        error={hasFailedToLoad(error, sections) ? error : null}
        renderError={(currentError) => (
          isAuthorizationError(currentError)
            ? <NForbiddenState surface="panel" />
            : <NErrorState surface="panel" />
        )}
        renderCard={SectionCard}
        addButtonText={t('sections.dialogs.createButton')}
        renderEmpty={() => (
          <NEmptyState
            surface="panel"
            icon={scope.hasSelection ? SearchX : FEATURE_ICONS.sections}
            title={t(scope.hasSelection ? 'emptyStates.filtered.title' : 'emptyStates.sections.title')}
            description={t(scope.hasSelection ? 'emptyStates.filtered.description' : 'emptyStates.sections.description')}
            action={scope.hasSelection ? undefined : (
              <NButton size="sm" onClick={handleAddClick}>
                <Plus className="h-4 w-4" />
                {t('sections.dialogs.createButton')}
              </NButton>
            )}
          />
        )}
        renderFilteredEmpty={() => (
          <NEmptyState
            surface="panel"
            icon={SearchX}
            title={t('emptyStates.filtered.title')}
            description={t('emptyStates.filtered.description')}
          />
        )}
        dynamicHeight={true}
      />
    </div>
  );
}

export default SectionsTable;
