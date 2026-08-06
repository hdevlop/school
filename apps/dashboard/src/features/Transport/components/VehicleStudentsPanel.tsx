'use client'

import { useEffect } from 'react'
import { UserPlus, UserMinus, Bus, Users, MapPin } from 'lucide-react'
import { Badge, NButton, NForm, NSkeleton, useDialog } from 'najm-kit';
import { useStudentRoutes } from '../hooks/useStudentRoutes'
import { useStudents } from '@/features/Students/hooks/useStudents'
import { FormInput } from 'najm-kit';
import { z } from 'zod'
import { toast } from 'sonner'
import { LocationField } from '@/components/location/LocationField'
import { useActiveForm } from '@/hooks/useActiveForm'

const assignSchema = z.object({
  studentId: z.string().min(1, 'Student is required'),
  pickupLocation: z.string().max(500).optional(),
  pickupPlaceId: z.string().max(255).optional().nullable(),
  pickupLatitude: z.number().min(-90).max(90).optional().nullable(),
  pickupLongitude: z.number().min(-180).max(180).optional().nullable(),
  dropoffLocation: z.string().max(500).optional(),
  dropoffPlaceId: z.string().max(255).optional().nullable(),
  dropoffLatitude: z.number().min(-90).max(90).optional().nullable(),
  dropoffLongitude: z.number().min(-180).max(180).optional().nullable(),
  notes: z.string().max(1000).optional(),
})

const AssignStudentFields = ({ students }) => {
  const form = useActiveForm()
  const studentId = form.watch('studentId')
  const selectedStudent = (students || []).find((student: any) => student.id === studentId)

  useEffect(() => {
    if (!selectedStudent || form.getValues('pickupLocation')) return
    form.setValue('pickupLocation', selectedStudent.address || '')
    form.setValue('pickupPlaceId', selectedStudent.addressPlaceId || null)
    form.setValue('pickupLatitude', selectedStudent.addressLatitude ?? null)
    form.setValue('pickupLongitude', selectedStudent.addressLongitude ?? null)
  }, [form, selectedStudent])

  const studentOptions = (students || []).map((s: any) => ({
    value: s.id,
    label: `${s.name} (${s.studentCode})`,
  }))

  return (
    <>
      <FormInput
        name="studentId"
        type="combobox"
        formLabel="Student"
        placeholder="Select student…"
        searchPlaceholder="Search students…"
        emptyMessage="No student found"
        items={studentOptions}
        required
      />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <LocationField
          form={form}
          names={{ address: 'pickupLocation', placeId: 'pickupPlaceId', latitude: 'pickupLatitude', longitude: 'pickupLongitude' }}
          label="Pickup location"
          placeholder="e.g. Rue Ibn Battouta"
          compact
        />
        <LocationField
          form={form}
          names={{ address: 'dropoffLocation', placeId: 'dropoffPlaceId', latitude: 'dropoffLatitude', longitude: 'dropoffLongitude' }}
          label="Drop-off location"
          placeholder="e.g. School gate"
          compact
        />
      </div>
      <FormInput name="notes" type="textarea" formLabel="Notes" placeholder="Optional notes…" />
    </>
  )
}

const AssignStudentForm = ({ students, vehicleId }) => {
  const { pop } = useDialog()

  return (
    <NForm
      id="assign-student-form"
      schema={assignSchema}
      defaultValues={{
        studentId: '',
        pickupLocation: '',
        pickupPlaceId: null,
        pickupLatitude: null,
        pickupLongitude: null,
        dropoffLocation: '',
        dropoffPlaceId: null,
        dropoffLatitude: null,
        dropoffLongitude: null,
        notes: '',
      }}
      onSubmit={(data) => pop({ ...data, vehicleId })}
    >
      <AssignStudentFields students={students} />
    </NForm>
  )
}

interface VehicleStudentsPanelProps {
  vehicle: any
}

