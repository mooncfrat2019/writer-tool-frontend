import { expect, test } from '@playwright/test';
import { EXTERNAL_IMAGE_URL, registerAndVerify } from './helpers';

test('creates a world and fills it through the real API', async ({ page, request }) => {
  test.setTimeout(180_000);
  const stamp = Date.now();

  await registerAndVerify(page, request, {
    email: `worlds+${stamp}@example.com`,
    displayName: 'Мировой Автор',
  });

  await page.getByRole('button', { name: 'Новый проект' }).click();
  let dialog = page.getByRole('dialog');
  await dialog.getByLabel('Название').fill('Проект миров');
  await dialog.getByRole('button', { name: 'Создать проект' }).click();
  await expect(page).toHaveURL(/\/projects\/[^/]+\/structure$/);

  await page
    .getByRole('navigation', { name: 'Навигация по проекту' })
    .first()
    .getByRole('link', { name: 'Миры', exact: true })
    .click();
  await expect(page).toHaveURL(/\/worlds$/);
  await expect(page.getByRole('heading', { name: 'Миры', exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Новый мир' }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('Название').fill('Мир тестов');
  await dialog.getByLabel('Тип').fill('fantasy');
  await dialog.getByLabel('Кратко').fill('Мир для проверки реального API');
  await dialog.getByRole('button', { name: 'Создать мир' }).click();
  await expect(page).toHaveURL(/\/worlds\/[^/]+$/);
  await expect(page.getByRole('heading', { name: 'Мир тестов' })).toBeVisible();

  await page.getByRole('button', { name: 'Добавить локацию' }).first().click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('Название').fill('Город тестов');
  await dialog.getByLabel('Тип').fill('city');
  await dialog.getByRole('button', { name: 'Добавить' }).click();
  await expect(page.getByText('Город тестов')).toBeVisible();

  await page.getByRole('tab', { name: 'Фракции' }).click();
  await page.getByRole('button', { name: 'Добавить фракцию' }).first().click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('Название').fill('Орден тестов');
  await dialog.getByLabel('Цели').fill('Проверять миры');
  await dialog.getByRole('button', { name: 'Добавить' }).click();
  await expect(page.getByText('Орден тестов')).toBeVisible();

  await page.getByRole('tab', { name: 'Законы' }).click();
  await page.getByRole('button', { name: 'Добавить закон' }).first().click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('Название').fill('Закон тестов');
  await dialog.getByLabel('Правило').fill('Каждый мир должен проверяться.');
  await dialog.getByRole('button', { name: 'Добавить' }).click();
  await expect(page.getByText('Закон тестов')).toBeVisible();

  await page.getByRole('tab', { name: 'Лор' }).click();
  await page.getByRole('button', { name: 'Добавить запись' }).first().click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('Название').fill('Легенда тестов');
  await dialog.getByLabel('Текст').fill('Так проверяли миры в древности.');
  await dialog.getByRole('button', { name: 'Добавить' }).click();
  await expect(page.getByText('Легенда тестов')).toBeVisible();

  // The world is loaded from PostgreSQL after a full page reload.
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Мир тестов' })).toBeVisible();
  await page.getByRole('tab', { name: 'Локации' }).click();
  await expect(page.getByText('Город тестов')).toBeVisible();
  await page.getByRole('tab', { name: 'Фракции' }).click();
  await expect(page.getByText('Орден тестов')).toBeVisible();
  await page.getByRole('tab', { name: 'Законы' }).click();
  await expect(page.getByText('Закон тестов')).toBeVisible();

  // Custom field definitions are managed from the worlds list.
  await page.getByRole('link', { name: 'Все миры' }).click();
  await expect(page).toHaveURL(/\/worlds$/);
  await page.getByRole('button', { name: 'Поля мира' }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('Название').fill('Климат');
  await dialog.getByRole('button', { name: 'Добавить поле' }).click();
  await expect(dialog.getByText('Климат')).toBeVisible();
  await dialog.getByLabel('Закрыть').click();
  await expect(dialog).toBeHidden();

  await page
    .getByTestId('world-card')
    .filter({ hasText: 'Мир тестов' })
    .click();
  await page.getByRole('button', { name: 'Настроить мир' }).click();
  dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('Климат')).toBeVisible();
  await dialog.getByLabel('Климат').fill('Холодный');
  await dialog.getByRole('button', { name: 'Сохранить' }).click();
  await expect(page.getByText('Мир обновлён.')).toBeVisible();
  await page.getByRole('button', { name: 'Настроить мир' }).click();
  await expect(page.getByRole('dialog').getByLabel('Климат')).toHaveValue(
    'Холодный',
  );
  await page.getByRole('dialog').getByLabel('Закрыть').click();

  // The map background is attached as an external image link.
  await page.getByRole('tab', { name: 'Локации' }).click();
  await page.getByRole('button', { name: 'Карта' }).click();
  await page.getByRole('button', { name: 'Указать фон' }).click();
  const mapDialog = page.getByRole('dialog');
  await mapDialog.locator('#world-map-url').fill(EXTERNAL_IMAGE_URL);
  await mapDialog.getByRole('button', { name: 'Проверить' }).click();
  await expect(mapDialog.getByTestId('world-map-url-preview')).toBeVisible({
    timeout: 15_000,
  });
  await mapDialog.getByRole('button', { name: 'Сохранить фон' }).click();
  await expect(page.getByTestId('location-map-background')).toBeVisible({
    timeout: 15_000,
  });
  await page.reload();
  await page.getByRole('tab', { name: 'Локации' }).click();
  await page.getByRole('button', { name: 'Карта' }).click();
  await expect(page.getByTestId('location-map-background')).toBeVisible();
  await page.getByRole('button', { name: 'Убрать фон' }).click();
  await expect(page.getByTestId('location-map-background')).toHaveCount(0);

  // A character is linked to the world and one of its locations.
  await page
    .getByRole('navigation', { name: 'Навигация по проекту' })
    .first()
    .getByRole('link', { name: 'Персонажи', exact: true })
    .click();
  await page.getByRole('button', { name: 'Новый персонаж' }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('Имя', { exact: true }).fill('Персонаж мира');
  await dialog.getByRole('button', { name: 'Создать персонажа' }).click();
  await expect(
    page.getByRole('heading', { name: 'Персонаж мира' }),
  ).toBeVisible();

  await page.getByLabel('Мир', { exact: true }).click();
  await page.getByRole('option', { name: 'Мир тестов' }).click();
  await page.getByLabel('Локация', { exact: true }).click();
  await page.getByRole('option', { name: 'Город тестов' }).click();
  await page.getByRole('button', { name: 'Сохранить профиль' }).click();
  await expect(page.getByText('Профиль сохранён.')).toBeVisible();

  await page.reload();
  await expect(page.getByLabel('Мир', { exact: true })).toContainText(
    'Мир тестов',
  );
  await expect(page.getByLabel('Локация', { exact: true })).toContainText(
    'Город тестов',
  );

  // Project search finds the location created above.
  await page
    .getByRole('navigation', { name: 'Навигация по проекту' })
    .first()
    .getByRole('link', { name: 'Поиск', exact: true })
    .click();
  await expect(page).toHaveURL(/\/search$/);
  const searchInput = page.getByRole('searchbox', { name: 'Поиск по проекту' });
  await searchInput.fill('Город тестов');
  const results = page.getByTestId('search-results');
  await expect(results.getByText('Город тестов', { exact: true })).toBeVisible();
  await expect(
    results.getByText('Локация', { exact: true }).first(),
  ).toBeVisible();
});
