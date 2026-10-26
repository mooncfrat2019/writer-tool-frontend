import { expect, test, type Page } from '@playwright/test';
import {
  login,
  OWNER_CHAPTER_ID,
  OWNER_DOCUMENT_ID,
  OWNER_PROJECT_ID,
  VIEWER_CHAPTER_ID,
  VIEWER_PROJECT_ID,
} from './helpers';

async function openOwnerEditor(page: Page): Promise<void> {
  await page.goto(`/projects/${OWNER_PROJECT_ID}/write/${OWNER_CHAPTER_ID}`);
  await expect(page.locator('.ProseMirror')).toBeVisible();
  await expect(page.getByText('Сохранено')).toBeVisible();
}

test('loads the canonical text, formats it, autosaves and restores it after reload', async ({
  page,
}) => {
  await login(page);
  await openOwnerEditor(page);

  const editor = page.locator('.ProseMirror');
  await expect(editor).toContainText('Город просыпался медленно');
  await expect(editor).toContainText('Первое имя было её собственным');
  await expect(
    page.getByRole('toolbar', { name: 'Форматирование текста' }),
  ).toBeVisible();

  await editor.click();
  await page.keyboard.press('Control+End');
  // Give ProseMirror a frame to sync the browser selection before typing.
  await page.waitForTimeout(150);
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Жирный' }).click();
  await expect(editor).toBeFocused();
  await page.keyboard.type('Новая строка проверки.');
  await expect(
    editor.locator('strong').filter({ hasText: 'Новая строка проверки.' }),
  ).toBeVisible();
  await expect(page.getByText('Сохранено')).toBeVisible({ timeout: 6_000 });

  await page.reload();
  await expect(page.locator('.ProseMirror')).toBeVisible();
  await expect(page.locator('.ProseMirror')).toContainText(
    'Новая строка проверки.',
  );
  await expect(
    page.locator('.ProseMirror strong').filter({
      hasText: 'Новая строка проверки.',
    }),
  ).toBeVisible();
});

test('supports headings, lists, undo and focus mode', async ({ page }) => {
  await login(page);
  await openOwnerEditor(page);

  const editor = page.locator('.ProseMirror');
  await editor.click();
  await page.keyboard.press('Control+End');
  // Give ProseMirror a frame to sync the browser selection before typing.
  await page.waitForTimeout(150);
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Заголовок 2' }).click();
  await expect(editor).toBeFocused();
  await page.keyboard.insertText('Сцена вторая');
  await expect(editor.locator('h2')).toContainText('Сцена вторая');

  await page.keyboard.press('Enter');
  const bulletList = page.getByRole('button', {
    name: 'Маркированный список',
  });
  await expect(bulletList).toBeEnabled();
  await bulletList.click();
  await expect(editor).toBeFocused();
  await page.keyboard.insertText('Первый пункт');
  await expect(editor.locator('li')).toContainText('Первый пункт');

  await page.getByRole('button', { name: 'Отменить' }).click();
  await expect(editor.getByText('Первый пункт', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Повторить' }).click();
  await expect(editor.getByText('Первый пункт', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Режим фокуса' }).click();
  await expect(
    page.getByRole('toolbar', { name: 'Форматирование текста' }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Выйти из режима фокуса' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Выйти из режима фокуса' }).click();
  await expect(
    page.getByRole('toolbar', { name: 'Форматирование текста' }),
  ).toBeVisible();
});

test('handles a version conflict by fetching the server version', async ({
  page,
}) => {
  await login(page);
  await openOwnerEditor(page);

  const serverEdit = await page.evaluate(async (documentId) => {
    const documentResponse = await fetch(`/api/v1/documents/${documentId}`);
    const document = (await documentResponse.json()) as { version: number };
    const response = await fetch(`/api/v1/documents/${documentId}/content`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        version: document.version,
        canonical: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'Далёкая серверная правка.',
                },
              ],
            },
          ],
        },
      }),
    });
    return { status: response.status };
  }, OWNER_DOCUMENT_ID);
  expect(serverEdit.status).toBe(200);

  const editor = page.locator('.ProseMirror');
  await editor.click();
  await page.keyboard.press('Control+End');
  await page.keyboard.type('Локальная правка без свежей версии.');

  const conflict = page
    .getByRole('alert')
    .filter({ hasText: 'Документ изменился в другом окне' });
  await expect(conflict).toBeVisible({ timeout: 10_000 });
  await expect(conflict).toContainText(
    'Автосохранение остановлено, чтобы не потерять чужие правки',
  );

  await conflict
    .getByRole('button', { name: 'Загрузить серверную версию' })
    .click();
  await expect(editor).toContainText('Далёкая серверная правка.');
  await expect(
    editor.getByText('Локальная правка без свежей версии.', { exact: false }),
  ).toHaveCount(0);
  await expect(conflict).toHaveCount(0);
  await expect(page.getByText('Сохранено')).toBeVisible();
});

test('opens a viewer document without editing controls', async ({ page }) => {
  await login(page);
  await page.goto(`/projects/${VIEWER_PROJECT_ID}/write/${VIEWER_CHAPTER_ID}`);

  const editor = page.locator('.ProseMirror');
  await expect(editor).toBeVisible();
  await expect(editor).toContainText('В июле сад переставал принадлежать времени');
  await expect(editor).toHaveAttribute('contenteditable', 'false');
  await expect(
    page.getByRole('toolbar', { name: 'Форматирование текста' }),
  ).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Сохранить сейчас' })).toHaveCount(0);
  await expect(page.getByText('Только чтение')).toBeVisible();
  await expect(
    page.getByText(
      'Этот проект доступен вам только для чтения. Текст открыт без возможности редактирования.',
    ),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Режим фокуса' })).toBeVisible();
});
