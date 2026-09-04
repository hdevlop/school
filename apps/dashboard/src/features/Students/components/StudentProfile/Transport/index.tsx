'use client'

import { Bus, CalendarDays, History, MapPin, Pencil, RefreshCw, UserRound, UserRoundMinus } from 'lucide-react'
import { Badge, NButton, NSkeleton, useDialog } from 'najm-kit'
import { toast } from 'sonner'
import { useStudentRoutes } from '@/features/Transport/hooks/useStudentRoutes'
import { TransportAssignmentForm } from '@/features/Transport/components/TransportAssignmentForm'
import { useTranslation } from 'najm-i18n/react'

type Props = {
  studentId?: string
  student?: any
  isLoading?: boolean
}

export default function TransportTab({ studentId, student, isLoading: isStudentLoading }: Props) {
  const { t } = useTranslation()
  const { openDialog } = useDialog()
  const {
    routes,
    isLoading,
    assignStudent,
    updateRoute,
    reassignStudent,
    unassignStudent,
    isAssigning,
    isUpdating,
    isDeleting,
  } = useStudentRoutes({ studentId })

  const active = (routes || []).find((route: any) => route.status === 'active')
  const history = (routes || []).filter((route: any) => route.status !== 'active')

  const openAssignment = async (mode: 'assign' | 'edit' | 'reassign') => {
    const result = await openDialog({
      title: mode === 'assign'
        ? t('transport.profile.assignTitle')
        : mode === 'edit'
          ? t('transport.profile.editTitle')
          : t('transport.profile.changeTitle'),
      children: <TransportAssignmentForm student={student} assignment={active} lockVehicleId={mode === 'edit' ? active?.vehicleId : undefined} />,
      width: '3xl',
      primaryButton: {
        form: 'student-transport-assignment-form',
        text: mode === 'assign' ? t('transport.profile.assign') : t('common.save'),
        loading: isAssigning || isUpdating,
        onClick: async (data: any) => {
          if (mode === 'assign') await assignStudent(data)
          else if (mode === 'edit') await updateRoute({ ...data, id: active.id })
          else await reassignStudent({ ...data, id: active.id })
        },
      },
    })
    return result
  }

  const confirmUnassign = () => {
    openDialog({
      title: t('transport.profile.unassignTitle'),
      children: <p className="text-sm text-slate-600">{t('transport.profile.unassignDescription')}</p>,
      primaryButton: {
        text: t('transport.profile.unassign'),
        variant: 'destructive',
        loading: isDeleting,
        onClick: async () => {
          await unassignStudent(active.id)
          toast.success(t('transport.profile.unassigned'))
        },
      },
    })
  }

  if (isLoading || isStudentLoading) {
    return <div className="space-y-3"><NSkeleton className="h-28 w-full rounded-2xl" /><NSkeleton className="h-64 w-full rounded-2xl" /></div>
  }

  if (!active) {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm"><Bus className="h-7 w-7" /></div>
        <h3 className="mt-5 text-lg font-semibold text-slate-900">{t('transport.profile.noAssignment')}</h3>
        <p className="mt-2 max-w-md text-sm text-slate-600">{t('transport.profile.noAssignmentDescription')}</p>
        <NButton className="mt-5 gap-2" onClick={() => void openAssignment('assign')}><Bus className="h-4 w-4" />{t('transport.profile.assign')}</NButton>
      </div>
    )
  }

  const occupied = Number(active.vehicle?.activeStudentCount || 0)
  const capacity = Number(active.vehicle?.capacity || 0)

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 via-white to-amber-50 p-5 sm:flex-row sm:items-start">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm"><Bus className="h-6 w-6" /></div>
            <div>
              <div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-semibold text-slate-950">{active.vehicle?.name}</h3><Badge className="bg-emerald-100 text-emerald-700">{t('transport.profile.active')}</Badge></div>
              <p className="mt-1 text-sm text-slate-600">{active.vehicle?.licensePlate} · {active.vehicle?.type}</p>
              <p className="mt-2 flex items-center gap-2 text-sm text-slate-700"><UserRound className="h-4 w-4 text-slate-400" />{active.driver?.name || t('transport.form.unassignedDriver')}</p>
            </div>
          </div>
          <div className="rounded-xl border border-white bg-white/80 px-4 py-3 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t('transport.form.occupancy')}</p>
            <p className="mt-1 text-xl font-bold text-slate-900">{occupied || '—'} / {capacity}</p>
          </div>
        </div>

        <div className="grid gap-4 p-5 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 p-4">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500"><MapPin className="h-4 w-4 text-blue-600" />{t('transport.form.pickupLocation')}</p>
            <p className="mt-2 font-medium text-slate-900">{active.pickupLocation || t('transport.profile.noPickup')}</p>
            {active.pickupLatitude != null ? (
              <div className="relative mt-4 h-32 overflow-hidden rounded-xl border border-blue-100 bg-[linear-gradient(90deg,#e2e8f0_1px,transparent_1px),linear-gradient(#e2e8f0_1px,transparent_1px)] bg-[size:22px_22px]">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-emerald-50/50" />
                <MapPin className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-full fill-blue-600 text-blue-600 drop-shadow" />
              </div>
            ) : null}
          </div>
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t('transport.form.dropoffLocation')}</p>
              <p className="mt-2 font-medium text-slate-900">{active.dropoffLocation || t('transport.profile.schoolDefault')}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500"><CalendarDays className="h-4 w-4" />{t('transport.form.startDate')}</p>
              <p className="mt-2 font-medium text-slate-900">{active.assignmentDate}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4">
          <NButton variant="outline" size="sm" className="gap-2" onClick={() => void openAssignment('edit')}><Pencil className="h-4 w-4" />{t('transport.profile.editPickup')}</NButton>
          <NButton variant="outline" size="sm" className="gap-2" onClick={() => void openAssignment('reassign')}><RefreshCw className="h-4 w-4" />{t('transport.profile.changeBus')}</NButton>
          <NButton variant="outline" size="sm" className="gap-2 border-red-200 text-red-700 hover:bg-red-50" onClick={confirmUnassign}><UserRoundMinus className="h-4 w-4" />{t('transport.profile.unassign')}</NButton>
        </div>
      </div>

      {history.length > 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h4 className="flex items-center gap-2 font-semibold text-slate-900"><History className="h-4 w-4" />{t('transport.profile.history')}</h4>
          <div className="mt-3 divide-y divide-slate-100">
            {history.map((route: any) => (
              <div key={route.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                <div><p className="font-medium text-slate-800">{route.vehicle?.name}</p><p className="text-xs text-slate-500">{route.pickupLocation}</p></div>
                <p className="text-xs text-slate-500">{route.assignmentDate} → {route.unassignmentDate || '—'}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
