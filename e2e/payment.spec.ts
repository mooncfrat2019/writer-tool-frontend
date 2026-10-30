import { expect, test } from '@playwright/test';
import { login } from './helpers';

test('creates a mock Robokassa payment and shows the confirmed state', async ({
  page,
}) => {
  await login(page);
  await page.goto('/plans');

  await expect(page.getByText(/Pro активен до/)).toBeVisible();
  await page.getByRole('button', { name: /Продлить Pro/ }).click();

  await expect(page).toHaveURL(/\/payment\/success\?InvId=\d+/);
  await expect(
    page.getByRole('heading', { name: 'Оплата подтверждена' }),
  ).toBeVisible();
  await expect(
    page.getByText(/Доступ к тарифу Pro активирован/),
  ).toBeVisible();
  await expect(page.getByText(/Чек НПД Robokassa направит/)).toBeVisible();
});

test('shows the public payment failure page', async ({ page }) => {
  await page.goto('/payment/fail');

  await expect(
    page.getByRole('heading', { name: 'Платёж не завершён' }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Вернуться к тарифам' }),
  ).toBeVisible();
});
