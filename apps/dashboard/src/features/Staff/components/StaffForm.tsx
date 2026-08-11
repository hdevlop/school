"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentProps, ComponentType, ReactNode } from 'react';
import { z } from 'zod';
import { Activity, Award, Briefcase, Calendar, Car, CreditCard, FileText, Hash, HeartPulse, IdCard, Loader2, Mail, MapPin, Phone, User, UserRound, Wallet } from 'lucide-react';
import { FormInput, NFormSectionHeader as FormSectionHeader, WizardForm, useDialog } from 'najm-kit';
import type { StepConfig } from 'najm-kit';
import { useTranslation } from '@/hooks/useLanguage';
import { useClasses } from '@/features/Classes/hooks/useClasses';
import { useStaffRoles } from '../hooks/useStaffRoles';
import { useCycles } from '@/features/Cycles/hooks/useCycles';
import { useZones } from '../hooks/useZones';
import { useVehicles } from '../hooks/useVehicles';
import { getStaffAvatar } from '../utils/staffAvatar';
import { buildFill, isDevFill, pick } from '@/lib/devFill';

type StaffWizardFormProps = Omit<ComponentProps<typeof WizardForm>, 'submitLabel'> & {
  submitLabel?: ReactNode;
};

const StaffWizardForm = WizardForm as ComponentType<StaffWizardFormProps>;

const STAFF_FORM_EXCLUDED_ROLES = new Set(['teacher']);
const STAFF_ASSIGNMENT_ROLES = new Set(['assistant', 'cleaner', 'accountant', 'security', 'driver', 'busAssistant']);
const STAFF_NON_ASSIGNMENT_ROLE_PREFERENCE = ['secretary', 'receptionist', 'principal', 'librarian', 'itSupport', 'other'];
const STAFF_STATUS_VALUES = ['active', 'inactive', 'onLeave', 'suspended', 'terminated'] as const;
const EMPLOYMENT_TYPE_VALUES = ['fullTime', 'partTime', 'contract', 'temporary'] as const;
const COMPENSATION_MODE_VALUES = ['monthly', 'hourly'] as const;
const SHIFT_VALUES = ['morning', 'afternoon', 'evening', 'fullDay'] as const;

const staffRoleHasAssignments = (role?: string) => !role || STAFF_ASSIGNMENT_ROLES.has(role);
const dateInput = (date = new Date()) => date.toISOString().split('T')[0];
const optionalNumber = <T extends z.ZodNumber | z.ZodCoercedNumber>(schema: T) => z.preprocess(
  (value) => (value === '' || value === null ? undefined : value),
  schema.optional()
);
const requiredNumber = <T extends z.ZodNumber | z.ZodCoercedNumber>(schema: T, message: string) => z.preprocess(
  (value) => (value === '' || value === null ? undefined : value),
  schema.refine((value) => value !== undefined, message)
);
const optionalString = (schema: z.ZodString) => schema.optional().or(z.literal(''));
const dateString = z.string().regex(
  /^(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}|\d{2}-\d{2}-\d{2}|\d{2}-\d{2}-\d{4})$/,
  'Date must be in YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY, DD-MM-YY, or DD-MM-YYYY format'
);
const optionalDateString = dateString.optional().or(z.literal(''));
const phoneString = z.string().regex(/^[\+]?[1-9][\d]{0,15}$/, 'Invalid phone number');

const ROLE_PROFILE_FIELDS = {
  driver: ['licenseNumber', 'licenseType', 'licenseExpiry', 'yearsOfExperience', 'notes'],
} as const;

const staffPersonalSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),
  employeeCode: optionalString(z.string().min(1, 'Employee code is required').max(50, 'Employee code too long')),
  cin: z.string().min(8, 'CIN must be at least 8 characters').max(20, 'CIN too long'),
  gender: z.enum(['M', 'F']).optional(),
  phone: phoneString,
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().min(1, 'Address is required').max(500, 'Address too long'),
  medicalConditions: z.string().max(1000, 'Medical conditions description too long').optional().nullable().or(z.literal('')),
  image: z.string().nullish(),
  role: z.string().min(1, 'Role is required'),
  status: z.enum(STAFF_STATUS_VALUES),
  emergencyContact: optionalString(z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name too long')),
  emergencyPhone: optionalString(phoneString),
});

