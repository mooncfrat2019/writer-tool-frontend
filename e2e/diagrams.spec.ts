import { expect, test } from '@playwright/test';
import { login, openProjectSection } from './helpers';

test('edits a collaborative diagram and persists nodes', async ({ page }) => {
  await login(page);
  await openProjectSection(page, 'Схемы');

  await expect(page.getByRole('heading', { name: 'Схемы' })).toBeVisible();
  await page.getByRole('link').filter({ hasText: 'Связи героев' }).click();
  await expect(page.getByRole('heading', { name: 'Связи героев' })).toBeVisible();

  const canvas = page.locator('.react-flow');
  await expect(canvas.getByText('Мира Вейн')).toBeVisible();
  await expect(canvas.getByText('Кай Рен')).toBeVisible();

  const save = page.waitForResponse(
    (response) =>
      response.request().method() === 'PATCH' &&
      /\/api\/v1\/diagrams\//.test(response.url()),
  );
  await page.getByRole('button', { name: '+ Заметка' }).click();
  await expect(canvas.getByText('Новая заметка')).toBeVisible();
  await save;

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Связи героев' })).toBeVisible();
  await expect(page.locator('.react-flow').getByText('Новая заметка')).toBeVisible();
});

test('creates and deletes a diagram', async ({ page }) => {
  await login(page);
  await openProjectSection(page, 'Схемы');

  await page.getByRole('button', { name: 'Новая схема' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Название').fill('Тестовая схема');
  await dialog.getByLabel('Тип').click();
  await page.getByRole('option', { name: 'Свободная схема' }).click();
  await dialog.getByRole('button', { name: 'Создать' }).click();

  await expect(page).toHaveURL(/\/diagrams\/[^/]+$/);
  await expect(page.getByRole('heading', { name: 'Тестовая схема' })).toBeVisible();

  await page.getByRole('button', { name: '+ Заметка' }).click();
  await expect(
    page.locator('.react-flow').getByText('Новая заметка'),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Настройки' }).click();
  page.once('dialog', (confirmation) => void confirmation.accept());
  await page.getByRole('button', { name: 'Удалить схему' }).click();
  await expect(page).toHaveURL(/\/diagrams$/);
  await expect(page.getByRole('heading', { name: 'Схемы' })).toBeVisible();
  await expect(page.getByRole('link').filter({ hasText: 'Тестовая схема' })).toHaveCount(0);
});
