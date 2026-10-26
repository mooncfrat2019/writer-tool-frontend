import { expect, test } from '@playwright/test';
import { login, openProjectSection } from './helpers';

test('creates, filters and persists timeline events', async ({ page }) => {
  await login(page);
  await openProjectSection(page, 'Таймлайн');

  await expect(page.getByRole('heading', { name: 'Таймлайн' })).toBeVisible();
  await expect(page.getByText('Падение Пепельной Луны')).toBeVisible();
  await expect(page.getByText('Пророчество о семи годах')).toBeVisible();

  // Narrative mode shows the chapter columns.
  await page.getByRole('button', { name: 'Повествование' }).click();
  await expect(page.getByText('Глава 1. Пробуждение').first()).toBeVisible();
  await page.getByRole('button', { name: 'Мир' }).click();

  // Create an event through the dialog.
  await page.getByRole('button', { name: 'Событие' }).click();
  let dialog = page.getByRole('dialog');
  await dialog.getByLabel('Название').fill('Тестовое событие');
  await dialog.getByLabel('Год', { exact: true }).fill('344');
  await dialog.getByLabel('Месяц', { exact: true }).click();
  await page.getByRole('option', { name: 'Зимородок' }).click();
  await dialog.getByLabel('День', { exact: true }).fill('5');
  await dialog.getByRole('button', { name: 'Создать событие' }).click();
  await expect(page.getByText('Тестовое событие')).toBeVisible();

  // Open the new event and check that the editor reads it back.
  await page
    .getByRole('button', { name: /Тестовое событие/ })
    .first()
    .click();
  dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Событие таймлайна')).toBeVisible();
  await expect(dialog.getByLabel('Год', { exact: true })).toHaveValue('344');
  await dialog.getByRole('button', { name: 'Отмена' }).click();

  // Filter by plot thread.
  await page.getByLabel('Линия сюжета', { exact: true }).click();
  await page.getByRole('option', { name: 'Пророчества' }).click();
  await expect(page.getByText('Пророчество о семи годах')).toBeVisible();
  await expect(page.getByText('Падение Пепельной Луны')).toHaveCount(0);
  await page.getByLabel('Линия сюжета', { exact: true }).click();
  await page.getByRole('option', { name: 'Все линии' }).click();

  // Calendar management.
  await page.getByRole('button', { name: 'Календарь', exact: true }).click();
  dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Летопись Пепельной Луны')).toBeVisible();
  await dialog.getByLabel('Название').fill('Второй календарь');
  await dialog.getByRole('button', { name: 'Добавить календарь' }).click();
  await expect(dialog).toBeHidden();
  await page.getByRole('button', { name: 'Календарь', exact: true }).click();
  await expect(page.getByText('Второй календарь')).toBeVisible();
  await page.getByRole('button', { name: 'Отмена' }).click();

  // The mock state persists through a reload.
  await page.reload();
  await expect(page.getByText('Тестовое событие')).toBeVisible();

  // Move the event to another thread by drag is covered by the canvas code;
  // here we verify the plot thread filter still works after reload.
  await page.getByLabel('Линия сюжета', { exact: true }).click();
  await page.getByRole('option', { name: 'Основная линия' }).click();
  await expect(page.getByText('Тестовое событие')).toBeVisible();
});
