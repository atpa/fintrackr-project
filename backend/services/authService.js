const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('./databaseService');

const JWT_SECRET = process.env.JWT_SECRET || 'your-default-jwt-secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-default-jwt-refresh-secret';

const findUserByEmail = (email) => {
    db._reload(); // Ensure latest data is loaded
    return db.findOne('users', user => user.email === email);
};

const registerUser = (userData) => {
    const { email, password, name } = userData;
    const existingUser = findUserByEmail(email);
    if (existingUser) {
        throw new Error('User with this email already exists');
    }

    const hashedPassword = bcrypt.hashSync(password, 10); // Using sync version
    const newUser = db.insert('users', { name, email, password: hashedPassword });
    
    // eslint-disable-next-line no-unused-vars
    const { password: _, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
};

const generateTokens = (user) => {
    const accessToken = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ id: user.id }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
    return { accessToken, refreshToken };
};

const loginUser = (credentials) => {
    const { email, password } = credentials;
    const user = findUserByEmail(email);
    if (!user || !user.password) { // Check for user and password property
        throw new Error('Invalid credentials');
    }

    const isPasswordValid = bcrypt.compareSync(password, user.password);
    if (!isPasswordValid) {
        throw new Error('Invalid credentials');
    }

    const tokens = generateTokens(user);
    // eslint-disable-next-line no-unused-vars
    const { password: _, ...userWithoutPassword } = user;

    return { ...tokens, user: userWithoutPassword };
};

const refreshAccessToken = (token) => {
    try {
        const decoded = jwt.verify(token, JWT_REFRESH_SECRET);
        const user = db.findOne('users', u => u.id === decoded.id);
        if (!user) {
            throw new Error('User not found');
        }
        const { accessToken, refreshToken } = generateTokens(user);
        return { accessToken, refreshToken };
    } catch (error) {
        throw new Error('Invalid refresh token');
    }
};

module.exports = {
    registerUser,
    loginUser,
    refreshAccessToken,
    findUserByEmail,
};
