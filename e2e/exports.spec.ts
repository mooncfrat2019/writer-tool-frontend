import { expect, test } from '@playwright/test';
import { login, openProjectSection } from './helpers';

test('creates an FB2 export with layout options and polls it to completion', async ({
  page,
}) => {
  await login(page);
  await openProjectSection(page, 'Экспорт');

  await expect(page.getByText('Word-документ .docx')).toBeVisible();
  await expect(page.getByText('FictionBook .fb2')).toBeVisible();
  await expect(
    page.getByText('Не удалось собрать сноски главы 2.'),
  ).toBeVisible();
  await expect(
    page.getByText('Обложка не найдена, используется пустая страница.'),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Скачать' }).first(),
  ).toHaveAttribute('href', /example\.com\/exports/);

  await page.locator('label').filter({ hasText: 'FB2.fb2' }).click();
  await expect(page.getByRole('radio', { name: /FB2/ })).toBeChecked();
  await page.getByRole('button', { name: /Параметры вёрстки/ }).click();

  const synopsisOption = page.getByRole('checkbox', {
    name: /Синапсис книги/,
  });
  const notesOption = page.getByRole('checkbox', { name: /^Заметки/ });
  await synopsisOption.check();
  await notesOption.check();
  await expect(synopsisOption).toBeChecked();
  await expect(notesOption).toBeChecked();

  await page.locator('#export-font').click();
  await page.getByRole('option', { name: 'Georgia' }).click();
  await page.locator('#export-font-size').fill('14');
  await page.locator('#export-line-spacing').click();
  await page.getByRole('option', { name: '1,5' }).click();

  await page.getByRole('button', { name: 'Экспортировать книгу' }).click();
  await expect(page.getByText('Экспорт запущен.')).toBeVisible();

  const job = page
    .locator('li')
    .filter({ hasText: 'FictionBook .fb2' })
    .first();
  await expect(job).toBeVisible();
  await expect(job.getByText(/В очереди|Собирается/)).toBeVisible();
  await expect(job.getByText('Готово')).toBeVisible({ timeout: 12_000 });
  await expect(
    job.getByText('Сцены без текста пропущены — это нормально для черновика.'),
  ).toBeVisible();
  await expect(job.getByRole('link', { name: 'Скачать' })).toHaveAttribute(
    'href',
    /example\.com\/exports/,
  );
});
