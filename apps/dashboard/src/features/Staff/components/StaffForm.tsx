"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentProps, ComponentType, ReactNode } from 'react';
import { Activity, Award, Briefcase, Calendar, Car, CreditCard, FileText, Hash, HeartPulse, IdCard, Loader2, Mail, MapPin, Phone, User, UserRound, Wallet } from 'lucide-react';
import { AvatarFormInput, FormInput as KitFormInput, NButton, NEmptyState, NErrorState, NFormSectionHeader as FormSectionHeader, WizardForm } from 'najm-kit';
import { useFormContext } from 'react-hook-form';
import { useDialog } from '@/shared/useDialog';
import type { StepConfig } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { COMPENSATION_MODE_VALUES, EMPLOYMENT_TYPE_VALUES, SHIFT_VALUES, STAFF_STATUS_VALUES } from '@sms/contracts';
import { useClasses } from '@/features/Classes/hooks/useClasses';
import { useStaffRoles } from '../hooks/useStaffRoles';
import { useCycles } from '@/features/Cycles/hooks/useCycles';
import { useZones } from '../hooks/useZones';
import { useVehicles } from '../hooks/useVehicles';
import { createStaffSchemas } from '../config/staffSchemas';
import { useBusinessDate } from '@/features/Settings/hooks/useSettings';
import { useVehicles as useManageVehicles } from '@/features/Vehicles/hooks/useVehicles';
import VehicleForm from '@/features/Vehicles/components/VehicleForm';
import { useViewerRole } from '@/features/Users/hooks/useViewerRole';

// WizardForm 3.6.3 owns its form and has no validation-mode option. Keep that
// owner and validate the existing controls on blur, then as errors are corrected.
const FormInput = (props: ComponentProps<typeof KitFormInput>) => {
  const form = useFormContext();
  const touched = useRef(false);
  const discrete = ['select', 'multiselect', 'date', 'switch'].includes(props.type);
  return (
    <div className="contents" onBlurCapture={(event) => {
      if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
      touched.current = true;
      void form.trigger(props.name);
    }}>
      <KitFormInput {...props} onChange={(value) => {
        props.onChange?.(value);
        if (discrete || touched.current || form.getFieldState(props.name).error) void form.trigger(props.name);
      }} />
    </div>
  );
};

type StaffWizardFormProps = Omit<ComponentProps<typeof WizardForm>, 'submitLabel'> & {
  submitLabel?: ReactNode;
};

const StaffWizardForm = WizardForm as ComponentType<StaffWizardFormProps>;

const STAFF_FORM_EXCLUDED_ROLES = new Set(['teacher']);
const STAFF_ASSIGNMENT_ROLES = new Set(['assistant', 'cleaner', 'accountant', 'security', 'driver', 'busAssistant']);

const staffRoleHasAssignments = (role?: string) => !role || STAFF_ASSIGNMENT_ROLES.has(role);

const ROLE_PROFILE_FIELDS = {
  driver: ['licenseNumber', 'licenseType', 'licenseExpiry', 'yearsOfExperience', 'notes'],
} as const;

const toStaffPayload = (data) => {
  const profileFields = ROLE_PROFILE_FIELDS[data.role] || [];
  const profile = {};
  const payload = { ...data };
  const emptyOptionalFields = [
    'employeeCode',
    'email',
    'medicalConditions',
    'department',
    'employmentType',
    'hourlyRate',
    'workloadHours',
    'shift',
    'endDate',
    'bankAccount',
    'emergencyContact',
    'emergencyPhone',
  ];

  for (const field of profileFields) {
    if (payload[field] !== undefined && payload[field] !== '') profile[field] = payload[field];
  }

  for (const fields of Object.values(ROLE_PROFILE_FIELDS)) {
    for (const field of fields) delete payload[field];
  }

  if (Object.keys(profile).length > 0) payload.profile = profile;
  if (!payload.id) delete payload.id;

  for (const field of emptyOptionalFields) {
    if (payload[field] === '' || payload[field] === undefined) delete payload[field];
  }

  // Assistant picks many classes in one multiselect; expand to one assignment row per class.
  if (data.role === 'assistant') {
    payload.assignments = (data.classIds || []).map((classId) => ({ classId }));
  }
  delete payload.classIds;

  if (!staffRoleHasAssignments(data.role)) {
    delete payload.assignments;
  }

  if (Array.isArray(payload.assignments)) {
    if (data.role === 'accountant') {
      payload.assignments = payload.assignments.filter((assignment) => assignment.cycleId);
    }
    payload.assignments = payload.assignments
      .map((assignment) => Object.fromEntries(
        Object.entries(assignment).filter(([key, value]) => (
          value !== undefined
          && value !== ''
          && (data.role !== 'driver' || (key !== 'startDate' && key !== 'endDate'))
        ))
      ))
      .filter((assignment) => Object.keys(assignment).length > 0);
    if (payload.assignments.length === 0 && !(payload.id && (data.role === 'assistant' || data.role === 'accountant'))) delete payload.assignments;
  }

  return payload;
};

