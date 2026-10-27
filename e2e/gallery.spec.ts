import { expect, test } from '@playwright/test';
import { login, openProjectSection } from './helpers';

test('shows project illustrations and links to their owner', async ({ page }) => {
  await login(page);
  await openProjectSection(page, 'Галерея');

  await expect(
    page.getByRole('heading', { name: 'Галерея', exact: true }),
  ).toBeVisible();

  const card = page
    .getByTestId('gallery-card')
    .filter({ hasText: 'Мира на площади' });
  await expect(card).toBeVisible();
  await expect(card.getByRole('link', { name: 'Мира Вейн' })).toBeVisible();

  await card.getByRole('button', { name: /Открыть иллюстрацию/ }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('img')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();

  await card.getByRole('link', { name: 'Мира Вейн' }).click();
  await expect(page).toHaveURL(/\/characters\/[^/]+$/);
  await expect(
    page.getByRole('heading', { name: 'Мира Вейн' }),
  ).toBeVisible();
});
