import { expect, test } from '@playwright/test';
import { login } from './helpers';

test('redirects guests, restores the session on refresh and logs out', async ({
  page,
}) => {
  await page.goto('/projects');
  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole('heading', { name: 'Войти в книгу' }),
  ).toBeVisible();

  await login(page);
  await expect(page.getByTestId('project-card')).toHaveCount(2);

  await page.reload();
  await expect(page).toHaveURL(/\/projects$/);
  await expect(page.getByRole('heading', { name: 'Проекты' })).toBeVisible();
  await expect(page.getByTestId('project-card')).toHaveCount(2);

  await page.getByRole('button', { name: 'Меню пользователя' }).click();
  await page.getByRole('menuitem', { name: 'Выйти' }).click();

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByLabel('Email')).toBeVisible();

  await page.reload();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByLabel('Email')).toBeVisible();
});

test('rejects invalid credentials with a readable error', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('author@example.com');
  await page.getByLabel('Пароль').fill('short');
  await page.getByRole('button', { name: 'Войти' }).click();

  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test('registers a new account and opens the project library', async ({ page }) => {
  await page.goto('/register');

  await page.getByLabel('Как вас зовут').fill('Иван Читатель');
  await page.getByLabel('Email').fill('reader@example.com');
  await page.getByLabel('Пароль').fill('password123');
  await page.getByRole('button', { name: 'Создать аккаунт' }).click();

  await expect(page.getByRole('heading', { name: 'Проверьте почту' })).toBeVisible();
  await expect(page.getByText('reader@example.com')).toBeVisible();
  await page.getByRole('button', { name: 'Демо: подтвердить почту' }).click();

  await expect(page).toHaveURL(/\/projects$/);
  await expect(page.getByRole('heading', { name: 'Проекты' })).toBeVisible();
  await page.getByRole('button', { name: 'Меню пользователя' }).click();
  const accountMenu = page.getByRole('menu', { name: 'Меню пользователя' });
  await expect(accountMenu.getByText('Иван Читатель')).toBeVisible();
  await expect(accountMenu.getByText('reader@example.com')).toBeVisible();
});

test('offers a resend when the email is not confirmed', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('unverified@example.com');
  await page.getByLabel('Пароль').fill('password123');
  await page.getByRole('button', { name: 'Войти' }).click();

  const alert = page.getByRole('alert');
  await expect(alert).toContainText('ещё не подтверждена');
  await alert.getByRole('button', { name: 'Отправить письмо ещё раз' }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test('opens a protected project only after the refresh session check', async ({
  page,
}) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('author@example.com');
  await page.getByLabel('Пароль').fill('password123');
  await page.getByRole('button', { name: 'Войти' }).click();
  await expect(page).toHaveURL(/\/projects$/);

  await page.evaluate(() => {
    window.localStorage.removeItem('writer-tool.mock.session.v1');
  });
  await page.reload();

  await expect(page).toHaveURL(/\/login$/);
});
