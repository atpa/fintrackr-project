process.env.FINTRACKR_DISABLE_PERSIST = 'true';

const crypto = require('crypto');
const request = require('supertest');
const serverModule = require('../server');

const baseData = {
  accounts: [
    { id: 1, user_id: 1, name: 'Main account', currency: 'USD', balance: 1000 },
  ],
  categories: [
    { id: 1, user_id: 1, name: 'Salary', kind: 'income' },
    { id: 2, user_id: 1, name: 'Groceries', kind: 'expense' },
  ],
  transactions: [],
  budgets: [
    {
      id: 1,
      user_id: 1,
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
  refreshTokens: [],
  tokenBlacklist: [],
};

function cloneData() {
  return JSON.parse(JSON.stringify(baseData));
}

// Helper to extract cookies from response
function extractCookies(response) {
  const cookies = {};
  const setCookie = response.headers['set-cookie'];
  if (setCookie) {
    setCookie.forEach(cookie => {
      const parts = cookie.split(';')[0].split('=');
      cookies[decodeURIComponent(parts[0])] = decodeURIComponent(parts[1]);
    });
  }
  return cookies;
}

// Helper to create authenticated user and return cookies
async function createAuthenticatedUser(app, userData) {
  const registerResponse = await request(app)
    .post('/api/register')
    .send(userData);
  
  const cookies = extractCookies(registerResponse);
  return cookies;
}

describe('service helpers', () => {
  test('convertAmount converts between supported currencies', () => {
    expect(serverModule.convertAmount(10, 'USD', 'EUR')).toBeCloseTo(9.4);
    expect(serverModule.convertAmount(100, 'EUR', 'USD')).toBeCloseTo(106);
  });

  test('convertAmount falls back to numeric amount for unsupported currency', () => {
    expect(serverModule.convertAmount('15', 'USD', 'XYZ')).toBe(15);
  });
});

describe('API endpoints', () => {
  let app;

  beforeEach(() => {
    serverModule.setData(cloneData());
    app = serverModule.createServer();
  });

  test('GET /api/accounts returns available accounts for authenticated user', async () => {
    const cookies = await createAuthenticatedUser(app, {
      name: 'Test User',
      email: 'test@example.com',
      password: 'testpass123'
    });
    
    const response = await request(app)
      .get('/api/accounts')
      .set('Cookie', `access_token=${cookies.access_token}`)
      .expect(200);
      
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({ name: 'Main account', currency: 'USD' });
  });

  test('POST /api/register stores hashed password and returns public user', async () => {
    const payload = { name: 'Alice', email: 'alice@example.com', password: 'secret123' };

    const response = await request(app).post('/api/register').send(payload).expect(201);

    expect(response.body).toHaveProperty('user');
    expect(response.body.user).toMatchObject({
      id: expect.any(Number),
      name: 'Alice',
      email: 'alice@example.com'
    });
    expect(response.body.user).not.toHaveProperty('password_hash');

    const storedUser = serverModule.getData().users.find((user) => user.email === payload.email);
    expect(storedUser).toBeDefined();
    expect(storedUser.password_hash).toBeDefined();
    expect(typeof storedUser.password_hash).toBe('string');
  });

  test('POST /api/login authenticates registered user', async () => {
    const payload = { name: 'Bob', email: 'bob@example.com', password: 'passw0rd' };
    await request(app).post('/api/register').send(payload).expect(201);

    const response = await request(app)
      .post('/api/login')
      .send({ email: payload.email, password: payload.password })
      .expect(200);

    expect(response.body).toHaveProperty('user');
    expect(response.body.user).toMatchObject({
      id: expect.any(Number),
      email: payload.email,
      name: payload.name
    });
  });

  test('POST /api/login rejects invalid credentials', async () => {
    await request(app)
      .post('/api/register')
      .send({ name: 'Eve', email: 'eve@example.com', password: 'hunter2' })
      .expect(201);

    await request(app)
      .post('/api/login')
      .send({ email: 'eve@example.com', password: 'wrong' })
      .expect(401);
  });

  test('POST /api/transactions updates balances and budgets', async () => {
    const cookies = await createAuthenticatedUser(app, {
      name: 'Test User',
      email: 'test@example.com',
      password: 'testpass123'
    });
    
    const payload = {
      account_id: 1,
      category_id: 2,
      type: 'expense',
      amount: 50,
      currency: 'USD',
      date: '2024-01-15',
      note: 'Groceries',
    };

    const response = await request(app)
      .post('/api/transactions')
      .set('Cookie', `access_token=${cookies.access_token}`)
      .send(payload)
      .expect(201);
      
    expect(response.body).toMatchObject({
      id: expect.any(Number),
      account_id: 1,
      category_id: 2,
      type: 'expense',
    });

    const updatedData = serverModule.getData();
    expect(updatedData.transactions).toHaveLength(1);
    expect(updatedData.accounts[0].balance).toBe(950);
    expect(updatedData.budgets[0].spent).toBe(50);
  });

  test('DELETE /api/categories/:id removes category and associated data', async () => {
    const cookies = await createAuthenticatedUser(app, {
      name: 'Test User',
      email: 'test@example.com',
      password: 'testpass123'
    });
    
    const deleteResponse = await request(app)
      .delete('/api/categories/2')
      .set('Cookie', `access_token=${cookies.access_token}`)
      .expect(200);
      
    expect(deleteResponse.body).toEqual({ success: true });

    const updatedData = serverModule.getData();
    expect(updatedData.categories.find((cat) => cat.id === 2)).toBeUndefined();
    expect(updatedData.budgets).toHaveLength(0);
  });

  test('GET /api/rates returns conversion rate for supported currencies', async () => {
    const response = await request(app).get('/api/rates?base=USD&quote=EUR').expect(200);
    expect(response.body).toEqual({ base: 'USD', quote: 'EUR', rate: expect.any(Number) });
  });
});
