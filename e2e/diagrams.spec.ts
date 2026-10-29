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

test('links several cards to one and deletes with key or button', async ({
  page,
}) => {
  await login(page);
  await openProjectSection(page, 'Схемы');

  await page.getByRole('button', { name: 'Новая схема' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Название').fill('Схема связей');
  await dialog.getByRole('button', { name: 'Создать' }).click();
  await expect(page).toHaveURL(/\/diagrams\/[^/]+$/);

  const canvas = page.locator('.react-flow');
  await page.getByRole('button', { name: 'Мира Вейн +' }).click();
  await page.getByRole('button', { name: 'Кай Рен +' }).click();
  await page.getByRole('button', { name: 'Селина Мор +' }).click();
  await expect(canvas.locator('.react-flow__node')).toHaveCount(3);

  const link = async (source: string, target: string) => {
    await canvas.locator('.react-flow__node').filter({ hasText: source }).click();
    await page.locator('#diagram-link-target').selectOption({ label: target });
    await page.getByRole('button', { name: '+ Создать связь' }).click();
  };
  await link('Мира Вейн', 'Селина Мор');
  await link('Кай Рен', 'Селина Мор');
  await expect(canvas.locator('.react-flow__edge')).toHaveCount(2);

  // Delete key works alongside Backspace.
  await canvas
    .locator('.react-flow__edge')
    .first()
    .locator('.react-flow__edge-interaction')
    .dispatchEvent('click');
  await page.keyboard.press('Delete');
  await expect(canvas.locator('.react-flow__edge')).toHaveCount(1);

  // The sidebar button deletes the current selection too.
  await canvas
    .locator('.react-flow__edge')
    .first()
    .locator('.react-flow__edge-interaction')
    .dispatchEvent('click');
  await page.getByRole('button', { name: 'Удалить выбранное' }).click();
  await expect(canvas.locator('.react-flow__edge')).toHaveCount(0);

  // Backspace still removes cards; attached edges go with them.
  await link('Мира Вейн', 'Селина Мор');
  await expect(canvas.locator('.react-flow__edge')).toHaveCount(1);
  await canvas.locator('.react-flow__node').filter({ hasText: 'Селина Мор' }).click();
  await page.keyboard.press('Backspace');
  await expect(canvas.locator('.react-flow__node')).toHaveCount(2);
  await expect(canvas.locator('.react-flow__edge')).toHaveCount(0);
});

test('arranges cards by relationships', async ({ page }) => {
  await login(page);
  await openProjectSection(page, 'Схемы');

  await page.getByRole('button', { name: 'Новая схема' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Название').fill('Схема миниатюр');
  await dialog.getByRole('button', { name: 'Создать' }).click();
  await expect(page).toHaveURL(/\/diagrams\/[^/]+$/);

  const canvas = page.locator('.react-flow');
  await page.getByRole('button', { name: 'Мира Вейн +' }).click();
  await page.getByRole('button', { name: 'Кай Рен +' }).click();
  await page.getByRole('button', { name: 'Селина Мор +' }).click();
  await expect(canvas.locator('.react-flow__node')).toHaveCount(3);

  const link = async (source: string, target: string) => {
    await canvas.locator('.react-flow__node').filter({ hasText: source }).click();
    await page.locator('#diagram-link-target').selectOption({ label: target });
    await page.getByRole('button', { name: '+ Создать связь' }).click();
  };
  await link('Мира Вейн', 'Селина Мор');
  await link('Кай Рен', 'Селина Мор');
  await expect(canvas.locator('.react-flow__edge')).toHaveCount(2);

  await page.getByRole('button', { name: 'Упорядочить по связям' }).click();
  await page.waitForTimeout(300);
  const box = async (name: string) => {
    const value = await canvas
      .locator('.react-flow__node')
      .filter({ hasText: name })
      .boundingBox();
    expect(value).not.toBeNull();
    return value as { x: number; y: number };
  };
  const mira = await box('Мира Вейн');
  const kay = await box('Кай Рен');
  const selina = await box('Селина Мор');
  expect(Math.abs(mira.x - kay.x)).toBeLessThan(2);
  expect(selina.x).toBeGreaterThan(mira.x + 100);

  await expect(
    page.getByRole('button', { name: 'Обновить миниатюру' }),
  ).toHaveCount(0);

  await page.getByRole('link', { name: /Все схемы/ }).click();
  await expect(
    page.getByRole('link').filter({ hasText: 'Схема миниатюр' }),
  ).toBeVisible();
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
