import { expect, test } from '@playwright/test';
import { login, openProjectSection } from './helpers';

test('reorders locations, moves them in the tree and shows them on the map', async ({
  page,
}) => {
  await login(page);
  await openProjectSection(page, 'Миры');
  await page.getByTestId('world-card').filter({ hasText: 'Астрал' }).click();
  await expect(page.getByRole('heading', { name: 'Астрал' })).toBeVisible();

  const tree = page.getByTestId('location-tree');
  await expect(tree.getByText('Серебряный порт')).toBeVisible();
  await expect(tree.getByText('Цитадель сна')).toBeVisible();

  // Add a root location with map coordinates.
  await page.getByRole('button', { name: 'Добавить локацию' }).first().click();
  let dialog = page.getByRole('dialog');
  await dialog.getByLabel('Название').fill('Порт тестов');
  await dialog.getByLabel('X на карте, %').fill('15');
  await dialog.getByLabel('Y на карте, %').fill('20');
  await dialog.getByRole('button', { name: 'Добавить' }).click();
  await expect(tree.getByText('Порт тестов')).toBeVisible();

  // The new root is appended; move it above the seeded port.
  await tree.getByText('Порт тестов').hover();
  await page
    .getByRole('button', { name: 'Переместить локацию Порт тестов выше' })
    .click();
  const roots = tree.locator(':scope > li');
  await expect(roots.nth(0)).toContainText('Порт тестов');
  await expect(roots.nth(1)).toContainText('Серебряный порт');

  // Move a nested location to the world root.
  await tree.getByText('Цитадель сна').hover();
  await page
    .getByRole('button', { name: 'Изменить локацию Цитадель сна' })
    .click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('Родительская локация').click();
  await page.getByRole('option', { name: 'Без родителя' }).click();
  await dialog.getByRole('button', { name: 'Сохранить' }).click();
  await expect(dialog).toBeHidden();
  await expect(roots.nth(2)).toContainText('Цитадель сна');

  // The map shows every location that has coordinates.
  await page.getByRole('button', { name: 'Карта' }).click();
  const map = page.getByTestId('location-map');
  await expect(map).toBeVisible();
  await expect(
    map.getByRole('button', { name: 'Открыть локацию Серебряный порт' }),
  ).toBeVisible();
  await expect(
    map.getByRole('button', { name: 'Открыть локацию Цитадель сна' }),
  ).toBeVisible();
  await expect(
    map.getByRole('button', { name: 'Открыть локацию Порт тестов' }),
  ).toBeVisible();

  await page
    .getByTestId('location-map-panel')
    .getByRole('button', { name: 'Серебряный порт', exact: true })
    .click();
  dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('Название')).toHaveValue('Серебряный порт');
});
