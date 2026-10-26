import { expect, test } from '@playwright/test';
import { login, openProject } from './helpers';

test('creates a book and switches between books of the project', async ({
  page,
}) => {
  await login(page);
  await openProject(page);

  await page.getByRole('button', { name: 'Новая книга' }).click();
  const dialog = page.getByRole('dialog');
  await expect(
    dialog.getByRole('heading', { name: 'Новая книга' }),
  ).toBeVisible();

  await dialog.getByLabel('Название').fill('Книга вторая. Тени');
  await dialog.getByLabel('Подзаголовок').fill('Хроники Пепельной Луны');
  await dialog.getByLabel('Синопсис').fill('Город открывает вторую сторону улиц.');
  await dialog.getByLabel('Целевой объём, слов').fill('90000');
  await dialog.getByRole('button', { name: 'Создать книгу' }).click();

  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(/\/structure\?bookId=/);
  await expect(
    page.getByRole('heading', { name: 'Книга вторая. Тени' }).first(),
  ).toBeVisible();
  await expect(page.getByText('Структура пока пуста')).toBeVisible();
  await expect(
    page.getByRole('combobox', { name: 'Выбрать книгу' }),
  ).toContainText('Книга вторая. Тени');

  await page.getByRole('combobox', { name: 'Выбрать книгу' }).click();
  await page.getByRole('option', { name: 'Книга первая. Пепел' }).click();

  await expect(page.getByText('Часть I. Город, который забыл')).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Книга первая. Пепел' }).first(),
  ).toBeVisible();
});

test('creates nested nodes, edits the inspector and deletes a subtree safely', async ({
  page,
}) => {
  await login(page);
  await openProject(page);

  await page.getByRole('button', { name: 'Добавить' }).click();
  await page.getByRole('menuitem', { name: /Глава/ }).click();

  const createDialog = page.getByRole('dialog');
  await expect(
    createDialog.getByRole('heading', { name: 'Новая глава' }),
  ).toBeVisible();
  await createDialog.getByLabel('Название').fill('Глава 4. Проверка');
  await createDialog
    .getByLabel('Синопсис')
    .fill('Мира возвращается к списку имён.');
  await createDialog.getByLabel('Целевой объём, слов').fill('4200');
  await createDialog.getByRole('button', { name: 'Создать', exact: true }).click();
  await expect(createDialog).toBeHidden();

  const tree = page.getByRole('list', { name: 'Структура книги' });
  await expect(
    tree.locator('[data-testid="structure-node-chapter"]').filter({
      hasText: 'Глава 4. Проверка',
    }),
  ).toBeVisible();

  await page.locator('#inspector-title').fill('Глава 4. Пепел на пальцах');
  await page.locator('#inspector-status').click();
  await page.getByRole('option', { name: 'Готово' }).click();
  await page.locator('#inspector-pov').click();
  await page.getByRole('option', { name: 'Мира Вейн' }).click();
  await page
    .locator('#inspector-synopsis')
    .fill('Список имён меняется, пока Мира читает его.');
  await page.locator('#inspector-target').fill('4300');
  await page
    .locator('#inspector-notes')
    .fill('Проверить связь со сценой на площади.');
  await page.getByRole('button', { name: 'Сохранить карточку' }).click();

  await expect(page.getByText('Карточка обновлена.')).toBeVisible();
  await expect(
    tree.locator('[data-testid="structure-node-chapter"]').filter({
      hasText: 'Глава 4. Пепел на пальцах',
    }),
  ).toBeVisible();

  const parentRow = tree
    .locator('[data-testid="structure-node-chapter"]')
    .filter({ hasText: 'Глава 4. Пепел на пальцах' });
  await parentRow.hover();
  await page
    .getByRole('button', {
      name: 'Добавить вложенный элемент в «Глава 4. Пепел на пальцах»',
    })
    .click();

  const sceneDialog = page.getByRole('dialog');
  await expect(
    sceneDialog.getByRole('heading', { name: 'Новая сцена' }),
  ).toBeVisible();
  await sceneDialog.getByLabel('Название').fill('Сцена 4.1. Тени на стене');
  await sceneDialog.getByRole('button', { name: 'Создать', exact: true }).click();
  await expect(sceneDialog).toBeHidden();
  await expect(
    tree.locator('[data-testid="structure-node-scene"]').filter({
      hasText: 'Сцена 4.1. Тени на стене',
    }),
  ).toBeVisible();

  await page
    .getByRole('button', {
      name: 'Удалить «Глава 4. Пепел на пальцах»',
    })
    .click();
  const deleteDialog = page.getByRole('dialog');
  await expect(
    deleteDialog.getByRole('heading', { name: 'Удалить элемент?' }),
  ).toBeVisible();
  await expect(deleteDialog).toContainText('1 вложенный элемент');
  const confirmDelete = deleteDialog.getByRole('button', {
    name: 'Удалить',
    exact: true,
  });
  await expect(confirmDelete).toBeDisabled();
  await deleteDialog.getByRole('checkbox').check();
  await expect(confirmDelete).toBeEnabled();
  await confirmDelete.click();
  await expect(deleteDialog).toBeHidden();

  await expect(
    tree.getByText('Глава 4. Пепел на пальцах', { exact: true }),
  ).toHaveCount(0);
  await expect(
    tree.getByText('Сцена 4.1. Тени на стене', { exact: true }),
  ).toHaveCount(0);
  await expect(page.getByText('План книги')).toBeVisible();

  await page.reload();
  await expect(page.getByText('План книги')).toBeVisible();
  await expect(page.getByText('Глава 4. Пепел на пальцах', { exact: true })).toHaveCount(
    0,
  );
});

test('reorders chapters by dragging and persists the new order', async ({
  page,
}) => {
  await login(page);
  await openProject(page);

  const tree = page.getByRole('list', { name: 'Структура книги' });
  const chapters = tree.locator('[data-testid="structure-node-chapter"]');
  await expect(chapters.nth(0)).toContainText('Глава 1. Пробуждение');
  await expect(chapters.nth(1)).toContainText('Глава 2. Список');

  const handle = page.getByRole('button', {
    name: 'Переместить «Глава 2. Список»',
  });
  const targetRow = chapters.filter({ hasText: 'Глава 1. Пробуждение' });
  const sourceBox = await handle.boundingBox();
  const targetBox = await targetRow.boundingBox();
  if (!sourceBox || !targetBox) {
    throw new Error('Не удалось найти элементы структуры для перетаскивания.');
  }

  await page.mouse.move(
    sourceBox.x + sourceBox.width / 2,
    sourceBox.y + sourceBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    targetBox.x + targetBox.width / 2,
    targetBox.y + targetBox.height * 0.2,
    { steps: 15 },
  );
  await page.mouse.up();

  await expect(page.getByText('Сохраняем порядок…')).toBeHidden();
  await expect(chapters.nth(0)).toContainText('Глава 2. Список');
  await expect(chapters.nth(1)).toContainText('Глава 1. Пробуждение');

  await page.reload();
  await expect(chapters.nth(0)).toContainText('Глава 2. Список');
  await expect(chapters.nth(1)).toContainText('Глава 1. Пробуждение');
});
