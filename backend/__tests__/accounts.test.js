const request = require('supertest');
const app = require('../app');

// The jest.setup.js file now handles the database reset.

describe('Accounts API (Protected)', () => {
    let token;
    let userId;

    // Create a user and log in before each test to ensure isolation
    beforeEach(async () => {
        // Use a unique email for each test run to avoid conflicts
        const userEmail = `accounts-user-${Date.now()}@example.com`;
        const userRes = await request(app)
            .post('/api/auth/register')
            .send({ email: userEmail, password: 'password123' });
        
        // Check if user creation was successful
        if (userRes.statusCode !== 201) {
            console.error('Failed to create user for test:', userRes.body);
        }
        userId = userRes.body.id;

        const loginRes = await request(app)
            .post('/api/auth/login')
            .send({ email: userEmail, password: 'password123' });
        
        token = loginRes.body.accessToken;
    });

    it('should reject access to /api/accounts without a token', async () => {
        const res = await request(app).get('/api/accounts');
        expect(res.statusCode).toEqual(401);
    });

    it('should reject access to /api/accounts with an invalid token', async () => {
        const res = await request(app)
            .get('/api/accounts')
            .set('Authorization', 'Bearer invalidtoken');
        expect(res.statusCode).toEqual(401);
    });

    it("should allow access to /api/accounts with a valid token and return only user's accounts", async () => {
        // This test now relies on the user created in beforeAll
        const res = await request(app)
            .get('/api/accounts')
            .set('Authorization', `Bearer ${token}`);
        
        expect(res.statusCode).toEqual(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBe(0); // The new user should have no accounts yet.
    });

    it('should create a new account for the authenticated user', async () => {
        const res = await request(app)
            .post('/api/accounts')
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: 'Test Account',
                balance: 1000,
                currency: 'USD'
            });

        expect(res.statusCode).toEqual(201);
        expect(res.body).toHaveProperty('id');
        expect(res.body.name).toBe('Test Account');
        expect(res.body.userId).toBe(userId);

        // Verify the account was actually created
        const getRes = await request(app)
            .get('/api/accounts')
            .set('Authorization', `Bearer ${token}`);
        
        expect(getRes.body.length).toBe(1);
        expect(getRes.body[0].name).toBe('Test Account');
    });
});
