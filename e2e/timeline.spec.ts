import { expect, test } from '@playwright/test';
import { login, openProjectSection } from './helpers';

const PROPHECY_THREAD_ID = 'dddddddd-1002-4ddd-8ddd-dddddddddddd';

test('creates, filters and persists timeline events', async ({ page }) => {
  await login(page);
  await openProjectSection(page, 'Таймлайн');

  await expect(page.getByRole('heading', { name: 'Таймлайн' })).toBeVisible();
  await expect(page.getByText('Падение Пепельной Луны')).toBeVisible();
  await expect(page.getByText('Пророчество о семи годах')).toBeVisible();

  // Narrative mode shows the chapter columns.
  await page.getByRole('button', { name: 'Повествование' }).click();
  await expect(page.getByText('Глава 1. Пробуждение').first()).toBeVisible();
  await page.getByRole('button', { name: 'Мир' }).click();

  // Create an event through the dialog.
  await page.getByRole('button', { name: 'Событие' }).click();
  let dialog = page.getByRole('dialog');
  await dialog.getByLabel('Название').fill('Тестовое событие');
  await dialog.getByLabel('Год', { exact: true }).fill('344');
  await dialog.getByLabel('Месяц', { exact: true }).click();
  await page.getByRole('option', { name: 'Зимородок' }).click();
  await dialog.getByLabel('День', { exact: true }).fill('5');
  await dialog.getByRole('button', { name: 'Создать событие' }).click();
  await expect(page.getByText('Тестовое событие')).toBeVisible();

  // Open the new event and check that the editor reads it back.
  await page
    .getByRole('button', { name: /Тестовое событие/ })
    .first()
    .click();
  dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Событие таймлайна')).toBeVisible();
  await expect(dialog.getByLabel('Год', { exact: true })).toHaveValue('344');
  await dialog.getByRole('button', { name: 'Отмена' }).click();

  // Filter by plot thread.
  await page.getByLabel('Линия сюжета', { exact: true }).click();
  await page.getByRole('option', { name: 'Пророчества' }).click();
  await expect(page.getByText('Пророчество о семи годах')).toBeVisible();
  await expect(page.getByText('Падение Пепельной Луны')).toHaveCount(0);
  await page.getByLabel('Линия сюжета', { exact: true }).click();
  await page.getByRole('option', { name: 'Все линии' }).click();

  // Calendar management.
  await page.getByRole('button', { name: 'Календарь', exact: true }).click();
  dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Летопись Пепельной Луны')).toBeVisible();
  await dialog.getByLabel('Название').fill('Второй календарь');
  await dialog.getByRole('button', { name: 'Добавить календарь' }).click();
  await expect(dialog).toBeHidden();
  await page.getByRole('button', { name: 'Календарь', exact: true }).click();
  await expect(page.getByText('Второй календарь')).toBeVisible();
  await page.getByRole('button', { name: 'Отмена' }).click();

  // The mock state persists through a reload.
  await page.reload();
  await expect(page.getByText('Тестовое событие')).toBeVisible();

  // Move the event to another thread by drag is covered by the canvas code;
  // here we verify the plot thread filter still works after reload.
  await page.getByLabel('Линия сюжета', { exact: true }).click();
  await page.getByRole('option', { name: 'Основная линия' }).click();
  await expect(page.getByText('Тестовое событие')).toBeVisible();
});

