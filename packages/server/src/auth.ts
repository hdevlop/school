import { and, type SQL } from 'drizzle-orm';
import { QueryBuilder } from 'drizzle-orm/pg-core';
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
  Owned, ownershipCondition, join, where,
  ScopeContext, OwnershipToken, type ScopeResult,
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

type OwnershipStep = ReturnType<typeof join> | ReturnType<typeof where>;
type RowRule = SQL | ((userId: string, role: string) => SQL);

class RowCondition {
  constructor(private readonly rules: RowRule[]) {}

  resolve(userId: string, role: string): SQL {
    return and(...this.rules.map((rule) => typeof rule === 'function' ? rule(userId, role) : rule))!;
  }
}

/**
 * A condition on the owned row itself, as a `.for()` step. After a join chain
 * it narrows the rows the chain reaches ("…and the alert is for parents"); on
 * its own it is the whole rule, for rows that belong to an audience rather
 * than to one linked person ("every published notice for parents"). A
 * function receives the signed-in user and the rule's role.
 */
export function when(...rules: RowRule[]): RowCondition {
  return new RowCondition(rules);
}

/**
 * najm-auth's token plus `when()` steps. A najm rule is one join chain that
 * ends at the user's id; a `when()` rule is still one najm rule in the token's
 * rule table, so `ownershipCondition()` ORs it with the other tokens as usual.
 */
export class SchoolOwnershipToken extends OwnershipToken {
  override for(role: string, ...steps: Array<OwnershipStep | RowCondition>): this {
    const chain = steps.filter((step): step is OwnershipStep => !(step instanceof RowCondition));
    const conditions = steps.filter((step): step is RowCondition => step instanceof RowCondition);
    if (!conditions.length) return super.for(role, ...chain);
    if (chain.length) super.for(role, ...chain);

    const rules = this.getRules();
    const joined = chain.length ? rules[role] : undefined;
    const rule = (userId: string, query: any): ScopeResult => {
      const narrowing = and(...conditions.map((condition) => condition.resolve(userId, role)));
      if (!joined) return { query, condition: narrowing };
      const scoped = joined(userId, query);
      return { query: scoped.query, condition: and(scoped.condition, narrowing) };
    };
    rules[role] = rule;
    if (this.getRules()[role] !== rule) {
      throw new Error('najm-auth no longer returns its live rule table; when() rules need another home');
    }
    return this;
  }
}

/** najm-auth's `own` with School's school-wide roles and `when()` steps. */
export function own(table: unknown): SchoolOwnershipToken {
  return new SchoolOwnershipToken(table, { adminRoles: [...SCHOOL_WIDE_ROLES] });
}

/**
 * The ids of `token`'s rows that a `role` user owns, as a subquery for a
 * `when()` condition: "one of the classes this parent's children are in".
 */
export function ownedIds(token: OwnershipToken, role: string, userId: string) {
  const rows = new QueryBuilder().select({ id: token.table.id }).from(token.table);
  const { query, condition } = token.applyScopeSplit(userId, role, rows);
  return condition === null ? query : query.where(condition);
}
