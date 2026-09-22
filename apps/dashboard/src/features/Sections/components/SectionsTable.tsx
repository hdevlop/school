"use client"

import { FEATURE_ICONS } from '@/shared/featureIcons';
import { useDialog, NPageHeader, NPageHeaderActions, NTable, NErrorState, NForbiddenState, NEmptyState, NButton } from 'najm-kit';
import { Layers, Plus, SearchX } from 'lucide-react';
import React from 'react';
import SectionForm from './SectionForm';
import { useSections } from '../hooks/useSections';
import { useTranslation } from 'najm-i18n/react';
import SectionCard from './SectionCard';
import { useSectionsTableColumns } from '../hooks/useSectionsTableColumns';
import { useSectionsTableFilters } from '../hooks/useSectionsTableFilters';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';
import { hasFailedToLoad, isAuthorizationError } from '@/services/apiError';

function SectionsTable() {

  const { t } = useTranslation();
  const columns = useSectionsTableColumns();
  const rawFilters = useSectionsTableFilters();

  const {
    sections,
    createSection,
    updateSection,
    deleteSection,
    error,
    isSectionsLoading,
    isUpdating,
    isCreating,
    isDeleting
  } = useSections();

  const { openDialog, confirmDelete } = useDialog();

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

  const handleDelete = (section) => {
    confirmDelete({
      title: t('common.delete'),
      warningText: t('common.deleteConfirm'),
      cancelText: t('common.cancel'),
      itemName: `Section ${section.name}`,
      confirmText: t('sections.dialogs.deleteButton'),
      loading: isDeleting,
      onConfirm: async () => {
        await deleteSection(section.id);
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
        subtitle={hasFailedToLoad(error, sections) ? undefined : t('sections.subtitle.count', { count: total })}
      >
        <NPageHeaderActions>
          <PageHeaderGlobalActions />
        </NPageHeaderActions>
      </NPageHeader>

      <NTable
        className='min-h-0 flex-1'
        data={sections}
        columns={columns}
        filters={rawFilters}
        onCreate={handleAddClick}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
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
            icon={FEATURE_ICONS.sections}
            title={t('emptyStates.sections.title')}
            description={t('emptyStates.sections.description')}
            action={(
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
        defaultMode='table'
        dynamicHeight={true}
      />
    </div>
  );
}

export default SectionsTable;
