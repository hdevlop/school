"use client"

import { NPageHeader, NPageHeaderActions, NTable } from 'najm-kit';
import { useConfirmDelete } from '@/hooks/useConfirmDelete';
import { buildSmsColumns } from '@/lib/tableUtils';
import { Layers } from 'lucide-react';
import React from 'react';
import SectionForm from './SectionForm';
import { useSections } from '../hooks/useSections';
import { useTranslation } from 'najm-i18n/react';
import SectionCard from './SectionCard';
import { useSectionsTableColumns } from '../hooks/useSectionsTableColumns';
import { useSectionsTableFilters } from '../hooks/useSectionsTableFilters';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';
import { hasFailedToLoad, tableErrorProps } from '@/shared/TableErrorState';

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

  const { openDialog, confirmDelete } = useConfirmDelete();

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
        columns={buildSmsColumns(columns, { onCellEdit: handleCellEdit })}
        filters={rawFilters}
        onCreate={handleAddClick}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCellEdit={handleCellEdit}
        loading={isSectionsLoading}
        {...tableErrorProps(error, sections)}
        renderCard={SectionCard}
        addButtonText={t('sections.dialogs.createButton')}
        defaultMode='table'
        dynamicHeight={true}
      />
    </div>
  );
}

export default SectionsTable;
