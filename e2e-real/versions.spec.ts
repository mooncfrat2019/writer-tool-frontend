import { expect, test } from '@playwright/test';
import { registerAndVerify } from './helpers';

test('creates and restores a document version', async ({ page, request }) => {
  test.setTimeout(180_000);
  const stamp = Date.now();

  await registerAndVerify(page, request, {
    email: `versions+${stamp}@example.com`,
    displayName: 'Версионный Автор',
  });

  await page.getByRole('button', { name: 'Новый проект' }).click();
  const projectDialog = page.getByRole('dialog');
  await projectDialog.getByLabel('Название').fill('Проект версий');
  await projectDialog.getByRole('button', { name: 'Создать проект' }).click();
  await expect(page).toHaveURL(/\/projects\/[^/]+\/structure$/);

  await page.getByRole('button', { name: 'Создать книгу' }).click();
  const bookDialog = page.getByRole('dialog');
  await bookDialog.getByLabel('Название').fill('Книга версий');
  await bookDialog.getByRole('button', { name: 'Создать книгу' }).click();
  await expect(bookDialog).toBeHidden();

  await page.getByRole('button', { name: 'Добавить' }).click();
  await page.getByRole('menuitem', { name: /Глава/ }).click();
  const chapterDialog = page.getByRole('dialog');
  await chapterDialog.getByLabel('Название').fill('Глава версий');
  await chapterDialog.getByRole('button', { name: 'Создать', exact: true }).click();
  await expect(chapterDialog).toBeHidden();

  const tree = page.getByRole('list', { name: 'Структура книги' });
  await tree
    .locator('[data-testid="structure-node-chapter"]')
    .filter({ hasText: 'Глава версий' })
    .click();
  await page.getByRole('button', { name: 'Открыть в редакторе' }).click();
  await expect(page.locator('.ProseMirror')).toBeVisible();
  await expect(page.getByTestId('collab-status')).toHaveAttribute(
    'data-status',
    'connected',
  );

  const editor = page.locator('.ProseMirror');
  await editor.click();
  await page.keyboard.type('Первая версия.');
  await expect(page.getByText('Сохранено')).toBeVisible({ timeout: 10_000 });

  await page.getByRole('button', { name: 'История версий' }).click();
  const historyDialog = page.getByRole('dialog');
  await expect(
    historyDialog.getByRole('heading', { name: 'История версий' }),
  ).toBeVisible();
  await historyDialog
    .getByRole('button', { name: 'Сохранить версию сейчас' })
    .click();
  await expect(
    historyDialog.getByText('Вручную', { exact: true }),
  ).toBeVisible({ timeout: 10_000 });
  await page.keyboard.press('Escape');
  await expect(historyDialog).toBeHidden();

  await editor.click();
  await page.keyboard.press('Control+End');
  await page.keyboard.type(' Вторая версия.');
  await expect(page.getByText('Сохранено')).toBeVisible({ timeout: 10_000 });

  await page.getByRole('button', { name: 'История версий' }).click();
  const manualVersion = page
    .getByRole('listitem')
    .filter({ hasText: 'Вручную' });
  await manualVersion.getByRole('button', { name: 'Восстановить' }).click();
  const confirmDialog = page
    .getByRole('dialog')
    .filter({ hasText: 'Восстановить версию?' });
  await expect(
    confirmDialog.getByRole('heading', { name: 'Восстановить версию?' }),
  ).toBeVisible();
  await confirmDialog
    .getByRole('button', { name: 'Восстановить', exact: true })
    .click();

  await expect(page.locator('.ProseMirror')).toContainText('Первая версия.', {
    timeout: 15_000,
  });
  await expect(page.locator('.ProseMirror')).not.toContainText('Вторая версия.');
});
