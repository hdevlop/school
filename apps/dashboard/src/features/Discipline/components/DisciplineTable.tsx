'use client';

import { Eye, Pencil, ShieldAlert, Trash2 } from 'lucide-react';
import { useAuth } from 'najm-auth/client/react';
import { NPageHeader, NPageHeaderActions, NTable } from 'najm-kit';
import { useConfirmDelete } from '@/hooks/useConfirmDelete';
import { useTranslation } from '@/hooks/useLanguage';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';
import DisciplineCard from './DisciplineCard';
import DisciplineDetails from './DisciplineDetails';
import DisciplineForm from './DisciplineForm';
import ResolveDisciplineForm from './ResolveDisciplineForm';
import { useDiscipline } from '../hooks/useDiscipline';
import { useDisciplineTableColumns } from '../hooks/useDisciplineTableColumns';
import { useDisciplineTableFilters } from '../hooks/useDisciplineTableFilters';
import type { DisciplineIncident } from '../disciplineConstants';

export default function DisciplineTable() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const role = (user as any)?.role;
  const userId = (user as any)?.id;
  const isAdmin = role === 'admin';
  const columns = useDisciplineTableColumns();
  const filters = useDisciplineTableFilters();
  const { openDialog, confirmDelete } = useConfirmDelete();
  const {
    incidents, createIncident, updateIncident, deleteIncident, resolveIncident, reopenIncident,
    isDisciplineLoading, isCreating, isUpdating, isDeleting, isResolving, isReopening,
  } = useDiscipline();

  const canEdit = (incident: DisciplineIncident) => incident.status === 'open'
    && (isAdmin || (role === 'teacher' && incident.reportedBy === userId));

  const handleCreate = () => openDialog({
    title: t('discipline.dialogs.createTitle'),
    children: <DisciplineForm />,
    primaryButton: {
      form: 'discipline-form', text: t('discipline.dialogs.createButton'), loading: isCreating,
      onClick: async (data) => { await (createIncident as any)(data); },
    },
    secondaryButton: { text: t('common.cancel') },
  });

  const handleEdit = (incident: DisciplineIncident) => openDialog({
    title: t('discipline.dialogs.editTitle'),
    children: <DisciplineForm incident={incident} />,
    primaryButton: {
      form: 'discipline-form', text: t('discipline.dialogs.updateButton'), loading: isUpdating,
      onClick: async (data) => { await (updateIncident as any)(data); },
    },
    secondaryButton: { text: t('common.cancel') },
  });

  const handleResolve = (incident: DisciplineIncident) => openDialog({
    title: t('discipline.dialogs.resolveTitle'),
    description: t('discipline.dialogs.resolveDescription'),
    children: <ResolveDisciplineForm />,
    primaryButton: {
      form: 'resolve-discipline-form', text: t('discipline.dialogs.resolveButton'), loading: isResolving,
      onClick: async (data) => { await (resolveIncident as any)({ id: incident.id, ...data }); },
    },
    secondaryButton: { text: t('common.cancel') },
  });

  const handleReopen = (incident: DisciplineIncident) => openDialog({
    title: t('discipline.dialogs.reopenTitle'),
    description: t('discipline.dialogs.reopenDescription'),
    children: <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 text-sm">{t('discipline.dialogs.reopenWarning')}</div>,
    primaryButton: {
      text: t('discipline.dialogs.reopenButton'), loading: isReopening,
      onClick: async () => { await (reopenIncident as any)(incident.id); },
    },
    secondaryButton: { text: t('common.cancel') },
  });

  const handleView = (incident: DisciplineIncident) => openDialog({
    title: t('discipline.dialogs.viewTitle'),
    width: '4xl',
    children: (
      <DisciplineDetails
        incident={incident}
        canResolve={isAdmin}
        resolving={isResolving || isReopening}
        onResolve={() => handleResolve(incident)}
        onReopen={() => handleReopen(incident)}
      />
    ),
    showButtons: false,
  });

  const handleDelete = (incident: DisciplineIncident) => confirmDelete({
    itemName: incident.student?.name || t(`discipline.categories.${incident.category}`),
    confirmText: t('discipline.dialogs.deleteButton'),
    loading: isDeleting,
    onConfirm: async () => { await (deleteIncident as any)(incident.id); },
  });

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-2">
      <NPageHeader
        icon={ShieldAlert}
        title={t('navigation.discipline')}
        subtitle={t('discipline.table.count', { count: incidents?.length || 0 })}
      >
        <NPageHeaderActions><PageHeaderGlobalActions /></NPageHeaderActions>
      </NPageHeader>
      <NTable
        className="min-h-0 flex-1"
        data={incidents || []}
        columns={columns}
        filters={filters}
        loading={isDisciplineLoading}
        onCreate={handleCreate}
        onRowClick={handleView}
        menuButton
        menu={{
          row: (incident: DisciplineIncident) => [
            { label: t('common.view'), icon: Eye, onSelect: () => handleView(incident) },
            ...(canEdit(incident) ? [{ label: t('common.edit'), icon: Pencil, onSelect: () => handleEdit(incident) }] : []),
            ...(isAdmin ? [{ label: t('common.delete'), icon: Trash2, danger: true, separatorBefore: true, onSelect: () => handleDelete(incident) }] : []),
          ],
        }}
        renderCard={DisciplineCard as any}
        addButtonText={t('discipline.dialogs.createButton')}
        defaultMode="table"
        defaultSorting={[{ id: 'incidentAt', desc: true }]}
        dynamicHeight
      />
    </div>
  );
}
