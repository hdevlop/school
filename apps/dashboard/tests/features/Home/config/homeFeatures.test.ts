import { describe, expect, it } from 'bun:test';
import { matchPermission } from 'najm-auth/client';
import { createHomeCards, hasFeaturePermission } from '@/features/Home/config/homeFeatures';
import { createSidebarItems } from '@/shared/schoolNavigation';
import type { PageViewer } from '@/shared/pageAccess';

const t = (key: string) => key;
const viewer = (role: string, permissions: string[]): PageViewer => ({
  role, can: (permission) => matchPermission(permissions, permission),
});

describe('feature permissions', () => {
  it('does not turn cosmetic sidebar grants into Home feature access', () => {
    expect(hasFeaturePermission(['sidebar:fees', 'sidebar:configured'], ['fees'])).toBe(false);
    const permissions = ['sidebar:fees', 'sidebar:configured'];
    expect(createHomeCards(t, viewer('accounting', permissions), permissions).some((card) => card.id === '/fees')).toBe(false);
  });
  it.each(['read', 'create', 'update', 'delete', 'manage'])('shows a feature with only its %s grant', (action) => {
    expect(hasFeaturePermission([`${action}:students`], ['students'])).toBe(true);
  });

  it('accepts a permission for any resource in a feature', () => {
    expect(hasFeaturePermission(['create:payments'], ['fees', 'payments', 'installments'])).toBe(true);
  });

  it('uses Najm action, resource, and full wildcard semantics', () => {
    expect(hasFeaturePermission(['read:*'], ['students'])).toBe(true);
    expect(hasFeaturePermission(['*:students'], ['students'])).toBe(true);
    expect(hasFeaturePermission(['*:*'], ['students'])).toBe(true);
    expect(hasFeaturePermission(['read:student'], ['students'])).toBe(false);
    expect(hasFeaturePermission(['manage:system'], ['students'])).toBe(false);
  });

  it('hides features with no matching grant and ignores malformed grants', () => {
    expect(hasFeaturePermission([], ['students'])).toBe(false);
    expect(hasFeaturePermission(['read:teachers', 'students', ':students', 'read:'], ['students'])).toBe(false);
  });
});

describe('Home cards', () => {
  it('uses permissions for a new role without adding it to a role list', () => {
    const permissions = ['read:students', 'update:alerts'];
    const cards = createHomeCards(t, viewer('custom-role', permissions), permissions);
    expect(cards.map((card) => card.id).sort()).toEqual(['/alerts', '/insurance', '/notifications', '/students']);
    expect(cards.find((card) => card.id === '/students')?.accessible).toBe(true);
    expect(cards.find((card) => card.id === '/alerts')?.accessible).toBe(false);
    // The register lists the whole school, so a role outside SCHOOL_WIDE sees it locked.
    expect(cards.find((card) => card.id === '/insurance')?.accessible).toBe(false);
  });

  it('keeps a create-only card visible without opening a page its guard denies', () => {
    const permissions = ['create:students'];
    const cards = createHomeCards(t, viewer('custom-role', permissions), permissions);
    expect(cards.find((card) => card.id === '/students')).toMatchObject({ accessible: false });
  });

  it('shows Fees from a payment-only grant while preserving list access', () => {
    const permissions = ['create:payments'];
    expect(createHomeCards(t, viewer('accounting', permissions), permissions).find((card) => card.id === '/fees')).toMatchObject({ accessible: false });
  });

  it('opens Fees with its list permission while preserving school-wide access', () => {
    const permissions = ['read:fees', 'create:payments'];
    expect(createHomeCards(t, viewer('accounting', permissions), permissions).find((card) => card.id === '/fees')?.accessible).toBe(true);
    expect(createHomeCards(t, viewer('parent', permissions), permissions).find((card) => card.id === '/fees')?.accessible).toBe(false);
  });

  it('shows all resource cards to a wildcard administrator with unique destinations', () => {
    const cards = createHomeCards(t, viewer('admin', ['*:*']), ['*:*']);
    expect(cards.every((card) => card.accessible)).toBe(true);
    expect(new Set(cards.map((card) => card.id)).size).toBe(cards.length);
    expect(cards.map((card) => card.id)).toEqual(expect.arrayContaining(['/dashboard', '/staff', '/fees', '/grades', '/settings']));
  });

  it('offers no link to the disabled visit-request and public-page screens', () => {
    // Both routes render notFound() since 4429ad5; a card would open a 404.
    const ids = createHomeCards(t, viewer('admin', ['*:*']), ['*:*']).map((card) => card.id);
    expect(ids).not.toContain('/visit-requests');
    expect(ids).not.toContain('/public-page');
  });

  it('shows personal labels and permitted academic cards to family accounts', () => {
    const permissions = ['read:students', 'read:grades', 'read:subjects'];
    const cards = createHomeCards(t, viewer('parent', permissions), permissions);
    expect(cards.find((card) => card.id === '/students')?.label).toBe('navigation.myChildren');
    expect(cards.map((card) => card.id)).toEqual(expect.arrayContaining(['/grades', '/subjects']));
    expect(cards.some((card) => card.id === '/dashboard')).toBe(false);
  });

  it('keeps the inbox usable for an account without feature permissions', () => {
    expect(createHomeCards(t, viewer('custom-role', []), []).map((card) => card.id)).toEqual(['/notifications']);
  });

  it('checks access-control resources separately for their individual cards', () => {
    const permissions = ['read:roles'];
    const cards = createHomeCards(t, viewer('custom-role', permissions), permissions);
    expect(cards.some((card) => card.id === '/roles')).toBe(true);
    expect(cards.some((card) => card.id === '/users' || card.id === '/permissions')).toBe(false);
  });

  it('keeps existing family sidebar access and uses the explicit dashboard route', () => {
    const permissions = ['read:students', 'read:grades'];
    const familyNav = createSidebarItems(t, viewer('parent', permissions));
    expect(familyNav.some((item) => item.id === '/students')).toBe(true);
    expect(familyNav.some((item) => item.id === '/dashboard')).toBe(false);
    expect(createSidebarItems(t, viewer('admin', ['*:*']))[0].href).toBe('/dashboard');
  });

  it('opens appearance cards through the shell actions rather than fake routes', () => {
    const cards = createHomeCards(t, viewer('admin', ['*:*']), ['*:*']);
    expect(cards.find((card) => card.id === 'settings:theme')).toMatchObject({ action: 'theme', accessible: true });
    expect(cards.find((card) => card.id === 'settings:branding')).toMatchObject({ action: 'branding', accessible: true });
    expect(cards.find((card) => card.id === 'settings:theme')?.href).toBeUndefined();
    const principalCards = createHomeCards(t, viewer('principal', ['read:settings']), ['read:settings']);
    expect(principalCards.some((card) => card.action)).toBe(false);
  });
});
