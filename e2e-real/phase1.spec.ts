import { expect, test } from '@playwright/test';

test('registers, restores the session and writes through the real API', async ({
  page,
  request,
}) => {
  test.setTimeout(120_000);

  const health = await request.get('http://localhost:8080/healthz');
  expect(health.ok()).toBeTruthy();

  const email = `e2e-real+${Date.now()}@example.com`;

  await page.goto('/register');
  await page.getByLabel('Как вас зовут').fill('Интеграционный Автор');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Пароль').fill('password123');
  await page.getByRole('button', { name: 'Создать аккаунт' }).click();

  await expect(page).toHaveURL(/\/projects$/);
  await expect(page.getByRole('heading', { name: 'Проекты' })).toBeVisible();

  // The access token lives in memory; a reload must restore the session
  // through the HttpOnly refresh cookie and the real /auth/refresh endpoint.
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Проекты' })).toBeVisible();

  await page.getByRole('button', { name: 'Новый проект' }).click();
  const projectDialog = page.getByRole('dialog');
  await projectDialog.getByLabel('Название').fill('Интеграционный проект');
  await projectDialog.getByLabel('Жанр').fill('Тестовый жанр');
  await projectDialog.getByRole('button', { name: 'Создать проект' }).click();

  await expect(page).toHaveURL(/\/projects\/[^/]+\/structure$/);
  await expect(page.getByText('Начнём с книги')).toBeVisible();

  await page.getByRole('button', { name: 'Создать книгу' }).click();
  const bookDialog = page.getByRole('dialog');
  await bookDialog.getByLabel('Название').fill('Интеграционная книга');
  await bookDialog.getByRole('button', { name: 'Создать книгу' }).click();
  await expect(bookDialog).toBeHidden();
  await expect(page.getByText('Структура пока пуста')).toBeVisible();

  await page.getByRole('button', { name: 'Добавить' }).click();
  await page.getByRole('menuitem', { name: /Глава/ }).click();
  const chapterDialog = page.getByRole('dialog');
  await chapterDialog.getByLabel('Название').fill('Глава интеграции');
  await chapterDialog.getByRole('button', { name: 'Создать', exact: true }).click();
  await expect(chapterDialog).toBeHidden();

  const tree = page.getByRole('list', { name: 'Структура книги' });
  const chapterRow = tree
    .locator('[data-testid="structure-node-chapter"]')
    .filter({ hasText: 'Глава интеграции' });
  await expect(chapterRow).toBeVisible();
  await chapterRow.click();

  await page.getByRole('button', { name: 'Открыть в редакторе' }).click();
  await expect(page.locator('.ProseMirror')).toBeVisible();

  const editor = page.locator('.ProseMirror');
  await editor.click();
  const saveResponse = page.waitForResponse(
    (response) =>
      response.url().includes('/documents/') &&
      response.url().endsWith('/content') &&
      response.request().method() === 'PUT' &&
      response.ok(),
  );
  await page.keyboard.type('Интеграционный тест реального API.');
  await saveResponse;
  await expect(page.getByText('Сохранено')).toBeVisible();

  await page.reload();
  await expect(page.locator('.ProseMirror')).toBeVisible();
  await expect(page.locator('.ProseMirror')).toContainText(
    'Интеграционный тест реального API.',
  );

  await page.getByRole('button', { name: 'Вернуться к структуре' }).click();
  await expect(page.getByRole('heading', { name: 'Структура' })).toBeVisible();

  await page
    .getByRole('navigation', { name: 'Навигация по проекту' })
    .first()
    .getByRole('link', { name: 'Персонажи', exact: true })
    .click();
  await expect(page.getByRole('heading', { name: 'Персонажи', exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Новый персонаж' }).click();
  const characterDialog = page.getByRole('dialog');
  await characterDialog.getByLabel('Имя', { exact: true }).fill('Интеграционная Мира');
  await characterDialog.getByRole('button', { name: 'Создать персонажа' }).click();
  await expect(characterDialog).toBeHidden();
  await expect(page.getByText('Интеграционная Мира')).toBeVisible();
});