// The form edits the current assignments; ended ones stay in the history the
// server keeps, and are neither shown here nor sent back.
const currentAssignments = (staff) => (staff?.assignments || []).filter((assignment) => assignment.current !== false);

const getStaffDefaultValues = (staff = null) => ({
  ...(staff?.id && { id: staff.id }),
  employeeCode: staff?.employeeCode || '',
  name: staff?.name || '',
  cin: staff?.cin || '',
  gender: staff?.gender || 'M',
  phone: staff?.phone || '',
  address: staff?.address || '',
  medicalConditions: staff?.medicalConditions || '',
  image: staff?.image || null,
  role: staff?.role || '',
  department: staff?.department || '',
  compensationMode: staff?.compensationMode || 'monthly',
  salary: staff?.salary || '',
  hourlyRate: staff?.hourlyRate || '',
  workloadHours: staff?.workloadHours || '',
  shift: staff?.shift || '',
  employmentType: staff?.employmentType || 'fullTime',
  hireDate: staff?.hireDate || new Date().toISOString().split('T')[0],
  endDate: staff?.endDate || '',
  status: staff?.status || 'active',
  bankAccount: staff?.bankAccount || '',
  emergencyContact: staff?.emergencyContact || '',
  emergencyPhone: staff?.emergencyPhone || '',
  email: staff?.email || '',
  licenseNumber: staff?.licenseNumber || '',
  licenseType: staff?.licenseType || '',
  licenseExpiry: staff?.licenseExpiry || '',
  yearsOfExperience: staff?.yearsOfExperience || '',
  notes: staff?.notes || '',
  assignments: currentAssignments(staff).length ? currentAssignments(staff) : [{}],
  classIds: currentAssignments(staff).map((assignment) => assignment.classId).filter(Boolean),
});

const StaffForm = ({ staff = null, onSubmitStaff }) => {
  const { pop } = useDialog();
  const { t } = useTranslation();
  const defaultValues = useMemo(() => getStaffDefaultValues(staff), [staff]);
  const [selectedRole, setSelectedRole] = useState(defaultValues.role);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submissionPromiseRef = useRef<Promise<unknown> | null>(null);
  const showAssignmentsStep = staffRoleHasAssignments(selectedRole);
  const { businessDate } = useBusinessDate();
  const schemas = useMemo(() => createStaffSchemas(t, businessDate), [t, businessDate]);

  useEffect(() => {
    setSelectedRole(defaultValues.role);
    setCurrentStep(1);
  }, [defaultValues.role, staff?.id]);

  const steps: StepConfig[] = useMemo(() => {
    const visibleSteps: StepConfig[] = [
      {
        id: 'personal',
        title: t('staff.form.personalInformation'),
        schema: schemas.personal,
        fields: [...Object.keys(schemas.personal.shape)],
        render: ({ form }) => <PersonalStep form={form} lockedRole={Boolean(staff?.id)} onRoleChange={setSelectedRole} />,
      },
      {
        id: 'details',
        title: t('staff.form.employmentInformation'),
        schema: schemas.details,
        // `role` is carried (not validated here) so the step can branch on it, e.g. driver license fields.
        fields: [...Object.keys(schemas.employment.shape), ...Object.keys(schemas.driverDetails.shape), 'role'],
        render: ({ form }) => <DetailsStep form={form} />,
      },
    ];

    if (showAssignmentsStep) {
      visibleSteps.push({
        id: 'assignments',
        title: t('staff.form.assignments'),
        schema: schemas.assignmentStep,
        // `role` is carried (not validated here) so the step can show role-based assignment fields.
        fields: ['assignments', 'classIds', 'role'],
        render: ({ form }) => <AssignmentsStep form={form} />,
      });
    }

    return visibleSteps;
  }, [schemas, showAssignmentsStep, staff?.id, t]);

  useEffect(() => {
    setCurrentStep((step) => Math.min(step, steps.length));
  }, [steps.length]);

  const handleSubmit = useCallback(async (data) => {
    if (submissionPromiseRef.current) {
      await submissionPromiseRef.current;
      return;
    }

    setIsSubmitting(true);
    const payload = toStaffPayload(data);
    const submission = Promise.resolve().then(() => onSubmitStaff(payload));
    submissionPromiseRef.current = submission;

    try {
      await submission;
      await pop();
    } catch (error) {
      submissionPromiseRef.current = null;
      setIsSubmitting(false);
      throw error;
    }
  }, [onSubmitStaff, pop]);

  return (
    <div className="h-full min-h-0" aria-busy={isSubmitting}>
      <StaffWizardForm
        steps={steps}
        schema={schemas.full}
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        currentStep={currentStep}
        onCurrentStepChange={setCurrentStep}
        className={isSubmitting ? 'pointer-events-none select-none' : undefined}
        classNames={{
          root: 'h-full min-h-0',
          step: 'pb-4',
          footer: 'sticky bottom-0 z-10 bg-background pt-3',
        }}
        nextLabel={t('common.next')}
        previousLabel={t('common.previous')}
        submitLabel={isSubmitting ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            {t('common.processing')}
          </span>
        ) : t('common.confirm')}
      />
    </div>
  );
};