test('drags an event to a new date and plot thread', async ({ page }) => {
  await login(page);
  await openProjectSection(page, 'Таймлайн');

  const card = page
    .getByRole('button', { name: /Падение Пепельной Луны/ })
    .first();
  await expect(card).toBeVisible();
  const startBox = await card.boundingBox();
  expect(startBox).not.toBeNull();
  if (!startBox) {
    return;
  }

  // Horizontal drag changes the calendar date.
  const dateRequest = page.waitForRequest(
    (request) =>
      request.method() === 'PATCH' &&
      /\/api\/v1\/timeline-events\//.test(request.url()),
  );
  await page.mouse.move(
    startBox.x + startBox.width / 2,
    startBox.y + startBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    startBox.x + startBox.width / 2 + 180,
    startBox.y + startBox.height / 2,
    { steps: 12 },
  );
  await page.mouse.up();
  const dateBody = (await dateRequest).postDataJSON() as {
    startValue?: number;
  };
  expect(typeof dateBody.startValue).toBe('number');
  expect(dateBody.startValue).not.toBe(20887);

  // Vertical drag moves the event into another plot thread lane.
  await expect(
    page.getByRole('button', { name: /Падение Пепельной Луны/ }).first(),
  ).toBeVisible();
  await page.waitForTimeout(400);
  const movedBox = await page
    .getByRole('button', { name: /Падение Пепельной Луны/ })
    .first()
    .boundingBox();
  const lane = page.locator(`[data-lane-id="${PROPHECY_THREAD_ID}"]`);
  const laneBox = await lane.boundingBox();
  expect(movedBox).not.toBeNull();
  expect(laneBox).not.toBeNull();
  if (!movedBox || !laneBox) {
    return;
  }

  const laneRequest = page.waitForRequest(
    (request) =>
      request.method() === 'PATCH' &&
      /\/api\/v1\/timeline-events\//.test(request.url()),
  );
  await page.mouse.move(
    movedBox.x + movedBox.width / 2,
    movedBox.y + movedBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    movedBox.x + movedBox.width / 2,
    laneBox.y + laneBox.height / 2,
    { steps: 15 },
  );
  await page.mouse.up();
  const laneBody = (await laneRequest).postDataJSON() as {
    plotThreadId?: string;
  };
  expect(laneBody.plotThreadId).toBe(PROPHECY_THREAD_ID);
  await expect(
    lane.getByRole('button', { name: /Падение Пепельной Луны/ }),
  ).toBeVisible();
});

test('links an event to a location, faction and lore', async ({ page }) => {
  await login(page);
  await openProjectSection(page, 'Таймлайн');

  await page
    .getByRole('button', { name: /Падение Пепельной Луны/ })
    .first()
    .click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Событие таймлайна')).toBeVisible();

  const addLink = async (type: string, option: string) => {
    await dialog.getByLabel('Тип связи').click();
    await page.getByRole('option', { name: type, exact: true }).click();
    await dialog.getByLabel('Сущность').click();
    await page.getByRole('option', { name: option, exact: true }).click();
    await dialog.getByRole('button', { name: 'Добавить связь' }).click();
  };

  const linkRow = (text: string) => dialog.locator('li').filter({ hasText: text });

  await addLink('Локация', 'Серебряный порт · Астрал');
  await expect(linkRow('Локация: Серебряный порт')).toBeVisible();

  await addLink('Фракция', 'Сновидцы · Астрал');
  await expect(linkRow('Фракция: Сновидцы')).toBeVisible();

  await addLink('Лор', 'Сон о городе · Астрал');
  await expect(linkRow('Лор: Сон о городе')).toBeVisible();

  // Reopen the event: links come back from the API.
  await dialog.getByRole('button', { name: 'Отмена' }).click();
  await page
    .getByRole('button', { name: /Падение Пепельной Луны/ })
    .first()
    .click();
  const reopened = page.getByRole('dialog');
  await expect(
    reopened.locator('li').filter({ hasText: 'Серебряный порт' }),
  ).toBeVisible();
  await expect(
    reopened.locator('li').filter({ hasText: 'Сновидцы' }),
  ).toBeVisible();
  await expect(
    reopened.locator('li').filter({ hasText: 'Сон о городе' }),
  ).toBeVisible();
});

test('edits an existing calendar config', async ({ page }) => {
  await login(page);
  await openProjectSection(page, 'Таймлайн');

  await page.getByRole('button', { name: 'Календарь', exact: true }).click();
  let dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Летопись Пепельной Луны')).toBeVisible();
  await dialog
    .getByRole('button', { name: 'Редактировать календарь' })
    .first()
    .click();
  await expect(
    dialog.getByText('Редактирование: Летопись Пепельной Луны'),
  ).toBeVisible();

  await dialog.getByLabel('Название').fill('Летопись с правкой');
  const config = JSON.parse(
    await dialog.getByLabel('Конфиг (JSON)').inputValue(),
  );
  config.months[0].days = 29;
  await dialog
    .getByLabel('Конфиг (JSON)')
    .fill(JSON.stringify(config, null, 2));
  await dialog.getByRole('button', { name: 'Сохранить календарь' }).click();
  await expect(dialog).toBeHidden();

  await page.getByRole('button', { name: 'Календарь', exact: true }).click();
  dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Летопись с правкой')).toBeVisible();
  await dialog
    .getByRole('button', { name: 'Редактировать календарь' })
    .first()
    .click();
  const saved = JSON.parse(
    await dialog.getByLabel('Конфиг (JSON)').inputValue(),
  );
  expect(saved.months[0].days).toBe(29);
});
