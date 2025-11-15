const authService = require('../services/authService');

const register = (req, res, next) => {
    try {
        const user = authService.registerUser(req.body);
        res.status(201).json(user);
    } catch (error) {
        // Ensure the error is passed to the error handling middleware
        // And set a specific status code for this known error
        if (error.message === 'User with this email already exists') {
            error.statusCode = 400;
        }
        next(error);
    }
};

const login = (req, res, next) => {
    try {
        const { accessToken, refreshToken, user } = authService.loginUser(req.body);
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });
        res.json({ accessToken, user });
    } catch (error) {
        error.statusCode = 401;
        next(error);
    }
};

const refresh = (req, res, next) => {
    const { refreshToken } = req.cookies;
    if (!refreshToken) {
        return res.status(401).json({ message: 'Refresh token not found' });
    }

    try {
        const { accessToken, refreshToken: newRefreshToken } = authService.refreshAccessToken(refreshToken);
        res.cookie('refreshToken', newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });
        res.json({ accessToken });
    } catch (error) {
        error.statusCode = 403;
        next(error);
    }
};

const logout = (req, res) => {
    res.clearCookie('refreshToken');
    res.status(200).json({ message: 'Logged out successfully' });
};

module.exports = {
    register,
    login,
    refresh,
    logout,
};
