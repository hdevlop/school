"use client"

import { FEATURE_ICONS } from '@/shared/featureIcons';
import { useDialog, NPageHeader, NPageHeaderActions, NTable, NErrorState, NForbiddenState, NEmptyState, NButton } from 'najm-kit';
import { School, Plus, SearchX } from 'lucide-react';
import ClassForm from './ClassForm';
import { useClasses } from '../hooks/useClasses';
import { useTranslation } from 'najm-i18n/react';
import ClassCard from './ClassCard';
import { useClassesTableColumns } from '../hooks/useClassesTableColumns';
import { useClassesTableFilters } from '../hooks/useClassesTableFilters';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';
import { hasFailedToLoad, isAuthorizationError } from '@/services/apiError';

function ClassesTable() {

  const { t } = useTranslation();
  const columns = useClassesTableColumns();
  const rawFilters = useClassesTableFilters();

  const {
    classes,
    createClass,
    updateClass,
    deleteClass,
    error,
    isClassesLoading,
    isUpdating,
    isCreating,
    isDeleting
  } = useClasses();

  const { openDialog, confirmDelete } = useDialog();

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
      title: t('common.delete'),
      warningText: t('common.deleteConfirm'),
      cancelText: t('common.cancel'),
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
        subtitle={hasFailedToLoad(error, classes) ? undefined : t('classes.subtitle.count', { count: total })}
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
        error={hasFailedToLoad(error, classes) ? error : null}
        renderError={(currentError) => (
          isAuthorizationError(currentError)
            ? <NForbiddenState surface="panel" />
            : <NErrorState surface="panel" />
        )}
        renderCard={ClassCard}
        addButtonText={t('classes.dialogs.createButton')}
        renderEmpty={() => (
          <NEmptyState
            surface="panel"
            icon={FEATURE_ICONS.classes}
            title={t('emptyStates.classes.title')}
            description={t('emptyStates.classes.description')}
            action={(
              <NButton size="sm" onClick={handleAddClick}>
                <Plus className="h-4 w-4" />
                {t('classes.dialogs.createButton')}
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
      />
    </div>
  );
}

export default ClassesTable;