export const VehicleStudentsPanel = ({ vehicle }: VehicleStudentsPanelProps) => {
  const { routes = [], isLoading, assignStudent, isAssigning, unassignStudent } = useStudentRoutes({ vehicleId: vehicle.id })
  const { students } = useStudents()
  const { openDialog } = useDialog()

  const assignedStudentIds = new Set((routes as any[]).map((r: any) => r.studentId))
  const availableStudents = (students || []).filter((s: any) => !assignedStudentIds.has(s.id))

  const handleAssign = () => {
    openDialog({
      title: `Assign Student to ${vehicle.name}`,
      children: <AssignStudentForm students={availableStudents} vehicleId={vehicle.id} />,
      width: 'lg',
      primaryButton: {
        form: 'assign-student-form',
        text: 'Assign & Create Transport Fee',
        loading: isAssigning,
        onClick: async (data: any) => {
          await assignStudent(data)
        },
      },
    })
  }

  const handleUnassign = (route: any) => {
    openDialog({
      title: 'Unassign Student',
      children: (
        <p className="text-sm text-muted-foreground">
          Remove <strong>{route.student?.name}</strong> from <strong>{vehicle.name}</strong>?
          Their transport fee will remain but no new installments will be generated.
        </p>
      ),
      primaryButton: {
        text: 'Unassign',
        variant: 'destructive',
        loading: false,
        onClick: async () => {
          await unassignStudent(route.id)
          toast.success(`${route.student?.name} unassigned from ${vehicle.name}`)
        },
      },
    })
  }

  const occupancy = routes.length
  const capacity = vehicle.capacity || 0
  const pct = capacity > 0 ? Math.round((occupancy / capacity) * 100) : 0

  return (
    <div className="flex flex-col gap-4 p-4 border rounded-xl bg-white">
      {/* Vehicle header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
            <Bus className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="font-semibold text-sm">{vehicle.name}</p>
            <p className="text-xs text-muted-foreground">{vehicle.licensePlate} · {vehicle.type}</p>
          </div>
        </div>
        <Badge
          variant="outline"
          className={`text-xs ${pct >= 100 ? 'border-red-300 text-red-700 bg-red-50' : pct >= 80 ? 'border-amber-300 text-amber-700 bg-amber-50' : 'border-green-300 text-green-700 bg-green-50'}`}
        >
          <Users className="w-3 h-3 mr-1" />
          {occupancy}/{capacity}
        </Badge>
      </div>

      {/* Student list */}
      {isLoading ? (
        <div className="flex flex-col gap-1.5">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="rounded-lg border bg-gray-50/50 px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <NSkeleton className="h-4 w-36" />
                  <NSkeleton className="h-3 w-20" />
                  <NSkeleton className="h-3 w-48" />
                </div>
                <NSkeleton className="h-7 w-7 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      ) : routes.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">No students assigned</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {(routes as any[]).map((route: any) => (
            <div key={route.id} className="flex items-center justify-between rounded-lg border px-3 py-2 bg-gray-50/50 text-sm">
              <div className="min-w-0">
                <p className="font-medium truncate">{route.student?.name}</p>
                <p className="text-xs text-muted-foreground font-mono">{route.student?.studentCode}</p>
                {(route.pickupLocation || route.dropoffLocation) && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 shrink-0" />
                    {[route.pickupLocation, route.dropoffLocation].filter(Boolean).join(' → ')}
                  </p>
                )}
              </div>
              <NButton
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive shrink-0"
                onClick={() => handleUnassign(route)}
                title="Unassign"
              >
                <UserMinus className="w-3.5 h-3.5" />
              </NButton>
            </div>
          ))}
        </div>
      )}

      {/* Assign button */}
      <NButton
        variant="outline"
        size="sm"
        className="w-full"
        onClick={handleAssign}
        disabled={isAssigning || (capacity > 0 && occupancy >= capacity)}
      >
        <UserPlus className="w-4 h-4 mr-2" />
        Assign Student
      </NButton>
    </div>
  )
}
