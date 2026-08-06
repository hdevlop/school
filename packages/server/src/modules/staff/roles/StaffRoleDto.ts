import { z } from 'zod';

const codeField = z
  .string()
  .min(1, 'Code is required')
  .max(50, 'Code too long');

const normalizedCodeField = codeField
  .regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, 'Code must be alphanumeric (camelCase or snake_case)');

const labelField = z
  .string()
  .min(1, 'Label is required')
  .max(100, 'Label too long');

const labelsField = z
  .record(z.string(), z.string().min(1))
  .nullable()
  .optional();

const categoryField = z
  .string()
  .max(50, 'Category too long')
  .optional()
  .nullable();

const sortOrderField = z.number().int().min(0).optional();

const activeField = z.boolean().optional();

const createStaffRoleBase = z.object({
  code: codeField,
  label: labelField,
  labels: labelsField,
  category: categoryField,
  sortOrder: sortOrderField,
  active: activeField,
  // Create a linked RBAC role granting app access (plan §5).
  createAccessRole: z.boolean().optional(),
  permissions: z.array(z.string().min(1)).optional(),
});

const updateStaffRoleBase = z.object({
  label: labelField.optional(),
  labels: labelsField,
  category: categoryField,
  sortOrder: sortOrderField,
  active: activeField,
});

export const createStaffRoleDto = createStaffRoleBase;
export const updateStaffRoleDto = updateStaffRoleBase;

export const staffRoleCodeParam = z.object({ code: normalizedCodeField });

export type CreateStaffRoleDto = z.infer<typeof createStaffRoleDto>;
export type UpdateStaffRoleDto = z.infer<typeof updateStaffRoleDto>;
