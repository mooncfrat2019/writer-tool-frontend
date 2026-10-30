import { expect, test } from '@playwright/test';

test('opens the public landing without redirecting to login', async ({ page }) => {
  await page.goto('/');

  await expect(
    page.getByRole('heading', {
      name: 'Место, где книга собирается из тишины и точных слов.',
    }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('link', { name: 'Войти и начать' })).toHaveAttribute(
    'href',
    '/login',
  );
  await expect(page.getByText(/Самозанятый Коломойцев Игорь Сергеевич/)).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'support@tool.melzix.net' }).first(),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: '+7 999 195-88-80' }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'Публичная оферта' })).toHaveAttribute(
    'href',
    '/legal/offer',
  );
  await expect(page.getByRole('link', { name: 'Политика обработки ПДн' })).toHaveCount(0);
});

test('opens public pricing with real prices and legal links', async ({ page }) => {
  await page.goto('/pricing');

  await expect(page.getByRole('heading', { name: 'Выберите масштаб мастерской' })).toBeVisible();
  await expect(page.getByText('299 ₽/мес').first()).toBeVisible();
  await expect(page.getByText(/2.{0,2}990 ₽\/год/).first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'Условия оплаты' })).toHaveAttribute(
    'href',
    '/legal/offer#payment',
  );
  await expect(page.getByRole('link', { name: 'Возврат и компенсация' })).toHaveAttribute(
    'href',
    '/legal/offer#refund',
  );
  await expect(page.getByRole('link', { name: 'Политика обработки ПДн' })).toHaveCount(0);
});
