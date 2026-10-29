import { expect, test } from '@playwright/test';
import { EXTERNAL_IMAGE_URL, login, openProjectSection } from './helpers';

test('links, persists and removes a book cover', async ({ page }) => {
  await login(page);
  await openProjectSection(page, 'Структура');

  await page.getByRole('button', { name: 'Обложка' }).click();
  const dialog = page.getByRole('dialog');
  await expect(
    dialog.getByRole('heading', { name: 'Обложка книги' }),
  ).toBeVisible();
  await dialog.locator('#book-cover-url').fill(EXTERNAL_IMAGE_URL);
  await dialog.getByRole('button', { name: 'Проверить' }).click();
  await expect(dialog.getByTestId('book-cover-url-preview')).toBeVisible();
  await dialog.getByRole('button', { name: 'Сохранить обложку' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByAltText(/^Обложка /)).toBeVisible();

  // Mock state survives a reload, so the cover comes back from the API.
  await page.reload();
  await expect(page.getByAltText(/^Обложка /)).toBeVisible();

  await page.getByRole('button', { name: 'Обложка' }).click();
  page.once('dialog', (confirmation) => void confirmation.accept());
  await page.getByRole('button', { name: 'Удалить обложку' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByAltText(/^Обложка /)).toHaveCount(0);
});
