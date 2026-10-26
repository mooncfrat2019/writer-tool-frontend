import { expect, test } from '@playwright/test';
import { login, openProjectSection } from './helpers';

test('searches, filters, creates, edits and deletes a character', async ({
  page,
}) => {
  await login(page);
  await openProjectSection(page, 'Персонажи');

  await expect(page.getByTestId('character-card')).toHaveCount(3);
  await expect(page.getByText('В истории 3 персонажей')).toBeVisible();

  await page.getByLabel('Поиск персонажей').fill('Кай');
  await expect(page.getByTestId('character-card')).toHaveCount(1);
  await expect(page.getByTestId('character-card')).toContainText('Кай Рен');

  await page.getByLabel('Поиск персонажей').fill('');
  await page.getByRole('combobox', { name: 'Фильтр по роли' }).click();
  await page.getByRole('option', { name: 'Антагонист' }).click();
  await expect(page.getByTestId('character-card')).toHaveCount(1);
  await expect(page.getByTestId('character-card')).toContainText('Селина Мор');
  await page.getByRole('combobox', { name: 'Фильтр по роли' }).click();
  await page.getByRole('option', { name: 'Все роли' }).click();
  await expect(page.getByTestId('character-card')).toHaveCount(3);

  await page.getByRole('button', { name: 'Новый персонаж' }).click();
  const createDialog = page.getByRole('dialog');
  await expect(
    createDialog.getByRole('heading', { name: 'Новый персонаж' }),
  ).toBeVisible();
  await createDialog
    .getByRole('textbox', { name: 'Имя', exact: true })
    .fill('Тея Лар');
  await createDialog.getByLabel('Полное имя').fill('Тея Лар из Нижнего города');
  await createDialog.getByLabel('Теги').fill('архивист, сны, Нижний город');
  await createDialog
    .getByLabel('Цель')
    .fill('Найти карту улиц, которых больше нет.');
  await createDialog.getByRole('button', { name: 'Создать персонажа' }).click();
  await expect(createDialog).toBeHidden();

  await expect(page).toHaveURL(/\/characters\/[^/]+$/);
  await expect(page.getByRole('heading', { name: 'Тея Лар', exact: true })).toBeVisible();
  await expect(page.getByText('Тея Лар из Нижнего города')).toBeVisible();

  await page
    .locator('#profile-goal')
    .fill('Найти карту улиц и вернуть украденное имя.');
  await page.getByRole('button', { name: 'Сохранить профиль' }).click();
  await expect(page.getByText('Профиль сохранён.')).toBeVisible();
  await page.reload();
  await expect(page.locator('#profile-goal')).toHaveValue(
    'Найти карту улиц и вернуть украденное имя.',
  );

  await page.getByRole('link', { name: 'Все персонажи' }).click();
  await expect(page.getByTestId('character-card')).toHaveCount(4);
  await expect(page.getByText('В истории 4 персонажей')).toBeVisible();
  await page.getByLabel('Поиск персонажей').fill('Тея');
  await expect(page.getByTestId('character-card')).toHaveCount(1);
  await page.getByTestId('character-card').click();

  await page.getByRole('button', { name: 'Удалить', exact: true }).click();
  const deleteDialog = page.getByRole('dialog');
  await deleteDialog.getByRole('button', { name: 'Удалить персонажа' }).click();
  await expect(deleteDialog).toBeHidden();
  await expect(page).toHaveURL(/\/characters$/);
  await expect(page.getByTestId('character-card')).toHaveCount(3);
});

