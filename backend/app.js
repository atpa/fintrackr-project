const express = require('express');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const cors = require('cors');
const apiRoutes = require('./routes/index');
const errorMiddleware = require('./middleware/errorMiddleware');

const app = express();

// Security Middleware
app.use(helmet());

// CORS Configuration
const corsOptions = {
    origin: 'http://localhost:5173', // Frontend URL
    credentials: true,
};
app.use(cors(corsOptions));

// Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// API Routes
app.use('/api', apiRoutes);

// Global Error Handler
app.use(errorMiddleware);

module.exports = app;
