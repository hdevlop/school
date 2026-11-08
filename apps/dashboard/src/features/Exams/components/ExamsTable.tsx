"use client"

import { PermissionButton } from '@/components/PermissionButton';
import { FEATURE_ICONS } from '@/shared/featureIcons';
import { SchoolPageHeader as NPageHeader } from '@/components/SchoolPageHeader';
import { NPageHeaderActions, NErrorState, NForbiddenState, NEmptyState } from 'najm-kit';
import { useDialog } from '@/shared/useDialog';
import { SchoolTable as NTable } from '@/components/SchoolTable';
import { Plus } from 'lucide-react';
import React, { useMemo } from 'react';
import ExamForm from './ExamForm';
import ExamCard from './ExamCard';
import { ExamCardSkeleton } from '@/shared/CardSkeletons';
import { useExams } from '../hooks/useExams';
import { useTranslation } from 'najm-i18n/react';
import { useSchoolToday } from '@/hooks/useSchoolFormat';
import { useViewerRole } from '@/features/Users/hooks/useViewerRole';
import { examTitle, groupPlannedExams, useExamsTableColumns, type ExamRow } from '../hooks/useExamsTableColumns';
import { compareClassNames } from '@sms/contracts';
import { useExamsTableFilters } from '../hooks/useExamsTableFilters';
import { useClassSectionTableScope } from '@/features/Classes/hooks/useClassSectionTableScope';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';
import { hasFailedToLoad, isCountUnknown, isAuthorizationError } from '@/services/apiError';

function ExamsTable() {
  const { t } = useTranslation();
  // Parents and students read these records; they change none of them.
  const { isFamily } = useViewerRole();
  const columns = useExamsTableColumns();
  const scope = useClassSectionTableScope();
  const typeFilters = useExamsTableFilters();
  const rawFilters = useMemo(() => [...scope.filters, ...typeFilters], [scope.filters, typeFilters]);

  const {
    exams,
    createExam,
    updateExam,
    deleteExam,
    error,
    isExamsLoading,
    isUpdating,
    isCreating,
    isDeleting,
  } = useExams();
  // Coming exams first, soonest on top; past ones after, latest first. Within
  // a day, by time, class (CP, CE1…), then name. One Planning exam is one row,
  // whatever its number of sections.
  const today = useSchoolToday();
  const filteredExams = useMemo(() => groupPlannedExams(((exams || []) as ExamRow[]).filter(scope.matches)).sort((a, b) => {
    const aPast = a.date < today, bPast = b.date < today;
    if (aPast !== bPast) return aPast ? 1 : -1;
    if (a.date !== b.date) return aPast ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date);
    // Within a day: by start time (untimed last), then class, then name.
    const time = (row: ExamRow) => row.startTime?.slice(0, 5) ?? '99:99';
    return time(a).localeCompare(time(b)) || compareClassNames(a.class?.name ?? '', b.class?.name ?? '') || examTitle(a).localeCompare(examTitle(b));
  }), [exams, scope.matches, today]);

  const { openDialog, confirmDelete } = useDialog();

  const handleAddClick = () => {
    openDialog({
      title: t('exams.dialogs.createTitle'),
      children: <ExamForm />,
      primaryButton: {
        form: 'exam-form',
        text: t('exams.dialogs.createButton'),
        loading: isCreating,
        onClick: async (data) => {
          await createExam(data);
        },
      },
    });
  };

  const handleView = (exam) => {
    openDialog({
      title: t('exams.dialogs.viewTitle'),
      children: <ExamCard data={exam} />,
      showButtons: false,
    });
  };

  const handleEdit = (exam) => {
    openDialog({
      title: `${t('exams.dialogs.editTitle')} - ${exam.title}`,
      children: <ExamForm exam={exam} />,
      primaryButton: {
        form: 'exam-form',
        text: t('exams.dialogs.updateButton'),
        loading: isUpdating,
        // A Planning row stands for each section's exam: the change goes to all of them.
        onClick: async (data) => {
          for (const member of exam.members ?? [exam]) await updateExam({ ...data, id: member.id });
        },
      },
    });
  };

  const handleDelete = (exam) => {
    // Planning owns its exams: one deleted here would come back with the next
    // Planning save, so the entry is deleted there.
    if (exam.planningEntryId) {
      openDialog({ title: t('common.delete'), children: <p className="text-sm">{t('exams.deleteInPlanning')}</p>, showButtons: false });
      return;
    }
    confirmDelete({
      title: t('common.delete'),
      warningText: t('common.deleteConfirm'),
      cancelText: t('common.cancel'),
      itemName: exam.title,
      confirmText: t('exams.dialogs.deleteButton'),
      loading: isDeleting,
      onConfirm: async () => {
        await deleteExam(exam.id);
      },
    });
  };

  const total = groupPlannedExams((exams || []) as ExamRow[]).length;

  return (
    <div className='flex flex-col gap-2 w-full h-full min-h-0'>
      <NPageHeader
        icon={FEATURE_ICONS.exams}
        title={t('navigation.exams')}
        subtitle={isCountUnknown(error, exams, isExamsLoading) ? undefined : t('exams.subtitle.count', { count: total })}
      >
        <NPageHeaderActions>
          <PageHeaderGlobalActions />
        </NPageHeaderActions>
      </NPageHeader>

      <NTable
        exportTitle={t('navigation.exams')}
        permissionResource="exams"
        responsiveSkeleton
        className='min-h-0 flex-1'
        data={filteredExams}
        columns={columns}
        filters={rawFilters}
        onCreate={isFamily ? undefined : handleAddClick}
        onView={handleView}
        onEdit={isFamily ? undefined : handleEdit}
        onDelete={isFamily ? undefined : handleDelete}
        loading={isExamsLoading}
        error={hasFailedToLoad(error, exams) ? error : null}
        renderError={(currentError) => (
          isAuthorizationError(currentError)
            ? <NForbiddenState surface="panel" />
            : <NErrorState surface="panel" />
        )}
        renderCard={ExamCard}
        renderCardSkeleton={ExamCardSkeleton}
        addButtonText={t('exams.dialogs.createButton')}
        renderEmpty={() => (
          <NEmptyState
            surface="panel"
            icon={FEATURE_ICONS.exams}
            title={scope.hasSelection ? t('emptyStates.filtered.title') : t('emptyStates.exams.title')}
            description={scope.hasSelection ? t('emptyStates.filtered.description') : isFamily ? t('emptyStates.familyDescription') : t('emptyStates.exams.description')}
            action={scope.hasSelection || isFamily ? undefined : (
              <PermissionButton permission="create:exams" size="sm" onClick={handleAddClick}>
                <Plus className="h-4 w-4" />
                {t('exams.dialogs.createButton')}
              </PermissionButton>
            )}
          />
        )}
        renderFilteredEmpty={() => (
          <NEmptyState
            surface="panel"
            icon={FEATURE_ICONS.exams}
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

export default ExamsTable;
