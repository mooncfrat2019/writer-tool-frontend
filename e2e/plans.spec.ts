import { expect, test } from '@playwright/test';
import { login } from './helpers';

test('opens the plans page from the user menu and shows both tiers', async ({
  page,
}) => {
  await login(page);

  await page.getByRole('button', { name: 'Меню пользователя' }).click();
  await page.getByRole('menuitem', { name: 'Тарифы' }).click();

  await expect(page).toHaveURL(/\/plans$/);
  await expect(
    page.getByRole('heading', { name: 'Выберите масштаб мастерской' }),
  ).toBeVisible();
  await expect(page.getByText('Бесплатный', { exact: true })).toBeVisible();
  await expect(
    page.getByText('Профессиональный', { exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Текущий тариф')).toBeVisible();
  await expect(page.getByText(/175 а\.л\./)).toBeVisible();
  await expect(page.getByText(/Использовано:/).first()).toBeVisible();
  await expect(
    page.getByText(/Оплата проходит через «РОБОКАССА»/),
  ).toBeVisible();
});
