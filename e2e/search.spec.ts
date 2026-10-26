import { expect, test } from '@playwright/test';
import { OWNER_PROJECT, login, openProject } from './helpers';

test('searches documents, characters and worlds across the project', async ({
  page,
}) => {
  await login(page);
  await openProject(page, OWNER_PROJECT);
  await page
    .getByRole('navigation', { name: 'Навигация по проекту' })
    .first()
    .getByRole('link', { name: 'Поиск', exact: true })
    .click();
  await expect(page).toHaveURL(/\/search$/);

  await expect(
    page.getByRole('heading', { name: 'Найти в проекте' }),
  ).toBeVisible();

  const input = page.getByRole('searchbox', { name: 'Поиск по проекту' });

  await input.fill('Серебряный');
  const results = page.getByTestId('search-results');
  await expect(results.getByText('Серебряный порт', { exact: true })).toBeVisible();
  await expect(results.getByText('Локация').first()).toBeVisible();

  await input.fill('Мира');
  await expect(results.getByText('Мира Вейн', { exact: true })).toBeVisible();
  await expect(results.getByText('Персонаж').first()).toBeVisible();

  await input.fill('Астрал');
  await expect(results.getByText('Астрал', { exact: true })).toBeVisible();
  await expect(results.getByText('Мир', { exact: true }).first()).toBeVisible();

  // Type filters narrow the result set.
  await page.getByRole('button', { name: 'Персонажи' }).click();
  await expect(page.getByText('Ничего не нашлось')).toBeVisible();
  await page.getByRole('button', { name: 'Сбросить фильтры' }).click();
  await expect(results.getByText('Астрал', { exact: true })).toBeVisible();

  // A world result opens the world page.
  await results.getByText('Астрал', { exact: true }).click();
  await expect(page).toHaveURL(/\/worlds\/[^/]+$/);
  await expect(page.getByRole('heading', { name: 'Астрал' })).toBeVisible();
});
