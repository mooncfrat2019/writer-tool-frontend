import { expect, test } from '@playwright/test';

test('shares a chapter by link and collaborates across users', async ({
  browser,
  page,
}) => {
  test.setTimeout(180_000);

  const stamp = Date.now();
  const ownerEmail = `share-owner+${stamp}@example.com`;
  const recipientEmail = `share-recipient+${stamp}@example.com`;

  await page.goto('/register');
  await page.getByLabel('Как вас зовут').fill('Владелец Книги');
  await page.getByLabel('Email').fill(ownerEmail);
  await page.getByLabel('Пароль').fill('password123');
  await page.getByRole('button', { name: 'Создать аккаунт' }).click();
  await expect(page).toHaveURL(/\/projects$/);

  await page.getByRole('button', { name: 'Новый проект' }).click();
  const projectDialog = page.getByRole('dialog');
  await projectDialog.getByLabel('Название').fill('Проект для шеринга');
  await projectDialog.getByRole('button', { name: 'Создать проект' }).click();
  await expect(page).toHaveURL(/\/projects\/[^/]+\/structure$/);
  await expect(page.getByText('Начнём с книги')).toBeVisible();

  await page.getByRole('button', { name: 'Создать книгу' }).click();
  const bookDialog = page.getByRole('dialog');
  await bookDialog.getByLabel('Название').fill('Книга для шеринга');
  await bookDialog.getByRole('button', { name: 'Создать книгу' }).click();
  await expect(bookDialog).toBeHidden();
  await expect(page.getByText('Структура пока пуста')).toBeVisible();

  await page.getByRole('button', { name: 'Добавить' }).click();
  await page.getByRole('menuitem', { name: /Глава/ }).click();
  const chapterDialog = page.getByRole('dialog');
  await chapterDialog.getByLabel('Название').fill('Глава для шеринга');
  await chapterDialog.getByRole('button', { name: 'Создать', exact: true }).click();
  await expect(chapterDialog).toBeHidden();

  const tree = page.getByRole('list', { name: 'Структура книги' });
  const chapterRow = tree
    .locator('[data-testid="structure-node-chapter"]')
    .filter({ hasText: 'Глава для шеринга' });
  await expect(chapterRow).toBeVisible();
  await chapterRow.click();

  await expect(
    page.getByRole('heading', { name: 'Глава для шеринга' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Поделиться главой' }).click();
  const shareDialog = page.getByRole('dialog');
  await expect(
    shareDialog.getByRole('heading', { name: 'Поделиться главой' }),
  ).toBeVisible();
  await shareDialog.getByRole('button', { name: 'Создать ссылку' }).click();

  const linkInput = shareDialog.getByLabel('Ссылка для доступа');
  await expect(linkInput).toBeVisible();
  const shareUrl = await linkInput.inputValue();
  expect(shareUrl).toContain('/share/');
  await page.keyboard.press('Escape');
  await expect(shareDialog).toBeHidden();

  const recipientContext = await browser.newContext();
  const recipient = await recipientContext.newPage();
  await recipient.goto(shareUrl);
  await expect(recipient.getByText('Глава для шеринга')).toBeVisible();
  await recipient.getByRole('link', { name: 'Создать аккаунт' }).click();
  await expect(
    recipient.getByRole('heading', { name: 'Создать аккаунт' }),
  ).toBeVisible();
  await recipient.getByLabel('Как вас зовут').fill('Соавтор');
  await recipient.getByLabel('Email').fill(recipientEmail);
  await recipient.getByLabel('Пароль').fill('password123');
  await recipient.getByRole('button', { name: 'Создать аккаунт' }).click();

  await expect(recipient).toHaveURL(/\/share\//);
  await recipient.getByRole('button', { name: 'Принять приглашение' }).click();
  await expect(recipient).toHaveURL(/\/shared\/documents\//);
  await expect(recipient.locator('.ProseMirror')).toBeVisible();
  await expect(recipient.getByTestId('collab-status')).toHaveAttribute(
    'data-status',
    'connected',
  );

  await page.getByRole('button', { name: 'Открыть в редакторе' }).click();
  await expect(page.locator('.ProseMirror')).toBeVisible();
  await expect(page.getByTestId('collab-status')).toHaveAttribute(
    'data-status',
    'connected',
  );

  const recipientEditor = recipient.locator('.ProseMirror');
  await recipientEditor.click();
  await recipient.keyboard.type('Привет от соавтора.');
  await expect(page.locator('.ProseMirror')).toContainText('Привет от соавтора.');

  const ownerEditor = page.locator('.ProseMirror');
  await ownerEditor.click();
  await page.keyboard.press('Control+End');
  await page.keyboard.type(' Ответ владельца.');
  await expect(recipientEditor).toContainText('Ответ владельца.');

  await expect(recipient.locator('[title*="Владелец Книги"]')).toHaveCount(1);
  await expect(page.locator('[title*="Соавтор"]')).toHaveCount(1);

  await recipientContext.close();
});
