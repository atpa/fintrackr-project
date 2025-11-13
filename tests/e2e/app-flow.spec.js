const { test, expect } = require('@playwright/test');
const serverModule = require('../../backend/server');

const PORT = 4173;

const baseData = {
  accounts: [
    { id: 1, name: 'Everyday Account', currency: 'USD', balance: 1200 },
  ],
  categories: [
    { id: 1, name: 'Salary', kind: 'income' },
    { id: 2, name: 'Groceries', kind: 'expense' },
  ],
  transactions: [
    {
      id: 1,
      account_id: 1,
      category_id: 1,
      type: 'income',
      amount: 1200,
      currency: 'USD',
      date: '2024-01-05',
      note: 'Initial deposit',
    },
  ],
  budgets: [
    {
      id: 1,
      category_id: 2,
      month: '2024-01',
      limit: 500,
      spent: 0,
      type: 'fixed',
      percent: null,
      currency: 'USD',
    },
  ],
  goals: [],
  planned: [],
  users: [],
  bankConnections: [],
  subscriptions: [],
  rules: [],
  recurring: [],
};

function cloneData() {
  return JSON.parse(JSON.stringify(baseData));
}

let httpServer;

async function createAuthenticatedUser(page) {
  const credentials = {
    name: 'Test User',
    email: `e2e-user-${Date.now()}@example.com`,
    password: 'Secret123!',
  };

  await page.request.post('/api/register', {
    data: {
      name: credentials.name,
      email: credentials.email,
      password: credentials.password,
    },
  });

  const response = await page.request.post('/api/login', {
    data: { email: credentials.email, password: credentials.password },
  });
  const user = await response.json();

  await page.evaluate((storedUser) => {
    window.localStorage.setItem('user', JSON.stringify(storedUser));
  }, user);

  return credentials;
}

test.beforeAll(async () => {
  process.env.FINTRACKR_DISABLE_PERSIST = 'true';
  serverModule.setData(cloneData());
  httpServer = serverModule.createServer();
  await new Promise((resolve) => httpServer.listen(PORT, resolve));
});

test.afterAll(async () => {
  if (httpServer) {
    await new Promise((resolve) => httpServer.close(resolve));
  }
});

test.beforeEach(async ({ page }) => {
  serverModule.setData(cloneData());
  await page.goto('/landing.html');
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
});

test('user can register and login via UI', async ({ page }) => {
  const email = `test-user-${Date.now()}@example.com`;
  const password = 'Secret123!';

  await page.goto('/register.html');
  await page.fill('#regName', 'Playwright User');
  await page.fill('#regEmail', email);
  await page.fill('#regPassword', password);
  await page.fill('#regConfirm', password);
  await Promise.all([
    page.waitForURL('**/dashboard.html'),
    page.click('#registerForm button[type="submit"]'),
  ]);

  await page.waitForFunction(() => window.localStorage.getItem('user'));
  const storedEmail = await page.evaluate(() => {
    const raw = window.localStorage.getItem('user');
    return raw ? JSON.parse(raw).email : null;
  });
  expect(storedEmail).toBe(email);

  await page.goto('/login.html');
  await page.evaluate(() => window.localStorage.clear());
  await page.fill('#loginEmail', email);
  await page.fill('#loginPassword', password);
  await Promise.all([
    page.waitForURL('**/dashboard.html'),
    page.click('#loginForm button[type="submit"]'),
  ]);
});

test('user can manage categories and accounts', async ({ page }) => {
  await createAuthenticatedUser(page);
  await page.goto('/categories.html');
  await page.waitForLoadState('networkidle');

  const categoryName = `Новая категория ${Date.now()}`;
  await page.fill('#catName', categoryName);
  await page.selectOption('#catKind', 'expense');
  await Promise.all([
    page.waitForResponse((response) =>
      response.url().endsWith('/api/categories') && response.request().method() === 'POST'
    ),
    page.click('#addCategoryForm button[type="submit"]'),
  ]);
  await page.waitForLoadState('networkidle');

  const categoryRow = page.locator('#categoriesTable tbody tr', {
    hasText: categoryName,
  });
  await categoryRow.first().waitFor({ state: 'visible' });
  await expect(categoryRow).toHaveCount(1);

  const deletePromise = page.waitForResponse((response) =>
    response.url().includes('/api/categories/') && response.request().method() === 'DELETE'
  );
  page.once('dialog', (dialog) => dialog.accept());
  await categoryRow.locator('button').click();
  await deletePromise;
  await page.waitForLoadState('networkidle');
  await expect(categoryRow).toHaveCount(0);

  await page.goto('/accounts.html');
  await page.waitForLoadState('networkidle');

  const accountName = `Travel Fund ${Date.now()}`;
  await page.fill('#accName', accountName);
  await page.selectOption('#accCurrency', 'EUR');
  await page.fill('#accBalance', '150');
  await Promise.all([
    page.waitForResponse((response) =>
      response.url().endsWith('/api/accounts') && response.request().method() === 'POST'
    ),
    page.click('#addAccountForm button[type="submit"]'),
  ]);

  const accountRow = page.locator('#accountsTable tbody tr', {
    hasText: accountName,
  });
  await accountRow.first().waitFor({ state: 'visible' });
  await expect(accountRow).toHaveCount(1);
  await expect(accountRow.locator('td').nth(2)).toHaveText('150.00');
});
