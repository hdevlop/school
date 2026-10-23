"use client"

import { useLayoutEffect } from 'react';
import { PermissionButton } from '@/components/PermissionButton';
import { FEATURE_ICONS } from '@/shared/featureIcons';
import { NPageHeader, NPageHeaderActions, NErrorState, NForbiddenState, NEmptyState, useTableStore } from 'najm-kit';
import { useDialog } from '@/shared/useDialog';
import { useAcademicTableActions } from '@/features/Classes/hooks/useAcademicTableActions';
import { useRememberedTableMode } from '@/hooks/useRememberedTableMode';
import { deleteClassApi } from '@/services/classApi';
import { SchoolTable as NTable } from '@/components/SchoolTable';
import { School, Plus, SearchX } from 'lucide-react';
import ClassForm from './ClassForm';
import { useClasses } from '../hooks/useClasses';
import { useTranslation } from 'najm-i18n/react';
import ClassCard from './ClassCard';
import { useClassesTableColumns } from '../hooks/useClassesTableColumns';
import { useClassesTableFilters } from '../hooks/useClassesTableFilters';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';
import { hasFailedToLoad, isCountUnknown, isAuthorizationError } from '@/services/apiError';

function InitialClassPageSize() {
  const setPageSizeFromUser = useTableStore.use.setPageSizeFromUser();
  useLayoutEffect(() => {
    // Keep Najm's page-size selector and its single pagination owner. Mark the
    // initial size as chosen so cards and layout measurements cannot replace it.
    setPageSizeFromUser(10);
  }, [setPageSizeFromUser]);
  return null;
}

function ClassesTable() {

  const { t } = useTranslation();
  const columns = useClassesTableColumns();
  const rawFilters = useClassesTableFilters();

  const {
    classes,
    createClass,
    updateClass,
    error,
    isClassesLoading,
    isUpdating,
    isCreating,
  } = useClasses();

  const { openDialog } = useDialog();
  const tableActions = useAcademicTableActions('classes', deleteClassApi);
  const tableMode = useRememberedTableMode('classes', 'table');

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



  const total = classes?.length ?? 0;

  return (
    <div className='flex flex-col gap-2 w-full h-full'>
      <NPageHeader
        icon={School}
        title={t('navigation.classes')}
        subtitle={isCountUnknown(error, classes, isClassesLoading) ? undefined : t('classes.subtitle.count', { count: total })}
      >
        <NPageHeaderActions>
          <PageHeaderGlobalActions />
        </NPageHeaderActions>
      </NPageHeader>

      <NTable
        permissionResource="classes"
        classNameColumns={['name']}
        responsiveSkeleton
        data={classes}
        columns={columns}
        filters={rawFilters}
        onCreate={handleAddClick}
        onView={handleView}
        onEdit={handleEdit}
        {...tableActions}
        {...tableMode}
        dynamicHeight={false}
        renderToolbar={() => <InitialClassPageSize />}
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
              <PermissionButton permission="create:classes" size="sm" onClick={handleAddClick}>
                <Plus className="h-4 w-4" />
                {t('classes.dialogs.createButton')}
              </PermissionButton>
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
      />
    </div>
  );
}

export default ClassesTable;
