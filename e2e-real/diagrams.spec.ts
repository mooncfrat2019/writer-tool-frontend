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

  // Presence cursors are exchanged through the Yjs awareness channel. A
  // second browser context keeps the first session's refresh cookie intact.
  const secondContext = await page.context().browser()!.newContext();
  const secondPage = await secondContext.newPage();
  const origin = new URL(page.url()).origin;
  await secondPage.goto(`${origin}/login`);
  await secondPage.getByLabel('Email').fill(`diagrams+${stamp}@example.com`);
  await secondPage.getByLabel('Пароль').fill('password123');
  await secondPage.getByRole('button', { name: 'Войти' }).click();
  await expect(secondPage).toHaveURL(/\/projects$/);
  await secondPage.goto(page.url());
  await expect(
    secondPage.getByRole('heading', { name: 'Схема тестов' }),
  ).toBeVisible();
  await expect(
    secondPage.getByText('live', { exact: true }),
  ).toBeVisible({ timeout: 20_000 });
  const canvasBox = await canvas.boundingBox();
  if (!canvasBox) {
    throw new Error('Canvas has no bounding box');
  }
  await page.mouse.move(canvasBox.x + 220, canvasBox.y + 160);
  await page.mouse.move(canvasBox.x + 270, canvasBox.y + 190, { steps: 6 });
  await expect(
    secondPage.locator('[data-diagram-cursor]').first(),
  ).toBeVisible({ timeout: 15_000 });
  await secondContext.close();

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

  // The thumbnail is rendered on the client and uploaded through the asset
  // pipeline before being attached to the diagram.
  const thumbnail = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      /\/api\/v1\/diagrams\/[^/]+\/thumbnail$/.test(response.url()),
  );
  await page.getByRole('button', { name: 'Обновить миниатюру' }).click();
  const thumbnailResponse = await thumbnail;
  expect(thumbnailResponse.status()).toBe(200);
  const thumbnailBody = (await thumbnailResponse.json()) as {
    thumbnailUrl?: string | null;
  };
  expect(thumbnailBody.thumbnailUrl).toContain('/api/v1/dev/files/');
  await expect(page.getByText('Миниатюра схемы обновлена')).toBeVisible();

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