const staffEmploymentSchema = z.object({
  department: optionalString(z.string().max(100, 'Department too long')),
  employmentType: z.enum(EMPLOYMENT_TYPE_VALUES).optional().or(z.literal('')),
  compensationMode: z.enum(COMPENSATION_MODE_VALUES).default('monthly'),
  salary: requiredNumber(z.coerce.number().positive('Salary must be positive'), 'Salary is required'),
  hourlyRate: optionalNumber(z.coerce.number().positive()),
  workloadHours: optionalNumber(z.coerce.number().int().min(0)),
  shift: z.enum(SHIFT_VALUES).optional().or(z.literal('')),
  hireDate: dateString,
  endDate: optionalDateString,
  bankAccount: optionalString(z.string().max(100, 'Bank account too long')),
});

const staffAssignmentSchema = z.object({
  zoneId: z.string().optional().or(z.literal('')),
  classId: z.string().optional().or(z.literal('')),
  sectionId: z.string().optional().or(z.literal('')),
  cycleId: z.string().optional().or(z.literal('')),
  vehicleId: z.string().optional().or(z.literal('')),
  startDate: optionalDateString,
  endDate: optionalDateString,
  notes: optionalString(z.string().max(1000, 'Notes too long')),
});

const staffAssignmentsSchema = z.object({
  assignments: z.array(staffAssignmentSchema).optional(),
  // Assistant-only: many classes selected in a single multiselect (expanded on submit).
  classIds: z.array(z.string()).optional(),
});

const driverDetailsSchema = z.object({
  licenseNumber: optionalString(z.string().min(5, 'License number must be at least 5 characters').max(20, 'License number too long')),
  licenseType: optionalString(z.string().max(10, 'License type too long')),
  licenseExpiry: optionalDateString,
  yearsOfExperience: optionalNumber(z.coerce.number().int().min(0)),
  notes: optionalString(z.string().max(1000, 'Notes too long')),
});

