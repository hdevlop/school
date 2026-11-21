"use client"

import React, { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { ClipboardCheck, Eye, Pencil, Plus, Trash2 } from 'lucide-react';
import { NButton, NEmptyState, NErrorState, NForbiddenState, NPageHeaderActions, useMediaQuery, type NTableProps } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import type { HomeworkRow } from '@sms/contracts';
import { PermissionButton } from '@/components/PermissionButton';
import { SchoolPageHeader as NPageHeader } from '@/components/SchoolPageHeader';
import { SchoolTable as NTable } from '@/components/SchoolTable';
import { FEATURE_ICONS } from '@/shared/featureIcons';
import { HomeworkCardSkeleton } from '@/shared/CardSkeletons';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';
import { HeaderActionsMenu } from '@/components/HeaderActionsMenu';
import { normalizeSearch } from '@/components/HeaderSearchButton';
import { useSchoolToday } from '@/hooks/useSchoolFormat';
import { useDialog } from '@/shared/useDialog';
import { hasFailedToLoad, isAuthorizationError, isCountUnknown } from '@/services/apiError';
import { useViewingYearKey } from '@/features/AcademicYears/hooks/useViewingAcademicYear';
import { useClassSectionTableScope } from '@/features/Classes/hooks/useClassSectionTableScope';
import { useViewerRole } from '@/features/Users/hooks/useViewerRole';
import { useHomework, useMissedHomework, type HomeworkSave } from '../hooks/useHomework';
import { missedByStudent } from '../config/homeworkCompletion';
import { useHomeworkTableColumns } from '../hooks/useHomeworkTableColumns';
import HomeworkCard, { homeworkPlacementLabel } from './HomeworkCard';
import HomeworkCompletionSheet from './HomeworkCompletionSheet';
import HomeworkForm from './HomeworkForm';
import { homeworkTones } from '../config/homeworkTones';
import { HomeworkMobileCard, HomeworkMobileCardSkeleton, HomeworkToneContext } from './HomeworkMobileCard';
import { HomeworkMobileControls, HomeworkSearchButton } from './HomeworkMobileControls';
import HomeworkMobileDetailsDialog from './HomeworkMobileDetailsDialog';
import styles from './HomeworkMobile.module.css';

const HomeworkFollowUpTable = dynamic(() => import('./HomeworkFollowUpTable'));

function HomeworkTable() {
  const { t, language } = useTranslation();
  const isPhone = useMediaQuery('(max-width: 767px)');
  const showMissed = useSearchParams().get('view') === 'missed';
  const today = useSchoolToday();
  const yearKey = useViewingYearKey();
  const [search, setSearch] = useState('');
  const [subjectSelection, setSubjectSelection] = useState<{ yearKey: string; id: string }>();
  const [newestFirst, setNewestFirst] = useState(true);
  const [desktopMode, setDesktopMode] = useState<NonNullable<NTableProps['mode']>>('table');
  // The server lets a teacher write the homework of their own classes and
  // the school-wide roles any; monitors, supervisors and families only read.
  const { role, isFamily, isSchoolWide } = useViewerRole();
  const mayWrite = role === 'teacher' || isSchoolWide;
  const [followUp, setFollowUp] = useState<HomeworkRow | null>(null);
  const [viewing, setViewing] = useState<HomeworkRow | null>(null);
  const columns = useHomeworkTableColumns(
    role === 'parent' ? 'parent' : role === 'student' ? 'student' : 'staff',
    mayWrite ? setFollowUp : undefined,
  );
  const scope = useClassSectionTableScope();
  const { filters, matches } = scope;

  const { homework, saveHomework, deleteHomework, error, isHomeworkLoading, isSaving, isDeleting } = useHomework({ enabled: !showMissed });
  const { records, isLoading: isMissedLoading, error: missedError } = useMissedHomework({ enabled: showMissed });
  const missedRows = useMemo(() => missedByStudent(records, today).filter(matches), [records, today, matches]);
  const subjects = useMemo(() => {
    const names = new Map<string, string>();
    for (const row of homework ?? []) {
      if (row.subject) names.set(row.subject.id, row.subject.name);
    }
    return Array.from(names, ([value, label]) => ({ value, label }))
      .sort((left, right) => left.label.localeCompare(right.label, language));
  }, [homework, language]);
  const subjectId = isPhone && subjectSelection?.yearKey === yearKey
    && subjects.some((subject) => subject.value === subjectSelection.id) ? subjectSelection.id : '';
  const query = isPhone ? normalizeSearch(search.trim()) : '';
  const rows = useMemo(() => (homework ?? []).filter((row) =>
    matches(row)
      && (!subjectId || row.subject?.id === subjectId)
      && (!query || [row.title, row.subject?.name, row.subject?.code, row.subSubject, row.teacher?.name, homeworkPlacementLabel(row)]
        .some((value) => value && normalizeSearch(value).includes(query))),
  ), [homework, matches, query, subjectId]);
  const toneOf = useMemo(() => homeworkTones(homework ?? []), [homework]);
  const sorting = useMemo(() => isPhone ? [{ id: 'date', desc: newestFirst }] : undefined, [isPhone, newestFirst]);
  const { openDialog, confirmDelete } = useDialog();

  const toggleView = () => {
    const url = new URL(window.location.href);
    if (showMissed) url.searchParams.delete('view');
    else url.searchParams.set('view', 'missed');
    window.history.replaceState(null, '', url);
  };

  const handleAddClick = () => {
    openDialog({
      title: t('homework.dialogs.createTitle'),
      // A new homework is for the class and section the list is filtered to.
      children: <HomeworkForm place={{ classId: scope.classId, sectionId: scope.sectionId }} />,
      primaryButton: {
        form: 'homework-form',
        text: t('homework.dialogs.createButton'),
        loading: isSaving,
        onClick: async (data: HomeworkSave) => { await saveHomework(data); },
      },
    });
  };

  const handleView = (row: HomeworkRow) => {
    const title = t('homework.dialogs.viewTitle');
    // A phone opens the homework in a sheet, as its follow-up; a wider screen shows the card in a dialog.
    if (isPhone) {
      setViewing(row);
      return;
    }
    openDialog({
      title,
      children: <HomeworkCard data={row} detailed />,
      showButtons: false,
    });
  };

  const handleEdit = (row: HomeworkRow) => {
    openDialog({
      title: `${t('homework.dialogs.editTitle')} - ${row.title}`,
      children: <HomeworkForm homework={row} />,
      primaryButton: {
        form: 'homework-form',
        text: t('homework.dialogs.updateButton'),
        loading: isSaving,
        onClick: async (data: HomeworkSave) => { await saveHomework({ ...data, id: row.id }); },
      },
    });
  };

  const handleDelete = (row: HomeworkRow) => {
    confirmDelete({
      title: t('common.delete'),
      warningText: t('common.deleteConfirm'),
      cancelText: t('common.cancel'),
      itemName: row.title,
      confirmText: t('homework.dialogs.deleteButton'),
      loading: isDeleting,
      onConfirm: async () => { await deleteHomework(row.id); },
    });
  };

  const total = homework?.length ?? 0;
  const countUnknown = showMissed
    ? isCountUnknown(missedError, records, isMissedLoading)
    : isCountUnknown(error, homework, isHomeworkLoading);
  const hasSelection = scope.hasSelection || Boolean(query || subjectId);
  const followUpTitle = t('homeworkFollowUp.title');
  const homeworkTitle = t('navigation.homework');
  const toggleLabel = showMissed ? homeworkTitle : followUpTitle;
  const ToggleIcon = showMissed ? FEATURE_ICONS.homework : FEATURE_ICONS.homeworkFollowUp;
  const toggleButton = (
    <NButton
      type="button"
      size={isPhone ? 'icon' : 'sm'}
      variant="outline"
      aria-label={toggleLabel}
      title={toggleLabel}
      className={`bg-transparent hover:bg-transparent ${isPhone ? 'size-10 shrink-0 p-0' : 'hidden md:inline-flex'}`}
      onClick={toggleView}
    >
      <ToggleIcon className="size-4" aria-hidden />
      {!isPhone && toggleLabel}
    </NButton>
  );
  // An empty list, filtered or not, offers to publish one to whoever may.
  const addAction = mayWrite ? (
    <PermissionButton permission="create:homework" size="sm" onClick={handleAddClick}>
      <Plus className="h-4 w-4" />
      {t('homework.dialogs.createButton')}
    </PermissionButton>
  ) : undefined;

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-2">
      <NPageHeader
        icon={showMissed ? FEATURE_ICONS.homeworkFollowUp : FEATURE_ICONS.homework}
        title={showMissed ? followUpTitle : homeworkTitle}
        subtitle={countUnknown ? undefined : showMissed
          ? t('homeworkFollowUp.subtitle', { count: missedRows.length })
          : t('homework.subtitle.count', { count: total })}
        // On a phone the search is an icon beside the actions menu, which keeps what it lists.
        compactActions={isPhone ? (
          <div className="flex shrink-0 items-center">
            {!showMissed && <HomeworkSearchButton search={search} onSearch={setSearch} />}
            <HeaderActionsMenu contentClassName="md:hidden" hasOwnActions={false}><PageHeaderGlobalActions /></HeaderActionsMenu>
          </div>
        ) : undefined}
      >
        <NPageHeaderActions>
          {!isPhone && toggleButton}
          <PageHeaderGlobalActions />
        </NPageHeaderActions>
      </NPageHeader>

      {isPhone && <HomeworkMobileControls
        filters={filters}
        homework={showMissed ? undefined : {
          subjects, subjectId, newestFirst, onSort: setNewestFirst,
          onSubjectChange: (id) => setSubjectSelection({ yearKey, id }),
        }}
        count={countUnknown ? undefined : showMissed ? missedRows.length : rows.length}
        toggleButton={toggleButton}
        addButton={mayWrite ? (
          <PermissionButton permission="create:homework" onClick={handleAddClick} aria-label={t('homework.dialogs.createButton')}
            title={t('homework.dialogs.createButton')} className="size-10 shrink-0 p-0">
            <Plus className="size-5" aria-hidden />
          </PermissionButton>
        ) : undefined} />}

      {showMissed ? (
        <HomeworkFollowUpTable
          rows={missedRows}
          filters={filters}
          hasSelection={scope.hasSelection}
          isPhone={isPhone}
          isLoading={isMissedLoading}
          error={hasFailedToLoad(missedError, records) ? missedError : null}
          today={today}
        />
      ) : <HomeworkToneContext.Provider value={toneOf}>
      <NTable
        exportTitle={homeworkTitle}
        permissionResource="homework"
        responsiveSkeleton
        className={`min-h-0 flex-1 ${styles.table}`}
        data={rows}
        getRowId={(row) => row.id}
        columns={columns}
        filters={isPhone ? undefined : filters}
        sorting={sorting}
        showCheckbox={isPhone ? false : undefined}
        onCreate={mayWrite ? handleAddClick : undefined}
        onView={handleView}
        onRowClick={handleView}
        onEdit={mayWrite ? handleEdit : undefined}
        onDelete={mayWrite ? handleDelete : undefined}
        menuButton
        menu={{
          row: (row: HomeworkRow) => [
            { label: t('common.view'), icon: Eye, onSelect: () => handleView(row) },
            ...(mayWrite ? [
              { label: t('homework.completion.menu'), permission: 'update:homework', icon: ClipboardCheck, onSelect: () => setFollowUp(row) },
              { label: t('common.edit'), permission: 'update:homework', icon: Pencil, onSelect: () => handleEdit(row) },
              { label: t('common.delete'), permission: 'delete:homework', icon: Trash2, danger: true, separatorBefore: true, onSelect: () => handleDelete(row) },
            ] : []),
          ],
        }}
        loading={isHomeworkLoading}
        error={hasFailedToLoad(error, homework) ? error : null}
        renderError={(currentError) => (
          isAuthorizationError(currentError)
            ? <NForbiddenState surface="panel" />
            : <NErrorState surface="panel" />
        )}
        renderCard={isPhone ? HomeworkMobileCard : HomeworkCard}
        renderCardSkeleton={isPhone ? HomeworkMobileCardSkeleton : HomeworkCardSkeleton}
        isFilteredEmpty={hasSelection && total > 0 && rows.length === 0}
        addButtonText={t('homework.dialogs.createButton')}
        renderEmpty={() => (
          <NEmptyState
            surface="panel"
            icon={FEATURE_ICONS.homework}
            title={hasSelection ? t('emptyStates.filtered.title') : t('emptyStates.homework.title')}
            description={hasSelection ? t('emptyStates.filtered.description') : isFamily ? t('emptyStates.familyDescription') : t('emptyStates.homework.description')}
            action={addAction}
          />
        )}
        // Nothing for the chosen class or section is often what a teacher is about to change.
        renderFilteredEmpty={() => (
          <NEmptyState
            surface="panel"
            icon={FEATURE_ICONS.homework}
            title={t('emptyStates.filtered.title')}
            description={t('emptyStates.filtered.description')}
            action={addAction}
          />
        )}
        mode={isPhone ? 'cards' : desktopMode}
        onModeChange={setDesktopMode}
        dynamicHeight={true}
      />
      </HomeworkToneContext.Provider>}
      {viewing && <HomeworkMobileDetailsDialog key={viewing.id} homework={viewing} onClose={() => setViewing(null)} />}
      {followUp && (
        <HomeworkCompletionSheet key={followUp.id} homework={followUp} onClose={() => setFollowUp(null)} />
      )}
    </div>
  );
}

export default HomeworkTable;
