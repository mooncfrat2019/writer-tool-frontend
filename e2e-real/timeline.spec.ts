import { expect, test } from '@playwright/test';

test('creates a calendar and a timeline event through the real API', async ({
  page,
}) => {
  test.setTimeout(180_000);
  const stamp = Date.now();

  await page.goto('/register');
  await page.getByLabel('Как вас зовут').fill('Хроникёр');
  await page.getByLabel('Email').fill(`timeline+${stamp}@example.com`);
  await page.getByLabel('Пароль').fill('password123');
  await page.getByRole('button', { name: 'Создать аккаунт' }).click();
  await expect(page).toHaveURL(/\/projects$/);

  await page.getByRole('button', { name: 'Новый проект' }).click();
  let dialog = page.getByRole('dialog');
  await dialog.getByLabel('Название').fill('Проект таймлайна');
  await dialog.getByRole('button', { name: 'Создать проект' }).click();
  await expect(page).toHaveURL(/\/projects\/[^/]+\/structure$/);

  await page
    .getByRole('navigation', { name: 'Навигация по проекту' })
    .first()
    .getByRole('link', { name: 'Таймлайн', exact: true })
    .click();
  await expect(page).toHaveURL(/\/timeline$/);
  await expect(
    page.getByRole('heading', { name: 'Таймлайн', exact: true }),
  ).toBeVisible();

  // Calendar: a fresh project has none, so the first one is the default.
  await page.getByRole('button', { name: 'Календарь', exact: true }).click();
  dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Календарей пока нет.')).toBeVisible();
  await dialog.getByLabel('Название').fill('Календарь тестов');
  await dialog.getByRole('button', { name: 'Добавить календарь' }).click();
  await expect(dialog).toBeHidden();
  await page.getByRole('button', { name: 'Календарь', exact: true }).click();
  await expect(dialog.getByText('Календарь тестов')).toBeVisible();
  await page.getByRole('button', { name: 'Отмена' }).click();

  // Plot thread.
  await page.getByRole('button', { name: 'Линии', exact: true }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('Название линии').fill('Линия тестов');
  await dialog.getByRole('button', { name: 'Добавить линию' }).click();
  await expect(dialog.getByText('Линия тестов')).toBeVisible();
  await dialog.getByRole('button', { name: 'Отмена' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText('Линия тестов')).toBeVisible();

  // Event with an exact Gregorian date.
  await page.getByRole('button', { name: 'Событие' }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('Название').fill('Событие тестов');
  await dialog.getByLabel('Описание').fill('Проверка реального API таймлайна');
  await dialog.getByLabel('Год', { exact: true }).fill('2026');
  await dialog.getByLabel('Месяц', { exact: true }).click();
  await page.getByRole('option', { name: 'Октябрь' }).click();
  await dialog.getByLabel('День', { exact: true }).fill('26');
  await dialog.getByLabel('Важность').click();
  await page.getByRole('option', { name: '5 — ключевое' }).click();
  await dialog.getByRole('button', { name: 'Создать событие' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText('Событие тестов')).toBeVisible();

  // Dates survive a reload from PostgreSQL.
  await page.reload();
  await expect(page.getByText('Событие тестов')).toBeVisible();
  await page.getByRole('button', { name: /Событие тестов/ }).first().click();
  dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('Год', { exact: true })).toHaveValue('2026');
  await expect(dialog.getByLabel('День', { exact: true })).toHaveValue('26');
  await dialog.getByRole('button', { name: 'Отмена' }).click();

  // Narrative mode shows the column layout even without structure nodes.
  await page.getByRole('button', { name: 'Повествование' }).click();
  await expect(
    page.getByText('Порядок повествования: главы и сцены слева направо'),
  ).toBeVisible();

  // Importance filter.
  await page.getByLabel('Важность от', { exact: true }).click();
  await page.getByRole('option', { name: '4' }).click();
  await expect(page.getByText('Событие тестов')).toBeVisible();
  await page.getByLabel('Важность от', { exact: true }).click();
  await page.getByRole('option', { name: 'Любая' }).click();
});
