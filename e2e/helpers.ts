import { expect, type Page } from '@playwright/test';

export const OWNER_PROJECT = 'Хроники Пепельной Луны';
export const VIEWER_PROJECT = 'Сад незакрытых дверей';
export const OWNER_PROJECT_ID = '22222222-2222-4222-8222-222222222222';
export const VIEWER_PROJECT_ID = '22222222-2222-4222-8222-222222222223';
export const OWNER_BOOK_ID = '33333333-3333-4333-8333-333333333333';
export const OWNER_PART_ID = '44444444-4444-4444-8444-444444444441';
export const OWNER_CHAPTER_ID = '55555555-5555-4555-8555-555555555551';
export const OWNER_CHAPTER_TWO_ID = '55555555-5555-4555-8555-555555555552';
export const OWNER_DOCUMENT_ID = '88888888-8888-4888-8888-888888888888';
export const VIEWER_CHAPTER_ID = '55555555-5555-4555-8555-555555555554';
export const VIEWER_DOCUMENT_ID = '88888888-8888-4888-8888-888888888890';
export const MIRA_ID = '99999999-9999-4999-8999-999999999999';
export const KAY_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

export async function login(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill('author@example.com');
  await page.getByLabel('Пароль').fill('password123');
  await page.getByRole('button', { name: 'Войти' }).click();
  await expect(page).toHaveURL(/\/projects$/);
  await expect(page.getByRole('heading', { name: 'Проекты' })).toBeVisible();
}

export async function openProject(
  page: Page,
  title = OWNER_PROJECT,
): Promise<void> {
  await page
    .getByTestId('project-card')
    .filter({ hasText: title })
    .click();
  await expect(page.getByRole('heading', { name: 'Структура' })).toBeVisible();
}

export async function openProjectSection(
  page: Page,
  section: 'Структура' | 'Персонажи' | 'Экспорт',
  title = OWNER_PROJECT,
): Promise<void> {
  await openProject(page, title);
  await page
    .getByRole('navigation', { name: 'Навигация по проекту' })
    .first()
    .getByRole('link', { name: section, exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: section, exact: true }).first(),
  ).toBeVisible();
}

export async function openEditorForChapter(
  page: Page,
  projectId: string,
  nodeId: string,
): Promise<void> {
  await page.goto(`/projects/${projectId}/write/${nodeId}`);
  await expect(page.locator('.ProseMirror')).toBeVisible();
}

export async function expectTreeText(
  page: Page,
  text: string,
): Promise<void> {
  await expect(
    page.getByRole('list', { name: 'Структура книги' }).getByText(text, {
      exact: true,
    }),
  ).toBeVisible();
}
