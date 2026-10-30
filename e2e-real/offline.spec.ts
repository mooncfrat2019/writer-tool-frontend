import { expect, test } from '@playwright/test';
import { registerAndVerify } from './helpers';

test('merges offline edits after the editor reconnects', async ({
  browser,
  page,
  request,
}) => {
  test.setTimeout(240_000);
  const stamp = Date.now();
  const email = `offline+${stamp}@example.com`;

  await registerAndVerify(page, request, {
    email,
    displayName: 'Офлайн Автор',
  });

  await page.getByRole('button', { name: 'Новый проект' }).click();
  const projectDialog = page.getByRole('dialog');
  await projectDialog.getByLabel('Название').fill('Проект офлайна');
  await projectDialog.getByRole('button', { name: 'Создать проект' }).click();
  await expect(page).toHaveURL(/\/projects\/[^/]+\/structure$/);
  await expect(page.getByText('Начнём с книги')).toBeVisible();

  await page.getByRole('button', { name: 'Создать книгу' }).click();
  const bookDialog = page.getByRole('dialog');
  await bookDialog.getByLabel('Название').fill('Книга офлайна');
  await bookDialog.getByRole('button', { name: 'Создать книгу' }).click();
  await expect(bookDialog).toBeHidden();
  await page.getByRole('button', { name: 'Добавить' }).click();
  await page.getByRole('menuitem', { name: /Глава/ }).click();
  const chapterDialog = page.getByRole('dialog');
  await chapterDialog.getByLabel('Название').fill('Глава офлайна');
  await chapterDialog.getByRole('button', { name: 'Создать', exact: true }).click();
  await expect(chapterDialog).toBeHidden();

  const chapterRow = page
    .getByRole('list', { name: 'Структура книги' })
    .locator('[data-testid="structure-node-chapter"]')
    .filter({ hasText: 'Глава офлайна' });
  await chapterRow.click();
  await page.getByRole('button', { name: 'Открыть в редакторе' }).click();
  await expect(page.locator('.ProseMirror')).toBeVisible();
  await expect(page.getByTestId('collab-status')).toHaveAttribute(
    'data-status',
    'connected',
  );
  await page.locator('.ProseMirror').click();
  await page.keyboard.type('До офлайна.');

  const editorUrl = page.url();
  const secondContext = await browser.newContext();
  const second = await secondContext.newPage();
  await second.goto('/login?service=1');
  await second.getByLabel('Email').fill(email);
  await second.getByLabel('Пароль').fill('password123');
  await second.getByRole('button', { name: 'Войти' }).click();
  await expect(second).toHaveURL(/\/projects$/);
  await second.goto(editorUrl);
  await expect(second.locator('.ProseMirror')).toBeVisible();
  await expect(second.getByTestId('collab-status')).toHaveAttribute(
    'data-status',
    'connected',
  );
  await expect(second.locator('.ProseMirror')).toContainText('До офлайна.');

  // Run the backend with COLLAB_TOKEN_TTL=5s and this flag to prove that a
  // reconnect after expiry refreshes the token instead of failing auth.
  if (process.env.COLLAB_SHORT_TOKEN === '1') {
    await page.waitForTimeout(6_000);
  }

  // The owner keeps editing while the websocket is down.
  await page.context().setOffline(true);
  await page.locator('.ProseMirror').click();
  await page.keyboard.press('Control+End');
  await page.keyboard.type(' Офлайн-правка.');
  await expect(page.locator('.ProseMirror')).toContainText('Офлайн-правка.');
  await second.waitForTimeout(1_000);
  await expect(second.locator('.ProseMirror')).not.toContainText(
    'Офлайн-правка.',
  );

  // Reconnecting replays the missing Yjs updates to the second client.
  await page.context().setOffline(false);
  await expect(second.locator('.ProseMirror')).toContainText('Офлайн-правка.', {
    timeout: 30_000,
  });

  // The edit is durable, not just a relay artifact.
  await second.reload();
  await expect(second.locator('.ProseMirror')).toContainText('Офлайн-правка.');

  await secondContext.close();
});
