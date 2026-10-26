import { expect, test } from '@playwright/test';
import { login, openProjectSection } from './helpers';

test('creates a world and fills its locations, factions, rules and lore', async ({
  page,
}) => {
  await login(page);
  await openProjectSection(page, 'Миры');

  await expect(
    page.getByTestId('world-card').filter({ hasText: 'Астрал' }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Новый мир' }).click();
  let dialog = page.getByRole('dialog');
  await dialog.getByLabel('Название').fill('Тестовый мир');
  await dialog.getByLabel('Тип').fill('fantasy');
  await dialog.getByLabel('Кратко').fill('Мир для проверки');
  await dialog.getByRole('button', { name: 'Создать мир' }).click();

  await expect(page).toHaveURL(/\/worlds\/[^/]+$/);
  await expect(
    page.getByRole('heading', { name: 'Тестовый мир' }),
  ).toBeVisible();

  // Locations: add a root and a child, verify the tree renders both.
  await page.getByRole('button', { name: 'Добавить локацию' }).first().click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('Название').fill('Город тестов');
  await dialog.getByRole('button', { name: 'Добавить' }).click();
  await expect(page.getByText('Город тестов')).toBeVisible();

  await page.getByRole('button', { name: 'Добавить локацию' }).first().click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('Название').fill('Башня тестов');
  await dialog.getByLabel('Родительская локация').click();
  await page.getByRole('option', { name: 'Город тестов' }).click();
  await dialog.getByRole('button', { name: 'Добавить' }).click();
  await expect(page.getByText('Башня тестов')).toBeVisible();

  // Factions.
  await page.getByRole('tab', { name: 'Фракции' }).click();
  await page.getByRole('button', { name: 'Добавить фракцию' }).first().click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('Название').fill('Орден тестов');
  await dialog.getByLabel('Цели').fill('Проверять миры');
  await dialog.getByRole('button', { name: 'Добавить' }).click();
  await expect(page.getByText('Орден тестов')).toBeVisible();

  // Rules.
  await page.getByRole('tab', { name: 'Законы' }).click();
  await page.getByRole('button', { name: 'Добавить закон' }).first().click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('Название').fill('Закон тестов');
  await dialog.getByLabel('Правило').fill('Каждый тест должен падать хотя бы раз.');
  await dialog.getByRole('button', { name: 'Добавить' }).click();
  await expect(page.getByText('Закон тестов')).toBeVisible();

  // Lore.
  await page.getByRole('tab', { name: 'Лор' }).click();
  await page.getByRole('button', { name: 'Добавить запись' }).first().click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('Название').fill('Легенда тестов');
  await dialog.getByLabel('Текст').fill('Так проверяли миры в древности.');
  await dialog.getByRole('button', { name: 'Добавить' }).click();
  await expect(page.getByText('Легенда тестов')).toBeVisible();

  // Everything is persisted by the mock state and survives a reload.
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Тестовый мир' }),
  ).toBeVisible();
  await page.getByRole('tab', { name: 'Локации' }).click();
  await expect(page.getByText('Город тестов')).toBeVisible();
  await expect(page.getByText('Башня тестов')).toBeVisible();
  await page.getByRole('tab', { name: 'Лор' }).click();
  await expect(page.getByText('Легенда тестов')).toBeVisible();
});

test('viewer sees worlds read-only', async ({ page }) => {
  await login(page);
  await page
    .getByTestId('project-card')
    .filter({ hasText: 'Сад незакрытых дверей' })
    .click();
  await page
    .getByRole('navigation', { name: 'Навигация по проекту' })
    .first()
    .getByRole('link', { name: 'Миры', exact: true })
    .click();

  await expect(
    page.getByRole('heading', { name: 'Миры', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Только чтение')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Новый мир' }),
  ).toHaveCount(0);

  await page.getByTestId('world-card').first().click();
  await expect(page.getByText('Только чтение')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Настроить мир' }),
  ).toHaveCount(0);
});
