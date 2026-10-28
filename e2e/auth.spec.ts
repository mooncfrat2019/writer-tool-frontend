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

test('asks for a code after confirming email when 2FA is enabled', async ({ page }) => {
  await page.goto('/verify-email?token=mock-verification-2fa');

  await expect(page.getByRole('heading', { name: 'Введите код' })).toBeVisible();
  await expect(page.getByLabel('Код из письма')).toBeVisible();
  await page.getByLabel('Код из письма').fill('123456');
  await page.getByRole('button', { name: 'Подтвердить код' }).click();

  await expect(page).toHaveURL(/\/projects$/);
  await expect(page.getByRole('heading', { name: 'Проекты' })).toBeVisible();
});

test('registers with an invite code without email confirmation', async ({ page }) => {
  await page.goto('/register');

  await page.getByLabel('Как вас зовут').fill('Приглашённый Автор');
  await page.getByLabel('Email').fill('invited@example.com');
  await page.getByLabel('Пароль').fill('password123');
  await page.getByLabel('Код приглашения').fill('mock-invite-code');
  await page.getByRole('button', { name: 'Создать аккаунт' }).click();

  await expect(page).toHaveURL(/\/projects$/);
  await expect(page.getByRole('heading', { name: 'Проекты' })).toBeVisible();
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

test('changes the password from the settings page', async ({ page }) => {
  await login(page);
  await page.goto('/settings');

  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.getByRole('heading', { name: 'Настройки' })).toBeVisible();

  await page.locator('#currentPassword').fill('password123');
  await page.getByLabel('Новый пароль', { exact: true }).fill('new-password-456');
  await page.getByLabel('Повторите новый пароль').fill('new-password-456');
  await page.getByRole('button', { name: 'Изменить пароль' }).click();

  await expect(
    page.getByText('Пароль изменён. Остальные сессии завершены.'),
  ).toBeVisible();
  await expect(page.locator('#currentPassword')).toHaveValue('');
});

test('requests a password reset and completes it from the email link', async ({
  page,
}) => {
  await page.goto('/forgot-password');
  await page.getByLabel('Email').fill('author@example.com');
  await page.getByRole('button', { name: 'Отправить ссылку' }).click();
  await expect(page.getByRole('heading', { name: 'Проверьте почту' })).toBeVisible();

  await page.goto('/reset-password?token=mock-reset');
  await page.getByLabel('Новый пароль').fill('new-password-456');
  await page.getByLabel('Повторите пароль').fill('new-password-456');
  await page.getByRole('button', { name: 'Сохранить пароль' }).click();
  await expect(page.getByRole('heading', { name: 'Пароль обновлён' })).toBeVisible();
});

test('asks for an email code when two-factor login is enabled', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('2fa@example.com');
  await page.getByLabel('Пароль').fill('password123');
  await page.getByRole('button', { name: 'Войти' }).click();

  await expect(page.getByRole('heading', { name: 'Введите код' })).toBeVisible();
  await expect(page.getByLabel('Код из письма')).toBeVisible();
  await page.getByLabel('Код из письма').fill('123456');
  await page.getByRole('button', { name: 'Подтвердить код' }).click();
  await expect(page).toHaveURL(/\/projects$/);
});

test('asks for an authenticator code when TOTP login is enabled', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('totp@example.com');
  await page.getByLabel('Пароль').fill('password123');
  await page.getByRole('button', { name: 'Войти' }).click();

  await expect(page.getByRole('heading', { name: 'Введите код' })).toBeVisible();
  await expect(page.getByLabel('Код из приложения')).toBeVisible();
  await page.getByLabel('Код из приложения').fill('123456');
  await page.getByRole('button', { name: 'Подтвердить код' }).click();
  await expect(page).toHaveURL(/\/projects$/);
});

test('enables two-factor authentication from settings', async ({ page }) => {
  await login(page);
  await page.goto('/settings');

  await page.locator('#twoFactorPassword').fill('password123');
  await page.getByRole('button', { name: 'Включить 2FA' }).click();
  await expect(page.locator('#twoFactorCode')).toBeVisible();
  await page.locator('#twoFactorCode').fill('123456');
  await page.getByRole('button', { name: 'Подтвердить' }).click();

  await expect(page.getByText('Сейчас включена:')).toBeVisible();
});

test('enables TOTP authentication from settings', async ({ page }) => {
  await login(page);
  await page.goto('/settings');

  await page
    .getByLabel('Приложение-аутентификатор (Google Authenticator)')
    .check();
  await page.locator('#twoFactorPassword').fill('password123');
  await page.getByRole('button', { name: 'Включить 2FA' }).click();

  await expect(page.getByText('Отсканируйте QR-код в Google Authenticator')).toBeVisible();
  await expect(page.getByText('JBSWY3DPEHPK3PXP')).toBeVisible();
  await page.locator('#twoFactorCode').fill('123456');
  await page.getByRole('button', { name: 'Подтвердить' }).click();

  await expect(page.getByText('Сейчас включена:')).toBeVisible();
  await expect(page.getByText('приложение-аутентификатор')).toBeVisible();
});

test('starts an email change from settings and confirms it', async ({ page }) => {
  await login(page);
  await page.goto('/settings');

  await page.locator('#newEmail').fill('new-author@example.com');
  await page.locator('#emailCurrentPassword').fill('password123');
  await page.getByRole('button', { name: 'Сменить email' }).click();
  await expect(
    page.getByText(/Письмо для подтверждения отправлено на/),
  ).toBeVisible();

  await page.goto('/confirm-email-change?token=mock-email-change');
  await expect(page.getByRole('heading', { name: 'Email обновлён' })).toBeVisible();
});
