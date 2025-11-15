const request = require('supertest');
const app = require('../app');

// The jest.setup.js file now handles the database reset.
// No need for beforeAll or beforeEach here to manage the file system.

describe('Auth API', () => {
    it('should register a new user successfully', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({
                email: 'register-success@example.com',
                password: 'password123'
            });
        expect(res.statusCode).toEqual(201);
        expect(res.body).toHaveProperty('id');
        expect(res.body.email).toBe('register-success@example.com');
        expect(res.body).not.toHaveProperty('password');
    });

    it('should not register a user with an existing email', async () => {
        // First, create a user
        await request(app)
            .post('/api/auth/register')
            .send({
                email: 'existing@example.com',
                password: 'password123'
            });

        // Then, try to create the same user again
        const res = await request(app)
            .post('/api/auth/register')
            .send({
                email: 'existing@example.com',
                password: 'password123'
            });

        expect(res.statusCode).toEqual(400); // Expecting Bad Request for existing user
        expect(res.body.message).toBe('User with this email already exists');
    });

    it('should login a user with correct credentials', async () => {
        await request(app)
            .post('/api/auth/register')
            .send({
                email: 'login-success@example.com',
                password: 'password123'
            });

        const res = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'login-success@example.com',
                password: 'password123'
            });

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('accessToken');
        expect(res.headers['set-cookie']).toBeDefined();
    });

    it('should reject login with incorrect password', async () => {
        await request(app)
            .post('/api/auth/register')
            .send({
                email: 'wrongpass@example.com',
                password: 'password123'
            });

        const res = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'wrongpass@example.com',
                password: 'wrongpassword'
            });

        expect(res.statusCode).toEqual(401);
        expect(res.body.message).toBe('Invalid credentials');
    });

    it('should refresh the access token using a valid refresh token', async () => {
        await request(app)
            .post('/api/auth/register')
            .send({
                email: 'refresh-token@example.com',
                password: 'password123'
            });
        const loginRes = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'refresh-token@example.com',
                password: 'password123'
            });

        const refreshTokenCookie = loginRes.headers['set-cookie'][0];

        const res = await request(app)
            .post('/api/auth/refresh')
            .set('Cookie', refreshTokenCookie);

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('accessToken');
    });

    it('should logout the user and clear the refresh token cookie', async () => {
        await request(app)
            .post('/api/auth/register')
            .send({
                email: 'logout@example.com',
                password: 'password123'
            });
        const loginRes = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'logout@example.com',
                password: 'password123'
            });

        const refreshTokenCookie = loginRes.headers['set-cookie'][0];

        const res = await request(app)
            .post('/api/auth/logout')
            .set('Cookie', refreshTokenCookie);

        expect(res.statusCode).toEqual(200);
        expect(res.body.message).toBe('Logged out successfully');
        // Check that the cookie is cleared by checking for an expiry date in the past or max-age=0
        const cookieString = res.headers['set-cookie'][0];
        const hasExpired = cookieString.includes('Expires=Thu, 01 Jan 1970 00:00:00 GMT') || cookieString.includes('Max-Age=0');
        expect(cookieString).toContain('refreshToken=;');
        expect(hasExpired).toBe(true);
    });
});