const staffFullSchema = staffPersonalSchema
  .merge(staffEmploymentSchema)
  .merge(staffAssignmentsSchema)
  .merge(driverDetailsSchema)
  .superRefine((data, ctx) => {
    if (data.compensationMode === 'hourly') {
      if (!(Number(data.hourlyRate) > 0)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['hourlyRate'], message: 'Hourly rate is required for hourly staff' });
      }
      if (!(Number(data.workloadHours) > 0)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['workloadHours'], message: 'Workload hours are required for hourly staff' });
      }
    }
    if (data.role === 'driver') {
      if (!data.licenseNumber) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['licenseNumber'], message: 'License number is required' });
      if (!data.licenseType) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['licenseType'], message: 'License type is required' });
      if (!data.licenseExpiry) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['licenseExpiry'], message: 'License expiry is required' });
    }
    if (data.role === 'cleaner' && data.assignments?.some((item) => !item.zoneId)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['assignments', 0, 'zoneId'], message: 'Zone is required' });
    }
    if (data.role === 'assistant' && !(data.classIds?.length)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['classIds'], message: 'Select at least one class' });
    }
    if (data.role === 'busAssistant' && data.assignments?.some((item) => !item.vehicleId)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['assignments', 0, 'vehicleId'], message: 'Vehicle is required' });
    }
    if (data.role === 'accountant' && data.assignments?.some((item) => !item.cycleId)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['assignments', 0, 'cycleId'], message: 'Cycle is required' });
    }
    if (data.role === 'security' && data.assignments?.some((item) => !item.zoneId)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['assignments', 0, 'zoneId'], message: 'Zone is required' });
    }
    if (data.role === 'driver' && data.assignments?.some((item) => !item.vehicleId)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['assignments', 0, 'vehicleId'], message: 'Vehicle is required' });
    }
  });

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
    payload.assignments = payload.assignments
      .map((assignment) => Object.fromEntries(
        Object.entries(assignment).filter(([key, value]) => (
          value !== undefined
          && value !== ''
          && (data.role !== 'driver' || (key !== 'startDate' && key !== 'endDate'))
        ))
      ))
      .filter((assignment) => Object.keys(assignment).length > 0);
    if (payload.assignments.length === 0) delete payload.assignments;
  }

  return payload;
};

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
  assignments: staff?.assignments?.length ? staff.assignments : [{}],
  classIds: (staff?.assignments || []).map((assignment) => assignment.classId).filter(Boolean),
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
  const { activeStaffRoles } = useStaffRoles({ activeOnly: true });
  const { classes } = useClasses({ enabled: isDevFill && !staff?.id });
  const { cycles } = useCycles({ activeOnly: true, enabled: isDevFill && !staff?.id });
  const { zones } = useZones({ enabled: isDevFill && !staff?.id });
  const { vehicles } = useVehicles({ enabled: isDevFill && !staff?.id });

  useEffect(() => {
    setSelectedRole(defaultValues.role);
    setCurrentStep(1);
  }, [defaultValues.role, staff?.id]);

  const pickFillRole = useCallback(() => {
    if (staff?.id && defaultValues.role) return defaultValues.role;

    const roleCodes = (activeStaffRoles || [])
      .map((role) => role.code)
      .filter((code) => code && !STAFF_FORM_EXCLUDED_ROLES.has(code));
    const hasRole = (role: string) => roleCodes.length === 0 || roleCodes.includes(role);

    const assignmentRoleWithData = [
      { role: 'assistant', hasData: Boolean(classes?.length) },
      { role: 'cleaner', hasData: Boolean(zones?.length) },
      { role: 'security', hasData: Boolean(zones?.length) },
      { role: 'driver', hasData: Boolean(vehicles?.length) },
      { role: 'busAssistant', hasData: Boolean(vehicles?.length) },
      { role: 'accountant', hasData: Boolean(cycles?.length) },
    ].find(({ role, hasData }) => hasData && hasRole(role));

    if (assignmentRoleWithData) return assignmentRoleWithData.role;

    const nonAssignmentRole = STAFF_NON_ASSIGNMENT_ROLE_PREFERENCE.find(hasRole)
      || pick(roleCodes.filter((role) => !STAFF_ASSIGNMENT_ROLES.has(role)));

    return nonAssignmentRole || 'secretary';
  }, [activeStaffRoles, classes, cycles, defaultValues.role, staff?.id, vehicles, zones]);

  const buildAssignmentsForRole = useCallback((role: string) => {
    const startDate = dateInput();
    if (role === 'assistant') {
      const selectedClass: any = pick(classes || []);
      return {
        classIds: selectedClass?.id ? [selectedClass.id] : [],
        assignments: [{}],
      };
    }
    if (role === 'cleaner' || role === 'security') {
      const zone: any = pick(zones || []);
      return {
        classIds: [],
        assignments: [{ zoneId: zone?.id ?? '', startDate, endDate: '', notes: '' }],
      };
    }
    if (role === 'accountant') {
      const cycle: any = pick(cycles || []);
      return {
        classIds: [],
        assignments: [{ cycleId: cycle?.id ?? '', startDate, endDate: '', notes: '' }],
      };
    }
    if (role === 'driver') {
      const vehicle: any = pick(vehicles || []);
      return {
        classIds: [],
        assignments: [{ vehicleId: vehicle?.id ?? '', notes: '' }],
      };
    }
    if (role === 'busAssistant') {
      const vehicle: any = pick(vehicles || []);
      return {
        classIds: [],
        assignments: [{ vehicleId: vehicle?.id ?? '', startDate, endDate: '', notes: '' }],
      };
    }
    return { classIds: [], assignments: [{}] };
  }, [classes, cycles, vehicles, zones]);

  const fillAll = useCallback(() => {
    const role = pickFillRole();
    const assignments = buildAssignmentsForRole(role);
    const generated = buildFill(staffFullSchema, {
      id: staff?.id ?? '',
      role,
      status: 'active',
      employmentType: 'fullTime',
      compensationMode: 'monthly',
      shift: pick(SHIFT_VALUES) ?? 'fullDay',
      hireDate: dateInput(),
      endDate: '',
      hourlyRate: '',
      workloadHours: '',
      image: null,
    });

    const values = {
      ...defaultValues,
      ...generated,
      ...assignments,
      role,
      employeeCode: generated.employeeCode || `EMP${Date.now().toString().slice(-6)}`,
      image: staff?.image || null,
    };

    if (staff?.id) values.id = staff.id;
    else delete values.id;

    if (role !== 'driver') {
      values.licenseNumber = '';
      values.licenseType = '';
      values.licenseExpiry = '';
      values.yearsOfExperience = '';
      values.notes = '';
    }

    return values;
  }, [buildAssignmentsForRole, defaultValues, pickFillRole, staff?.id, staff?.image]);

  // The wizard's own dev tools own the F8 shortcut and the step reset. The
  // role is School's to apply: it decides which steps exist at all, and the
  // package cannot know that a filled field drives the step list.
  const devTools = useMemo(
    () => ({
      enabled: isDevFill,
      fill: () => {
        const values = fillAll();
        setSelectedRole(values.role);
        return values;
      },
    }),
    [fillAll],
  );

  const steps: StepConfig[] = useMemo(() => {
    const visibleSteps: StepConfig[] = [
      {
        id: 'personal',
        title: t('staff.form.personalInformation'),
        schema: staffPersonalSchema,
        fields: [...Object.keys(staffPersonalSchema.shape)],
        render: ({ form }) => <PersonalStep form={form} lockedRole={Boolean(staff?.id)} onRoleChange={setSelectedRole} />,
      },
      {
        id: 'details',
        title: t('staff.form.employmentInformation'),
        schema: staffEmploymentSchema.merge(driverDetailsSchema),
        // `role` is carried (not validated here) so the step can branch on it, e.g. driver license fields.
        fields: [...Object.keys(staffEmploymentSchema.shape), ...Object.keys(driverDetailsSchema.shape), 'role'],
        render: ({ form }) => <DetailsStep form={form} />,
      },
    ];

    if (showAssignmentsStep) {
      visibleSteps.push({
        id: 'assignments',
        title: t('staff.form.assignments'),
        schema: staffAssignmentsSchema,
        // `role` is carried (not validated here) so the step can show role-based assignment fields.
        fields: ['assignments', 'classIds', 'role'],
        render: ({ form }) => <AssignmentsStep form={form} />,
      });
    }

    return visibleSteps;
  }, [showAssignmentsStep, staff?.id, t]);

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
        schema={staffFullSchema}
        defaultValues={defaultValues}
        devTools={devTools}
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
  const gender = form.watch('gender');
  const role = form.watch('role');

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

  const defaultImage = getStaffAvatar(role, gender);

  return (
    <>
      <FormSectionHeader icon={UserRound} title={t('staff.form.personalInformation')} />
      <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-4">
        <div className="flex items-start justify-center">
          <FormInput
            name="image"
            type="image"
            formLabel={t('teachers.form.image')}
            showPreview={true}
            previewPosition="top"
            imageSize="xl"
            allowClear={true}
            defaultImage={defaultImage}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-2 gap-y-4">
          <FormInput name="name" type="text" formLabel={t('staff.table.name')} placeholder="Enter full name" icon={User} required />
          <FormInput name="employeeCode" type="text" formLabel={t('staff.table.employeeCode')} placeholder="Enter employee code" icon={Hash} />
          <FormInput name="cin" type="text" formLabel={t('staff.table.cin')} placeholder="Enter CIN" icon={IdCard} required />
          <FormInput name="gender" type="select" formLabel={t('staff.form.gender')} placeholder="Select gender" items={genderOptions} icon={UserRound} />
          <FormInput name="role" type="select" formLabel={t('staff.table.role')} placeholder="Select role" items={roleOptions} icon={Briefcase} required disabled={lockedRole} />
          <FormInput name="status" type="select" formLabel={t('staff.table.status')} placeholder="Select status" items={statusOptions} icon={Activity} required />
        </div>
      </div>

      <FormSectionHeader icon={Mail} title={t('parents.form.contactInformation')} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-2 gap-y-4">
        <FormInput name="email" type="text" formLabel={t('staff.form.email')} placeholder="Enter email" icon={Mail} />
        <FormInput name="phone" type="phone" formLabel={t('staff.table.phone')} placeholder="Enter phone number" icon={Phone} required />
        <FormInput name="emergencyContact" type="text" formLabel={t('staff.form.emergencyContactName')} placeholder="Enter contact name" icon={User} />
        <FormInput name="emergencyPhone" type="phone" formLabel={t('staff.form.emergencyPhone')} placeholder="Enter emergency phone" icon={Phone} />
        <FormInput name="address" type="textarea" formLabel={t('staff.form.address')} placeholder="Enter address" icon={MapPin} rows={2} required />
        <FormInput name="medicalConditions" type="textarea" formLabel="Medical Conditions" placeholder="List any medical conditions, allergies, or special needs..." icon={HeartPulse} rows={2} />
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
        <FormInput name="department" type="text" formLabel={t('staff.form.department')} placeholder="Enter department" icon={Briefcase} />
        <FormInput name="employmentType" type="select" formLabel={t('staff.form.employmentType')} placeholder="Select employment type" items={employmentTypeOptions} icon={Briefcase} />
        <FormInput name="compensationMode" type="select" formLabel={t('staff.form.compensationMode')} placeholder="Select compensation mode" items={compensationModeOptions} icon={Wallet} />
        <FormInput name="shift" type="select" formLabel={t('staff.form.shift')} placeholder="Select shift" items={shiftOptions} icon={Activity} />
        <FormInput name="hireDate" type="date" formLabel={t('staff.form.hireDate')} icon={Calendar} required />
        <FormInput name="endDate" type="date" formLabel={t('staff.form.endDate')} icon={Calendar} />
        <FormInput name="salary" type="number" formLabel={t('staff.table.salary')} placeholder="Enter salary" icon={Wallet} required />
        <FormInput name="hourlyRate" type="number" formLabel={t('staff.form.hourlyRate')} placeholder="Enter hourly rate" icon={Wallet} />
        <FormInput name="workloadHours" type="number" formLabel={t('staff.form.workloadHours')} placeholder="Enter monthly hours" icon={Calendar} />
        <FormInput name="bankAccount" type="text" formLabel={t('staff.form.bankAccount')} placeholder="Enter bank account" icon={CreditCard} />
      </div>

      {role === 'driver' && (
        <>
          <FormSectionHeader icon={Car} title={t('staff.form.driverLicense')} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-2 gap-y-4">
            <FormInput name="licenseNumber" type="text" formLabel={t('drivers.form.licenseNumber')} placeholder="Enter license number" icon={CreditCard} required />
            <FormInput name="licenseType" type="select" formLabel={t('drivers.form.licenseType')} placeholder="Select license type" items={licenseTypeOptions} icon={Car} required />
            <FormInput name="licenseExpiry" type="date" formLabel={t('drivers.form.licenseExpiry')} icon={Calendar} required />
            <FormInput name="yearsOfExperience" type="number" formLabel={t('drivers.form.yearsOfExperience')} placeholder="Years of experience" icon={Award} />
            <div className="md:col-span-2">
              <FormInput name="notes" type="textarea" formLabel={t('drivers.form.notes')} placeholder="Notes" icon={FileText} />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const AssignmentsStep = ({ form }) => {
  const { t, language } = useTranslation();
  const role = form.watch('role');
  const { classes } = useClasses({ enabled: role === 'assistant' });
  const { cycles } = useCycles({ activeOnly: true, enabled: role === 'accountant' });
  const { zones } = useZones({ enabled: role === 'cleaner' || role === 'security' });
  const { vehicles } = useVehicles({ enabled: role === 'driver' || role === 'busAssistant' });

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
          <FormInput name="classIds" type="multiselect" formLabel={t('staff.form.class')} placeholder={t('staff.form.class')} items={classOptions} icon={Briefcase} required />
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
              <FormInput name="assignments.0.vehicleId" type="select" formLabel={t('staff.form.vehicle')} placeholder={t('staff.form.vehicle')} items={vehicleOptions} icon={Car} required />
            )}
            {role === 'accountant' && (
              <FormInput name="assignments.0.cycleId" type="select" formLabel={t('staff.form.cycle')} placeholder={t('staff.form.cycle')} items={cycleOptions} icon={Briefcase} required />
            )}
            {role === 'driver' ? null : (
              <>
                <FormInput name="assignments.0.startDate" type="date" formLabel={t('staff.form.startDate')} icon={Calendar} />
                <FormInput name="assignments.0.endDate" type="date" formLabel={t('staff.form.endDate')} icon={Calendar} />
              </>
            )}
            <div className="md:col-span-2">
              <FormInput name="assignments.0.notes" type="textarea" formLabel={t('drivers.form.notes')} placeholder="Notes" icon={FileText} />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default StaffForm;
