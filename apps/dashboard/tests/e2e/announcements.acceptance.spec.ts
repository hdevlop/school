import { expect, test, type Page } from '@playwright/test';
import {
  ADMIN,
  expectNoHorizontalOverflow,
  mockApi,
  signInAs,
} from './support/acceptance';

/**
 * An announcement is addressed to an audience and is either published or still
 * a draft, and those two facts are the whole point of the list — a draft that
 * reads as published, or a class notice that reads as school-wide, is the kind
 * of mistake this screen exists to prevent.
 */
test.describe.configure({ mode: 'serial' });

const ANNOUNCEMENTS = [
  {
    id: 'acceptance-announcement-1',
    title: 'Parent evening',
    content: 'Doors open at six in the main hall.',
    targetAudience: 'parents',
    isPublished: true,
    publishDate: '2026-05-11',
    author: { id: 'acceptance-user-1', name: 'Rachid Alami', email: 'rachid@school.test' },
    class: null,
  },
  {
    id: 'acceptance-announcement-2',
    title: 'Sports day plan',
    content: 'Draft schedule, not final.',
    targetAudience: 'all',
    isPublished: false,
    publishDate: null,
    author: null,
    class: null,
  },
];

const withAnnouncements = (page: Page) => mockApi(page, '/announcements', ANNOUNCEMENTS);

const cell = (page: Page, text: string) =>
  page.locator('[data-slot="table-cell"]', { hasText: text });

test('each announcement states its audience, its author and whether it is published', async ({ browser }) => {
  const { page, close } = await signInAs(browser, ADMIN, {
    at: '/announcements',
    setup: withAnnouncements,
  });

  await expect(page.getByRole('heading', { name: 'Announcements' })).toBeVisible();
  await expect(page.getByText('2 announcements total')).toBeVisible();

  await expect(cell(page, 'Parent evening').first()).toBeVisible();
  await expect(cell(page, 'Parents').first()).toBeVisible();
  await expect(cell(page, 'Rachid Alami').first()).toBeVisible();
  await expect(cell(page, 'Published').first()).toBeVisible();

  // The unpublished one is marked a draft, is addressed to everyone, and has
  // no author to name.
  await expect(cell(page, 'Sports day plan').first()).toBeVisible();
  await expect(cell(page, 'Draft').first()).toBeVisible();
  // "Everyone", not "All": the audience column renders the stored token
  // through `NBadge`, which now resolves it against the shared `status.*`
  // catalog registered on the provider.
  await expect(cell(page, 'Everyone').first()).toBeVisible();
  // Three columns say it for this row — author, class and section.
  await expect(page.getByText('Not Assigned').first()).toBeVisible();

  await close();
});

test('the list is reachable from the sidebar and fits a phone', async ({ browser }) => {
  const { page, close } = await signInAs(browser, ADMIN, {
    at: '/announcements',
    viewport: { width: 390, height: 844 },
    setup: withAnnouncements,
  });

  await expect(page.getByRole('heading', { name: 'Announcements' })).toBeVisible();
  await expect(page.getByText('Parent evening').first()).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await close();
});

test('status badges are written in the interface language, not left in English', async ({ browser }) => {
  const { page, close } = await signInAs(browser, ADMIN, {
    at: '/announcements',
    language: 'fr',
    setup: withAnnouncements,
  });

  // Every `<NBadge status={...} />` in School resolves through the provider's
  // badge defaults. Before those were registered, each one fell through to a
  // humanized English token and stayed English in every language.
  await expect(cell(page, 'Publié').first()).toBeVisible();
  await expect(cell(page, 'Brouillon').first()).toBeVisible();
  await expect(cell(page, 'Tous').first()).toBeVisible();
  await expect(cell(page, 'Published')).toHaveCount(0);

  await close();
});
