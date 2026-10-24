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
  Owned, ownershipCondition, join, where, when, ownedIds, own as najmOwn,
  ScopeContext, OwnershipToken,
  Policy, CanList, CanRead, CanCreate, CanUpdate, CanDelete, PermissionGuard,
} from 'najm-auth';
import { composeGuards, createGuard } from 'najm-guard';

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
export { Owned, ownershipCondition, join, where, when, ownedIds, ScopeContext, Policy, CanList, CanRead, CanCreate, CanUpdate, CanDelete };
export type { OwnedWhere } from 'najm-auth';

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
  isSecretary,
  isDriver,
  isAssistant,
  isSupervisor,
  isAdmin: _isAppAdmin, // renamed — built-in isAdmin from najm-auth is used instead
} = defineRoles({
  ADMIN: 'admin',       // built-in najm-auth admin role — lets createGroupGuard include it
  PRINCIPAL: 'principal',
  ACCOUNTING: 'accounting',
  TEACHER: 'teacher',
  STUDENT: 'student',
  PARENT: 'parent',
  SECRETARY: 'secretary',
  DRIVER: 'driver',
  ASSISTANT: 'assistant',
  SUPERVISOR: 'supervisor', // surveillant général
});

// ============================================================================
// Group guards (HTTP layer)
// ============================================================================

const ADMINISTRATOR_ROLE_KEYS = ['PRINCIPAL', 'ADMIN'] as const;
export const isAdministrator = createGroupGuard([...ADMINISTRATOR_ROLE_KEYS]);
export const isAdministratorRole = (role?: string | null) => hasRole(role, ...ADMINISTRATOR_ROLE_KEYS);
export const isFinancial = createGroupGuard(['ACCOUNTING', 'PRINCIPAL', 'ADMIN']);
export const isStaff = createGroupGuard([
  'ADMIN', 'PRINCIPAL', 'ACCOUNTING', 'TEACHER',
  'SECRETARY', 'ASSISTANT', 'SUPERVISOR',
]);

// ============================================================================
// Ownership (repository reads)
// ============================================================================

const SCHOOL_WIDE_ROLE_KEYS = [
  'ADMIN', 'PRINCIPAL', 'ACCOUNTING', 'SECRETARY', 'DRIVER', 'ASSISTANT', 'SUPERVISOR',
] as const;

/**
 * Roles whose reads of an owned resource are school-wide. Their route
 * permissions (`read:students`, …) still decide what they can reach.
 * Teacher, parent and student reads are limited by each resource's `.for()`
 * rules, and any other role — including one created later in the roles
 * screen — sees no owned rows until it is listed here or given a rule.
 */
export const SCHOOL_WIDE_ROLES: readonly string[] = SCHOOL_WIDE_ROLE_KEYS.map((key) => ROLES[key]);

export const isSchoolWide = createGroupGuard([...SCHOOL_WIDE_ROLE_KEYS]);

/**
 * `Can(permission)` for a route that reads or writes owned rows without
 * ownership scoping — a bulk delete, a lookup by CIN, an unfiltered view. The
 * permission decides who may use it; the school-wide role keeps a teacher,
 * parent or student who is later granted it from reaching every row.
 */
const Permission = createGuard<string>(PermissionGuard);
export const CanSchoolWide = (permission: string) => composeGuards(isSchoolWide(), Permission(permission))();

/**
 * najm-auth's `own` with School's school-wide roles. Rules are join chains
 * ending at the user (`join`, `where`) and/or `when()` conditions on the owned
 * row; `ownedIds()` turns another token's rule into an id subquery.
 */
export function own(table: unknown): OwnershipToken {
  return najmOwn(table, { adminRoles: [...SCHOOL_WIDE_ROLES] });
}
