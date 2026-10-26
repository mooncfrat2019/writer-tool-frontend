import { expect, test } from '@playwright/test';
import { login, openProjectSection } from './helpers';

test('renders project custom fields in the character profile and manages them', async ({
  page,
}) => {
  await login(page);
  await openProjectSection(page, 'Персонажи');

  // The seeded project defines a "Рост" field for characters.
  await page
    .getByTestId('character-card')
    .filter({ has: page.getByRole('heading', { name: 'Мира Вейн' }) })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Мира Вейн' }),
  ).toBeVisible();
  const height = page.getByLabel('Рост');
  await height.fill('170');
  await page.getByRole('button', { name: 'Сохранить профиль' }).click();
  await expect(page.getByText('Профиль сохранён.')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Рост')).toHaveValue('170');

  // Manage definitions: add, rename and delete a field.
  await page.getByRole('link', { name: 'Персонажи' }).first().click();
  await page.getByRole('button', { name: 'Поля профиля' }).click();
  let dialog = page.getByRole('dialog');
  await dialog.getByLabel('Название').fill('Девичья фамилия');
  await dialog.getByRole('button', { name: 'Добавить поле' }).click();
  await expect(dialog.getByText('Девичья фамилия')).toBeVisible();

  await dialog
    .getByRole('button', { name: 'Изменить поле Девичья фамилия' })
    .click();
  await dialog.getByLabel('Название').fill('Фамилия до брака');
  await dialog.getByRole('button', { name: 'Сохранить поле' }).click();
  await expect(dialog.getByText('Фамилия до брака')).toBeVisible();

  const fieldItems = dialog.locator('li');
  await expect(fieldItems.nth(0)).toContainText('Рост');
  await dialog
    .getByRole('button', { name: 'Переместить поле Фамилия до брака выше' })
    .click();
  await expect(fieldItems.nth(0)).toContainText('Фамилия до брака');

  await dialog.getByLabel('Закрыть').click();
  await expect(dialog).toBeHidden();

  await page
    .getByTestId('character-card')
    .filter({ has: page.getByRole('heading', { name: 'Мира Вейн' }) })
    .click();
  await expect(page.getByLabel('Фамилия до брака')).toBeVisible();

  await page.getByRole('link', { name: 'Персонажи' }).first().click();
  await page.getByRole('button', { name: 'Поля профиля' }).click();
  dialog = page.getByRole('dialog');
  await dialog
    .getByRole('button', { name: 'Удалить поле Фамилия до брака' })
    .click();
  await dialog
    .getByRole('button', { name: 'Удалить поле', exact: true })
    .click();
  await expect(dialog.getByText('Фамилия до брака')).toHaveCount(0);
});

test('viewer cannot manage custom fields', async ({ page }) => {
  await login(page);
  await page
    .getByTestId('project-card')
    .filter({ hasText: 'Сад незакрытых дверей' })
    .click();
  await page
    .getByRole('navigation', { name: 'Навигация по проекту' })
    .first()
    .getByRole('link', { name: 'Персонажи', exact: true })
    .click();
  await expect(page.getByText('Только чтение')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Поля профиля' }),
  ).toHaveCount(0);
});
