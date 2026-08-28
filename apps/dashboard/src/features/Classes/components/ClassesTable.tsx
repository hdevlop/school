"use client"

import { NPageHeader, NPageHeaderActions, NTable } from 'najm-kit';
import { useConfirmDelete } from '@/hooks/useConfirmDelete';
import { School } from 'lucide-react';
import ClassForm from './ClassForm';
import { useClasses } from '../hooks/useClasses';
import { useTranslation } from '@/hooks/useLanguage';
import ClassCard from './ClassCard';
import { useClassesTableColumns } from '../hooks/useClassesTableColumns';
import { useClassesTableFilters } from '../hooks/useClassesTableFilters';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';

function ClassesTable() {

  const { t } = useTranslation();
  const columns = useClassesTableColumns();
  const rawFilters = useClassesTableFilters();

  const {
    classes,
    createClass,
    updateClass,
    deleteClass,
    isClassesLoading,
    isUpdating,
    isCreating,
    isDeleting
  } = useClasses();

  const { openDialog, confirmDelete } = useConfirmDelete();

  const handleAddClick = () => {
    openDialog({
      title: t('classes.dialogs.createTitle'),
      children: <ClassForm />,
      primaryButton: {
        form: 'class-form',
        text: t('classes.dialogs.createButton'),
        loading: isCreating,
        onClick: async (classData) => {
          await createClass(classData);
        }
      }
    });
  };

  const handleEdit = (classData) => {
    openDialog({
      title: `${t('classes.dialogs.editTitle')} - ${classData.name}`,
      children: <ClassForm classData={classData} />,
      primaryButton: {
        form: 'class-form',
        text: t('classes.dialogs.updateButton'),
        loading: isUpdating,
        onClick: async (formData) => {
          await updateClass(formData);
        }
      }
    });
  };

  const handleView = (classData) => {
    openDialog({
      title: t('classes.dialogs.viewTitle'),
      children: <ClassCard data={classData} />,
      showButtons: false,
    });
  };


  const handleDelete = (classData) => {
    confirmDelete({
      itemName: classData.name,
      confirmText: t('classes.dialogs.deleteButton'),
      loading: isDeleting,
      onConfirm: async () => {
        await deleteClass(classData.id);
      }
    });
  };

  const total = classes?.length ?? 0;

  return (
    <div className='flex flex-col gap-2 w-full h-full'>
      <NPageHeader
        icon={School}
        title={t('navigation.classes')}
        subtitle={t('classes.subtitle.count', { count: total })}
      >
        <NPageHeaderActions>
          <PageHeaderGlobalActions />
        </NPageHeaderActions>
      </NPageHeader>

      <NTable
        data={classes}
        columns={columns}
        filters={rawFilters}
        onCreate={handleAddClick}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
        loading={isClassesLoading}
        renderCard={ClassCard}
        addButtonText={t('classes.dialogs.createButton')}
        defaultMode='table'
      />
    </div>
  );
}

export default ClassesTable;
