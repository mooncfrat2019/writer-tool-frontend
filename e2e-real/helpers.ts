import { expect, type APIRequestContext, type Page } from '@playwright/test';

const MAILPIT_URL = (process.env.MAILPIT_URL ?? 'http://localhost:8025').replace(
  /\/$/,
  '',
);

type Registration = {
  email: string;
  displayName: string;
  password?: string;
};

/**
 * Fills the registration form that is already open and confirms the address
 * through Mailpit. The caller is left signed in on /projects.
 */
export async function completeRegistration(
  page: Page,
  request: APIRequestContext,
  { email, displayName, password = 'password123' }: Registration,
): Promise<void> {
  await page.getByLabel('Как вас зовут').fill(displayName);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Пароль').fill(password);
  await page.getByRole('button', { name: 'Создать аккаунт' }).click();

  await expect(page.getByRole('heading', { name: 'Проверьте почту' })).toBeVisible();
  const token = await waitForVerificationToken(request, email);

  await page.goto(`/verify-email?token=${encodeURIComponent(token)}`);
  await expect(page).toHaveURL(/\/projects$/);
}

/** Opens /register, creates an account and confirms its email. */
export async function registerAndVerify(
  page: Page,
  request: APIRequestContext,
  registration: Registration,
): Promise<void> {
  await page.goto('/register');
  await completeRegistration(page, request, registration);
}

async function waitForVerificationToken(
  request: APIRequestContext,
  email: string,
): Promise<string> {
  const deadline = Date.now() + 20_000;
  let lastStatus = 'no response';

  while (Date.now() < deadline) {
    const search = await request.get(
      `${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}&limit=5`,
    );
    if (!search.ok()) {
      lastStatus = `search returned ${search.status()}`;
      await pause();
      continue;
    }
    const body = (await search.json()) as { messages?: Array<{ ID: string }> };
    for (const message of body.messages ?? []) {
      const response = await request.get(
        `${MAILPIT_URL}/api/v1/message/${message.ID}`,
      );
      if (!response.ok()) {
        lastStatus = `message returned ${response.status()}`;
        continue;
      }
      const payload = (await response.json()) as { Text?: string; HTML?: string };
      const text = payload.Text || payload.HTML || '';
      const match = text.match(/\/verify-email\?token=([A-Za-z0-9_-]+)/);
      if (match) {
        return match[1];
      }
    }
    await pause();
  }

  throw new Error(
    `Mailpit at ${MAILPIT_URL} did not deliver a confirmation email for ${email} ` +
      `(${lastStatus}). Start it with ` +
      '`docker compose -f deploy/docker-compose.yml up -d mailpit` and run the API ' +
      'with MAIL_DRIVER=smtp and SMTP_ADDR=localhost:1025.',
  );
}

function pause(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 300));
}
