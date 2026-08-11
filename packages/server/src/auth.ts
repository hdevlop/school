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
  own, join, where,
  Owned, ScopeContext,
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

// Scoped ownership API
export { own, join, where, Owned, ScopeContext, Policy, CanList, CanRead, CanCreate, CanUpdate, CanDelete };

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