test('creates and deletes a relation, then edits and deletes an illustration', async ({
  page,
}) => {
  await login(page);
  await openProjectSection(page, 'Персонажи');
  await page
    .getByTestId('character-card')
    .filter({ hasText: 'Мира Вейн' })
    .click();
  await expect(page.getByRole('heading', { name: 'Мира Вейн' })).toBeVisible();

  await page.getByRole('tab', { name: 'Связи' }).click();
  await expect(page.getByText('охотник и добыча')).toBeVisible();
  await page.getByRole('button', { name: 'Добавить связь' }).click();

  const relationDialog = page.getByRole('dialog');
  await expect(
    relationDialog.getByRole('heading', { name: 'Новая связь' }),
  ).toBeVisible();
  await relationDialog.getByLabel('С кем').click();
  await page.getByRole('option', { name: 'Кай Рен' }).click();
  await relationDialog.getByLabel('Тип связи').click();
  await page.getByRole('option', { name: 'Друг', exact: true }).click();
  await relationDialog.getByLabel('Подпись').fill('проверенная связь');
  await relationDialog.getByLabel('Сила').fill('42');
  await relationDialog.getByRole('checkbox', { name: 'Связь взаимна' }).check();
  await relationDialog
    .getByLabel('Заметки')
    .fill('Доверие выросло после архива.');
  await relationDialog.getByRole('button', { name: 'Добавить связь' }).click();
  await expect(relationDialog).toBeHidden();
  await expect(page.getByText('проверенная связь')).toBeVisible();
  await expect(page.getByText('сила +42')).toBeVisible();

  const relationCard = page
    .locator('li')
    .filter({ hasText: 'проверенная связь' });
  await relationCard.getByRole('button', { name: 'Удалить связь' }).click();
  const confirmRelation = page.getByRole('dialog');
  await expect(
    confirmRelation.getByRole('heading', { name: 'Удалить связь?' }),
  ).toBeVisible();
  await confirmRelation
    .getByRole('button', { name: 'Удалить связь' })
    .click();
  await expect(confirmRelation).toBeHidden();
  await expect(page.getByText('проверенная связь')).toHaveCount(0);

  await page.getByRole('tab', { name: 'Иллюстрации' }).click();
  await expect(page.getByText('Мира на площади')).toBeVisible();
  await page.getByRole('button', { name: 'Загрузить' }).click();

  const uploadDialog = page.getByRole('dialog');
  await expect(
    uploadDialog.getByRole('heading', { name: 'Новая иллюстрация' }),
  ).toBeVisible();
  await uploadDialog.locator('#illustration-file').setInputFiles({
    name: 'portrait.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      'base64',
    ),
  });
  await uploadDialog.getByLabel('Подпись').fill('Портрет Миры');
  await uploadDialog.getByRole('button', { name: 'Загрузить' }).click();
  await expect(uploadDialog).toBeHidden();
  await expect(page.getByText('Портрет Миры')).toBeVisible({ timeout: 8_000 });

  const illustrationCard = page
    .locator('li')
    .filter({ hasText: 'Портрет Миры' });
  await illustrationCard
    .getByRole('button', { name: 'Изменить подпись' })
    .click();
  const captionDialog = page.getByRole('dialog');
  await expect(
    captionDialog.getByRole('heading', { name: 'Подпись к иллюстрации' }),
  ).toBeVisible();
  await captionDialog.getByLabel('Подпись').fill('Портрет Миры в пыли');
  await captionDialog.getByRole('button', { name: 'Сохранить' }).click();
  await expect(captionDialog).toBeHidden();
  await expect(page.getByText('Портрет Миры в пыли')).toBeVisible();

  await page
    .locator('li')
    .filter({ hasText: 'Портрет Миры в пыли' })
    .getByRole('button', { name: 'Удалить иллюстрацию' })
    .click();
  const deleteDialog = page.getByRole('dialog');
  await expect(
    deleteDialog.getByRole('heading', { name: 'Удалить иллюстрацию?' }),
  ).toBeVisible();
  await deleteDialog.getByRole('button', { name: 'Удалить', exact: true }).click();
  await expect(deleteDialog).toBeHidden();
  await expect(page.getByText('Портрет Миры в пыли')).toHaveCount(0);
  await expect(page.getByText('Мира на площади')).toBeVisible();
});
