import { expect, test } from '@playwright/test';
import { login } from './helpers';

test('creates a project and finds it through client-side search', async ({
  page,
}) => {
  await login(page);

  await page.getByRole('button', { name: 'Новый проект' }).click();
  await expect(
    page.getByRole('dialog').getByText('Новый проект', { exact: true }),
  ).toBeVisible();

  await page.getByLabel('Название').fill('Стеклянный Архипелаг');
  await page.getByLabel('Жанр').fill('Научное фэнтези');
  await page.getByLabel('О книге').fill('История островов, которые помнят чужие сны.');
  await page.getByRole('button', { name: 'Создать проект' }).click();

  await expect(page).toHaveURL(/\/projects\/[^/]+\/structure$/);
  await expect(page.getByRole('heading', { name: 'Структура' })).toBeVisible();
  await expect(page.getByText('Начнём с книги')).toBeVisible();

  await page.getByRole('link', { name: 'Все проекты' }).click();
  await expect(page.getByRole('heading', { name: 'Проекты' })).toBeVisible();
  await expect(page.getByTestId('project-card')).toHaveCount(3);

  await page.getByLabel('Поиск по проектам').fill('Архипелаг');
  await expect(page.getByTestId('project-card')).toHaveCount(1);
  await expect(page.getByTestId('project-card')).toContainText(
    'Стеклянный Архипелаг',
  );
  await expect(page.getByTestId('project-card')).toContainText('Научное фэнтези');

  await page.getByLabel('Поиск по проектам').fill('несуществующий проект');
  await expect(page.getByText('Ничего не нашлось')).toBeVisible();
  await page.getByRole('button', { name: 'Очистить поиск' }).click();
  await expect(page.getByTestId('project-card')).toHaveCount(3);
});

test('shows the project role and aggregate counters on cards', async ({ page }) => {
  await login(page);

  const ownerCard = page
    .getByTestId('project-card')
    .filter({ hasText: 'Хроники Пепельной Луны' });
  await expect(ownerCard).toContainText('Владелец');
  await expect(ownerCard).toContainText('1 книга');
  await expect(ownerCard).toContainText('Тёмное фэнтези');

  const viewerCard = page
    .getByTestId('project-card')
    .filter({ hasText: 'Сад незакрытых дверей' });
  await expect(viewerCard).toContainText('Читатель');
});
