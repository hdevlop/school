import {
  auth,
  isAuth,
  isAdmin,
  Can,
  defineRoles,
  AuthService,
  UserService,
  UserValidator,
  userStatusEnum,
  tokenStatusEnum,
  tokenTypeEnum,
  usersTable,
  tokensTable,
  rolesTable,
  permissionsTable,
  rolePermissionsTable,
  credentialSetupSessionsTable,
  credentialSetupRequirementsTable,
  own as najmOwn, Owned, ownershipCondition, join, where,
  ScopeContext, type OwnershipToken,
  Policy, CanList, CanRead, CanCreate, CanUpdate, CanDelete,
} from 'najm-auth';

// ============================================================================
// Re-exports
// ============================================================================

export { auth, isAuth, isAdmin, Can };
export { AuthService, UserService, UserValidator };
export {
  userStatusEnum,
  tokenStatusEnum,
  tokenTypeEnum,
  usersTable,
  tokensTable,
  rolesTable,
  permissionsTable,
  rolePermissionsTable,
  credentialSetupSessionsTable,
  credentialSetupRequirementsTable,
};

// Shared ownership engine from najm-auth; `own` below applies School's roles.
export { Owned, ownershipCondition, join, where, ScopeContext, Policy, CanList, CanRead, CanCreate, CanUpdate, CanDelete };

// ============================================================================
// App roles — defineRoles generates isAdmin, isPrincipal, isTeacher… + utilities
// ============================================================================

export const {
  ROLES,
  createGroupGuard,
  hasRole,
  isInGroup,
  isPrincipal,
  isAccounting,
  isTeacher,
  isStudent,
  isParent,
  isCounselor,
  isNurse,
  isSecretary,
  isLibrarian,
  isDriver,
  isAssistant,
  isAdmin: _isAppAdmin, // renamed — built-in isAdmin from najm-auth is used instead
} = defineRoles({
  ADMIN: 'admin',       // built-in najm-auth admin role — lets createGroupGuard include it
  PRINCIPAL: 'principal',
  ACCOUNTING: 'accounting',
  TEACHER: 'teacher',
  STUDENT: 'student',
  PARENT: 'parent',
  COUNSELOR: 'counselor',
  NURSE: 'nurse',
  SECRETARY: 'secretary',
  LIBRARIAN: 'librarian',
  DRIVER: 'driver',
  ASSISTANT: 'assistant',
});

// ============================================================================
// Group guards (HTTP layer)
// ============================================================================

export const isAdministrator = createGroupGuard(['PRINCIPAL', 'ADMIN']);
export const isFinancial = createGroupGuard(['ACCOUNTING', 'PRINCIPAL', 'ADMIN']);
export const isStaff = createGroupGuard([
  'ADMIN', 'PRINCIPAL', 'ACCOUNTING', 'TEACHER',
  'COUNSELOR', 'NURSE', 'SECRETARY', 'LIBRARIAN', 'ASSISTANT',
]);

// ============================================================================
// Ownership (repository reads)
// ============================================================================

/**
 * Roles whose reads of an owned resource are school-wide. Their route
 * permissions (`read:students`, …) still decide what they can reach.
 * Teacher, parent and student reads are limited by each resource's `.for()`
 * rules, and any other role — including one created later in the roles
 * screen — sees no owned rows until it is listed here or given a rule.
 */
export const SCHOOL_WIDE_ROLES: readonly string[] = [
  ROLES.ADMIN, ROLES.PRINCIPAL, ROLES.ACCOUNTING, ROLES.COUNSELOR,
  ROLES.NURSE, ROLES.SECRETARY, ROLES.LIBRARIAN, ROLES.DRIVER, ROLES.ASSISTANT,
];

/** najm-auth's `own`, with School's school-wide roles. */
export function own(table: unknown): OwnershipToken {
  return najmOwn(table, { adminRoles: [...SCHOOL_WIDE_ROLES] });
}
