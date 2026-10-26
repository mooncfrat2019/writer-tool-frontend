import { expect, test } from '@playwright/test';
import { login, openProject, VIEWER_PROJECT } from './helpers';

test('shows the viewer project structure without edit or delete actions', async ({
  page,
}) => {
  await login(page);
  await openProject(page, VIEWER_PROJECT);

  await expect(page.getByText('Только чтение')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Добавить' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Новая книга' })).toHaveCount(0);
  await expect(page.getByText('Часть I. Июль')).toBeVisible();
  await expect(
    page.getByRole('button', { name: /Переместить «/ }),
  ).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Удалить «/ })).toHaveCount(0);

  const chapter = page
    .locator('[data-testid="structure-node-chapter"]')
    .filter({ hasText: 'Глава 1. Июль' });
  await chapter.getByText('Глава 1. Июль', { exact: true }).click();
  await expect(page.locator('#inspector-title')).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Сохранить карточку' })).toHaveCount(
    0,
  );
  await expect(page.getByRole('button', { name: 'Удалить элемент' })).toHaveCount(0);
  await expect(
    page.getByText('У вас есть доступ только для чтения.'),
  ).toBeVisible();
});

test('keeps characters and exports read-only for a viewer', async ({ page }) => {
  await login(page);
  await openProject(page, VIEWER_PROJECT);
  await page
    .getByRole('navigation', { name: 'Навигация по проекту' })
    .first()
    .getByRole('link', { name: 'Персонажи', exact: true })
    .click();

  await expect(page.getByRole('heading', { name: 'Персонажи' })).toBeVisible();
  await expect(page.getByTestId('character-card')).toHaveCount(1);
  await expect(
    page.getByRole('button', { name: 'Новый персонаж' }),
  ).toHaveCount(0);

  await page.getByTestId('character-card').filter({ hasText: 'Вера' }).click();
  await expect(page.getByRole('heading', { name: 'Вера' })).toBeVisible();
  await expect(page.locator('#profile-name')).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Сохранить профиль' })).toHaveCount(
    0,
  );

  await page.getByRole('tab', { name: 'Связи' }).click();
  await expect(
    page.getByRole('button', { name: 'Добавить связь' }),
  ).toHaveCount(0);

  await page.getByRole('tab', { name: 'Иллюстрации' }).click();
  await expect(page.getByRole('button', { name: 'Загрузить' })).toHaveCount(0);

  await page
    .getByRole('navigation', { name: 'Навигация по проекту' })
    .first()
    .getByRole('link', { name: 'Экспорт', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Экспорт', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(
      'В этом проекте у вас доступ только для чтения, поэтому экспорт недоступен.',
    ),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Экспортировать книгу' }),
  ).toBeDisabled();
  await expect(page.getByText('Экспортов пока нет')).toBeVisible();
});