const PersonalStep = ({ form, lockedRole, onRoleChange }) => {
  const { t, language } = useTranslation();
  const { activeStaffRoles } = useStaffRoles({ activeOnly: true });
  const role = form.watch('role');
  const needsVehicle = role === 'driver' || role === 'busAssistant';
  const { vehicles, isVehiclesLoading, isError: vehicleError } = useVehicles({ enabled: needsVehicle });

  useEffect(() => {
    onRoleChange?.(role);
  }, [onRoleChange, role]);

  const roleOptions = useMemo(() => {
    return (activeStaffRoles || [])
      .filter((role) => !STAFF_FORM_EXCLUDED_ROLES.has(role.code))
      .map((role) => ({
        value: role.code,
        label: role?.labels?.[language] || role.label || role.code,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [activeStaffRoles, language]);

  const genderOptions = [
    { value: 'M', label: t('common.male') },
    { value: 'F', label: t('common.female') },
  ];

  const statusOptions = STAFF_STATUS_VALUES
    .map((status) => ({ value: status, label: t(`staff.status.${status}`) }));

  return (
    <>
      <FormSectionHeader icon={UserRound} title={t('staff.form.personalInformation')} />
      <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-4">
        <AvatarFormInput
          name="image"
          formLabel={t('teachers.form.image')}
          radius="xl"
          allowClear
          previewStyle={{ width: 180, height: 200 }}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-2 gap-y-4">
          <FormInput name="name" type="text" formLabel={t('staff.table.name')} placeholder={t('staff.form.namePlaceholder')} icon={User} required />
          <FormInput name="employeeCode" type="text" formLabel={t('staff.table.employeeCode')} placeholder={t('staff.form.employeeCodePlaceholder')} icon={Hash} />
          <FormInput name="cin" type="text" formLabel={t('staff.table.cin')} placeholder={t('staff.form.cinPlaceholder')} icon={IdCard} required />
          <FormInput name="gender" type="select" formLabel={t('staff.form.gender')} placeholder={t('staff.form.genderPlaceholder')} items={genderOptions} icon={UserRound} />
          <FormInput name="role" type="select" formLabel={t('staff.table.role')} placeholder={t('staff.form.rolePlaceholder')} items={roleOptions} icon={Briefcase} required disabled={lockedRole} />
          <FormInput name="status" type="select" formLabel={t('staff.table.status')} placeholder={t('staff.form.statusPlaceholder')} items={statusOptions} icon={Activity} required />
        </div>
      </div>

      {needsVehicle && !isVehiclesLoading && !vehicleError && Array.isArray(vehicles) && vehicles.length === 0 && (
        <p role="status" className="rounded-lg border bg-muted/40 p-3 text-sm">{t('staff.form.vehicleSetupHint')}</p>
      )}

      <FormSectionHeader icon={Mail} title={t('parents.form.contactInformation')} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-2 gap-y-4">
        <FormInput name="email" type="text" formLabel={t('staff.form.email')} placeholder={t('staff.form.emailPlaceholder')} icon={Mail} />
        <FormInput name="phone" type="phone" formLabel={t('staff.table.phone')} placeholder={t('staff.form.phonePlaceholder')} icon={Phone} required />
        <FormInput name="emergencyContact" type="text" formLabel={t('staff.form.emergencyContactName')} placeholder={t('staff.form.emergencyContactNamePlaceholder')} icon={User} />
        <FormInput name="emergencyPhone" type="phone" formLabel={t('staff.form.emergencyPhone')} placeholder={t('staff.form.emergencyPhonePlaceholder')} icon={Phone} />
        <FormInput name="address" type="textarea" formLabel={t('staff.form.address')} placeholder={t('staff.form.addressPlaceholder')} icon={MapPin} rows={2} required />
        <FormInput name="medicalConditions" type="textarea" formLabel={t('staff.form.medicalConditions')} placeholder={t('staff.form.medicalConditionsPlaceholder')} icon={HeartPulse} rows={2} />
      </div>
    </>
  );
};

const DetailsStep = ({ form }) => {
  const { t } = useTranslation();
  const role = form.watch('role');

  const employmentTypeOptions = EMPLOYMENT_TYPE_VALUES
    .map((type) => ({ value: type, label: t(`staff.employmentTypes.${type}`) }));

  const compensationModeOptions = COMPENSATION_MODE_VALUES
    .map((mode) => ({ value: mode, label: t(`staff.compensationModes.${mode}`) }));

  const shiftOptions = SHIFT_VALUES
    .map((shift) => ({ value: shift, label: t(`staff.shifts.${shift}`) }));

  const licenseTypeOptions = [
    { value: 'A', label: 'A (Motorcycle)' },
    { value: 'B', label: 'B (Car)' },
    { value: 'C', label: 'C (Truck)' },
    { value: 'D', label: 'D (Bus)' },
  ];

  return (
    <div className="space-y-4">
      <FormSectionHeader icon={Briefcase} title={t('staff.form.employmentInformation')} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-2 gap-y-4">
        <FormInput name="department" type="text" formLabel={t('staff.form.department')} placeholder={t('staff.form.departmentPlaceholder')} icon={Briefcase} />
        <FormInput name="employmentType" type="select" formLabel={t('staff.form.employmentType')} placeholder={t('staff.form.employmentTypePlaceholder')} items={employmentTypeOptions} icon={Briefcase} />
        <FormInput name="compensationMode" type="select" formLabel={t('staff.form.compensationMode')} placeholder={t('staff.form.compensationModePlaceholder')} items={compensationModeOptions} icon={Wallet} />
        <FormInput name="shift" type="select" formLabel={t('staff.form.shift')} placeholder={t('staff.form.shiftPlaceholder')} items={shiftOptions} icon={Activity} />
        <FormInput name="hireDate" type="date" formLabel={t('staff.form.hireDate')} icon={Calendar} required />
        <FormInput name="endDate" type="date" formLabel={t('staff.form.endDate')} icon={Calendar} />
        <FormInput name="salary" type="number" formLabel={t('staff.table.salary')} placeholder={t('staff.form.salaryPlaceholder')} icon={Wallet} required />
        <FormInput name="hourlyRate" type="number" formLabel={t('staff.form.hourlyRate')} placeholder={t('staff.form.hourlyRatePlaceholder')} icon={Wallet} />
        <FormInput name="workloadHours" type="number" formLabel={t('staff.form.workloadHours')} placeholder={t('staff.form.workloadHoursPlaceholder')} icon={Calendar} />
        <FormInput name="bankAccount" type="text" formLabel={t('staff.form.bankAccount')} placeholder={t('staff.form.bankAccountPlaceholder')} icon={CreditCard} />
      </div>

      {role === 'driver' && (
        <>
          <FormSectionHeader icon={Car} title={t('staff.form.driverLicense')} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-2 gap-y-4">
            <FormInput name="licenseNumber" type="text" formLabel={t('drivers.form.licenseNumber')} placeholder={t('drivers.form.licenseNumberPlaceholder')} icon={CreditCard} required />
            <FormInput name="licenseType" type="select" formLabel={t('drivers.form.licenseType')} placeholder={t('drivers.form.licenseTypePlaceholder')} items={licenseTypeOptions} icon={Car} required />
            <FormInput name="licenseExpiry" type="date" formLabel={t('drivers.form.licenseExpiry')} icon={Calendar} required />
            <FormInput name="yearsOfExperience" type="number" formLabel={t('drivers.form.yearsOfExperience')} placeholder={t('drivers.form.yearsOfExperiencePlaceholder')} icon={Award} />
            <div className="md:col-span-2">
              <FormInput name="notes" type="textarea" formLabel={t('drivers.form.notes')} placeholder={t('drivers.form.notesPlaceholder')} icon={FileText} />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const AssignmentsStep = ({ form }) => {
  const { t, language } = useTranslation();
  const { push } = useDialog();
  const { can } = useViewerRole();
  const role = form.watch('role');
  const { classes } = useClasses({ enabled: role === 'assistant' });
  const { cycles } = useCycles({ activeOnly: true, enabled: role === 'accountant' });
  const { zones } = useZones({ enabled: role === 'cleaner' || role === 'security' });
  const { vehicles, isVehiclesLoading, isError: vehicleError, refetch: refetchVehicles, createVehicle, isCreating } = useManageVehicles({ enabled: role === 'driver' || role === 'busAssistant' });

  const handleCreateVehicle = () => push({
    title: t('vehicles.dialogs.createTitle'),
    children: <VehicleForm />,
    primaryButton: {
      form: 'vehicle-form',
      text: t('vehicles.dialogs.createButton'),
      loading: isCreating,
      onClick: async (data) => {
        const response = await createVehicle(data);
        await refetchVehicles();
        form.setValue('assignments.0.vehicleId', response.data.id, { shouldDirty: true, shouldValidate: true });
      },
    },
  });

  const zoneOptions = useMemo(() => (zones || []).map((zone) => ({
    value: zone.id,
    label: [zone.name, zone.building, zone.floor].filter(Boolean).join(' · '),
  })), [zones]);

  const vehicleOptions = useMemo(() => (vehicles || []).map((vehicle) => ({
    value: vehicle.id,
    label: [vehicle.name, vehicle.licensePlate].filter(Boolean).join(' · '),
  })), [vehicles]);

  const cycleOptions = useMemo(() => (cycles || []).map((cycle) => ({
    value: cycle.id,
    label: cycle?.labels?.[language] || cycle.name,
  })), [cycles, language]);

  const classOptions = useMemo(() => (classes || []).map((classItem) => ({
    value: classItem.id,
    label: `${classItem.name}${classItem.academicYear ? ` (${classItem.academicYear})` : ''}`,
  })), [classes]);

  return (
    <div className="space-y-4">
      {role === 'assistant' && (
        <>
          <FormSectionHeader icon={Briefcase} title={t('staff.form.assignments')} />
          <FormInput name="classIds" type="multiselect" formLabel={t('staff.form.class')} placeholder={t('staff.form.class')} items={classOptions} icon={Briefcase} />
          <p className="text-sm text-muted-foreground">{t('academic.staffAssignmentOptional')}</p>
        </>
      )}

      {(role === 'cleaner' || role === 'accountant' || role === 'security' || role === 'driver' || role === 'busAssistant') && (
        <>
          <FormSectionHeader icon={Briefcase} title={t('staff.form.assignments')} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-2 gap-y-4">
            {(role === 'cleaner' || role === 'security') && (
              <FormInput name="assignments.0.zoneId" type="select" formLabel={t('staff.form.zone')} placeholder={t('staff.form.zone')} items={zoneOptions} icon={MapPin} required />
            )}
            {(role === 'driver' || role === 'busAssistant') && (
              <div className="space-y-3 md:col-span-2">
                {vehicleError ? (
                  <NErrorState surface="panel" onRetry={() => void refetchVehicles()} />
                ) : isVehiclesLoading ? (
                  <p role="status" className="text-sm text-muted-foreground">{t('common.loading')}</p>
                ) : Array.isArray(vehicles) && vehicles.length === 0 ? (
                  <NEmptyState surface="panel" icon={Car} title={t('staff.form.noVehiclesTitle')}
                    description={t('staff.form.vehicleSetupHint')}
                    action={can('create:vehicles') ? (
                      <NButton type="button" onClick={handleCreateVehicle}>{t('vehicles.dialogs.createButton')}</NButton>
                    ) : <p className="text-sm">{t('staff.form.vehicleSetupAskAdmin')}</p>}
                  />
                ) : null}
                <FormInput name="assignments.0.vehicleId" type="select" formLabel={t('staff.form.vehicle')} placeholder={t('staff.form.vehicle')} items={vehicleOptions} icon={Car} required />
              </div>
            )}
            {role === 'accountant' && (
              <div className="space-y-2 md:col-span-2">
                <FormInput name="assignments.0.cycleId" type="select" formLabel={t('staff.form.cycle')} placeholder={t('staff.form.cycle')} items={cycleOptions} icon={Briefcase} />
                <p className="text-sm text-muted-foreground">{t('academic.accountantAssignmentOptional')}</p>
              </div>
            )}
            {role === 'driver' ? null : (
              <>
                <FormInput name="assignments.0.startDate" type="date" formLabel={t('staff.form.startDate')} icon={Calendar} />
                <FormInput name="assignments.0.endDate" type="date" formLabel={t('staff.form.endDate')} icon={Calendar} />
              </>
            )}
            <div className="md:col-span-2">
              <FormInput name="assignments.0.notes" type="textarea" formLabel={t('drivers.form.notes')} placeholder={t('drivers.form.notesPlaceholder')} icon={FileText} />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default StaffForm;
