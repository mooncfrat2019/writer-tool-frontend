import { expect, test } from '@playwright/test';

test('publishes the four legal documents without a consent page', async ({ page }) => {
  await page.goto('/legal/offer');
  await expect(page.getByRole('heading', { name: 'Публичная оферта' })).toBeVisible();
  await expect(
    page
      .getByText('Отдельное согласие на обработку персональных данных не оформляется')
      .first(),
  ).toBeVisible();

  await page.goto('/legal/terms');
  await expect(page.getByRole('heading', { name: 'Пользовательское соглашение' })).toBeVisible();

  await page.goto('/legal/privacy');
  await expect(
    page.getByRole('heading', { name: 'Политика обработки персональных данных' }),
  ).toBeVisible();

  await page.goto('/legal/cookies');
  await expect(
    page.getByRole('heading', { name: 'Политика обработки файлов cookie' }),
  ).toBeVisible();

  await page.goto('/legal/consent');
  await expect(page.getByRole('heading', { name: 'Страница не найдена' })).toBeVisible();
});
