import { expect, test, type Page } from '@playwright/test';
import {
  ADMIN,
  ensureRoleUser,
  expectNoHorizontalOverflow,
  mockApi,
  signInAs,
} from './support/acceptance';

/**
 * The vehicle fleet is an admin-only section, and its card carries the two
 * things a school needs at a glance: which vehicle it is on the road (plate,
 * make, mileage) and who is driving it. A bus with no driver assigned has to be
 * distinguishable from one that has one.
 */
test.describe.configure({ mode: 'serial' });

const VEHICLES = [
  {
    id: 'acceptance-vehicle-1',
    name: 'Bus One',
    brand: 'Mercedes',
    model: 'Sprinter',
    year: 2022,
    licensePlate: '1234-A-56',
    status: 'active',
    currentMileage: '84500',
    driver: { id: 'acceptance-driver-1', name: 'Karim Ziani' },
  },
  {
    id: 'acceptance-vehicle-2',
    name: 'Van Two',
    brand: 'Renault',
    model: 'Master',
    year: 2019,
    licensePlate: '7788-B-12',
    status: 'maintenance',
    currentMileage: null,
    driver: null,
  },
];

const withVehicles = (page: Page) => mockApi(page, '/vehicles', VEHICLES);

test('the fleet names each vehicle, its plate, its mileage and its driver', async ({ browser }) => {
  const { page, close } = await signInAs(browser, ADMIN, { at: '/vehicles', setup: withVehicles });

  await expect(page.getByRole('heading', { name: 'Vehicles' })).toBeVisible();
  await expect(page.getByText('2 vehicles total')).toBeVisible();

  await expect(page.getByText('Bus One')).toBeVisible();
  await expect(page.getByText('Mercedes Sprinter (2022)')).toBeVisible();
  await expect(page.getByText('1234-A-56')).toBeVisible();
  // Stored as a bare number and shown grouped, with its unit.
  await expect(page.getByText('84,500 km')).toBeVisible();
  await expect(page.getByText('Karim Ziani')).toBeVisible();

  // The second vehicle has neither mileage nor a driver, so neither line is
  // invented for it.
  await expect(page.getByText('Van Two')).toBeVisible();
  await expect(page.getByText('Renault Master (2019)')).toBeVisible();
  await expect(page.getByText('Maintenance')).toBeVisible();

  await close();
});

test('the fleet is offered to an admin and withheld from a teacher', async ({ browser }) => {
  const admin = await signInAs(browser, ADMIN, { setup: withVehicles });
  await admin.page.getByRole('button', { name: 'Transport' }).click();
  await expect(admin.page.locator('a[href="/vehicles"]:visible').first()).toBeVisible();
  await admin.close();

  const teacher = await ensureRoleUser('teacher');
  const session = await signInAs(browser, teacher);
  await expect(session.page.getByRole('button', { name: 'LogOut' })).toBeVisible();
  await expect(session.page.getByRole('button', { name: 'Transport' })).toHaveCount(0);
  await expect(session.page.locator('a[href="/vehicles"]')).toHaveCount(0);
  await session.close();
});

test('the fleet fits a phone viewport', async ({ browser }) => {
  const { page, close } = await signInAs(browser, ADMIN, {
    at: '/vehicles',
    viewport: { width: 390, height: 844 },
    setup: withVehicles,
  });

  await expect(page.getByText('Bus One')).toBeVisible();
  await expect(page.getByText('1234-A-56')).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await close();
});
