import { expect, test } from '@playwright/test';
import { EXTERNAL_IMAGE_URL, registerAndVerify } from './helpers';

test('exports a book as DOCX and downloads the generated file', async ({
  page,
  request,
}) => {
  test.setTimeout(180_000);
  const stamp = Date.now();

  await registerAndVerify(page, request, {
    email: `exports+${stamp}@example.com`,
    displayName: 'Экспортный Автор',
  });

  await page.getByRole('button', { name: 'Новый проект' }).click();
  const projectDialog = page.getByRole('dialog');
  await projectDialog.getByLabel('Название').fill('Проект экспорта');
  await projectDialog.getByRole('button', { name: 'Создать проект' }).click();
  await expect(page).toHaveURL(/\/projects\/[^/]+\/structure$/);

  await page.getByRole('button', { name: 'Создать книгу' }).click();
  const bookDialog = page.getByRole('dialog');
  await bookDialog.getByLabel('Название').fill('Книга экспорта');
  await bookDialog.getByRole('button', { name: 'Создать книгу' }).click();
  await expect(bookDialog).toBeHidden();

  // Link a cover. Exports do not fetch third-party images, so the DOCX must
  // report a warning and contain no media entry.
  await page.getByRole('button', { name: 'Обложка' }).click();
  const coverDialog = page.getByRole('dialog');
  await coverDialog.locator('#book-cover-url').fill(EXTERNAL_IMAGE_URL);
  await coverDialog.getByRole('button', { name: 'Проверить' }).click();
  await expect(coverDialog.getByTestId('book-cover-url-preview')).toBeVisible({
    timeout: 15_000,
  });
  await coverDialog.getByRole('button', { name: 'Сохранить обложку' }).click();
  await expect(coverDialog).toBeHidden();
  await expect(page.getByAltText(/^Обложка /)).toBeVisible();

  await page.getByRole('button', { name: 'Добавить' }).click();
  await page.getByRole('menuitem', { name: /Глава/ }).click();
  const chapterDialog = page.getByRole('dialog');
  await chapterDialog.getByLabel('Название').fill('Глава экспорта');
  await chapterDialog.getByRole('button', { name: 'Создать', exact: true }).click();
  await expect(chapterDialog).toBeHidden();

  const tree = page.getByRole('list', { name: 'Структура книги' });
  await tree
    .locator('[data-testid="structure-node-chapter"]')
    .filter({ hasText: 'Глава экспорта' })
    .click();
  await page.getByRole('button', { name: 'Открыть в редакторе' }).click();
  await expect(page.locator('.ProseMirror')).toBeVisible();
  await page.locator('.ProseMirror').click();
  await page.keyboard.type('Текст для экспорта.');
  await expect(page.getByText('Сохранено')).toBeVisible({ timeout: 10_000 });

  await page.getByRole('button', { name: 'Вернуться к структуре' }).click();
  await expect(page).toHaveURL(/\/structure$/);
  await page
    .getByRole('navigation', { name: 'Навигация по проекту' })
    .first()
    .getByRole('link', { name: 'Экспорт' })
    .click();
  await expect(page).toHaveURL(/\/exports$/);

  await page.getByRole('button', { name: 'Экспортировать книгу' }).click();
  await expect(page.getByText('Экспорт запущен.')).toBeVisible();

  const job = page
    .locator('li')
    .filter({ hasText: 'Word-документ .docx' })
    .first();
  await expect(job).toBeVisible();
  await expect(job.getByText('Готово')).toBeVisible({ timeout: 30_000 });
  await expect(job.getByText(/внешние ссылки/)).toBeVisible();

  const download = job.getByRole('link', { name: 'Скачать' });
  await expect(download).toHaveAttribute('href', /\/api\/v1\/dev\/files\//);
  const href = await download.getAttribute('href');
  const response = await page.request.get(href ?? '');
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain(
    'officedocument.wordprocessingml.document',
  );
  expect(response.headers()['content-disposition']).toContain('.docx');
  const body = await response.body();
  expect(body.subarray(0, 2).toString()).toBe('PK');
  // External cover links are skipped with a warning, never downloaded.
  expect(body.includes(Buffer.from('word/media/'))).toBe(false);
});
