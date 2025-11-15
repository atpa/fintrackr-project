// Используем AppError из errorHandler.js для единообразия
const { AppError } = require('../middleware/errorHandler');

function success(res, data, status = 200) {
  return res.status(status).json({ success: true, data });
}

function error(res, message, status = 400, details) {
  const payload = { success: false, error: message };
  if (details !== undefined) {
    payload.details = details;
  }
  return res.status(status).json(payload);
}

module.exports = {
  success,
  error,
  AppError, // Реэкспорт для обратной совместимости
};
