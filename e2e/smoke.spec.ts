import { expect, test } from '@playwright/test';

test('login and open the project structure', async ({ page }) => {
  await page.goto('/login');

  await page.getByLabel('Email').fill('author@example.com');
  await page.getByLabel('Пароль').fill('password123');
  await page.getByRole('button', { name: 'Войти' }).click();

  await expect(page.getByText('Хроники Пепельной Луны')).toBeVisible();
  await page.getByText('Хроники Пепельной Луны').click();

  await expect(page.getByText('Часть I. Город, который забыл')).toBeVisible();
});
