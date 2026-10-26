import { expect, test } from '@playwright/test';

test('edits a diagram with live collaboration and persists it', async ({
  page,
}) => {
  test.setTimeout(180_000);
  const stamp = Date.now();

  await page.goto('/register');
  await page.getByLabel('Как вас зовут').fill('Схемотворец');
  await page.getByLabel('Email').fill(`diagrams+${stamp}@example.com`);
  await page.getByLabel('Пароль').fill('password123');
  await page.getByRole('button', { name: 'Создать аккаунт' }).click();
  await expect(page).toHaveURL(/\/projects$/);

  await page.getByRole('button', { name: 'Новый проект' }).click();
  let dialog = page.getByRole('dialog');
  await dialog.getByLabel('Название').fill('Проект схем');
  await dialog.getByRole('button', { name: 'Создать проект' }).click();
  await expect(page).toHaveURL(/\/projects\/[^/]+\/structure$/);

  await page
    .getByRole('navigation', { name: 'Навигация по проекту' })
    .first()
    .getByRole('link', { name: 'Схемы', exact: true })
    .click();
  await expect(page).toHaveURL(/\/diagrams$/);
  await expect(page.getByRole('heading', { name: 'Схемы' })).toBeVisible();

  await page.getByRole('button', { name: 'Новая схема' }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('Название').fill('Схема тестов');
  await dialog.getByRole('button', { name: 'Создать' }).click();
  await expect(page).toHaveURL(/\/diagrams\/[^/]+$/);
  await expect(page.getByRole('heading', { name: 'Схема тестов' })).toBeVisible();

  // The real API issues a collaboration token and the canvas becomes ready.
  const canvas = page.locator('.react-flow');
  await expect(canvas).toBeVisible();
  await expect(page.getByText('live', { exact: true })).toBeVisible({
    timeout: 20_000,
  });

  const save = page.waitForResponse(
    (response) =>
      response.request().method() === 'PATCH' &&
      /\/api\/v1\/diagrams\//.test(response.url()) &&
      response.status() === 200,
    { timeout: 20_000 },
  );
  await page.getByRole('button', { name: '+ Заметка' }).click();
  await expect(canvas.getByText('Новая заметка')).toBeVisible();
  await save;

  // Canonical React Flow JSON is stored in PostgreSQL and the Yjs room.
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Схема тестов' })).toBeVisible();
  await expect(
    page.locator('.react-flow').getByText('Новая заметка'),
  ).toBeVisible({ timeout: 20_000 });

  // Cleanup through the settings dialog.
  await page.getByRole('button', { name: 'Настройки' }).click();
  page.once('dialog', (confirmation) => void confirmation.accept());
  await page.getByRole('button', { name: 'Удалить схему' }).click();
  await expect(page).toHaveURL(/\/diagrams$/);
  await expect(
    page.getByRole('link').filter({ hasText: 'Схема тестов' }),
  ).toHaveCount(0);
});
