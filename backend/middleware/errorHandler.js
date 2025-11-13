const { error } = require('../utils/responses');

module.exports = function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }
  const status = err.status || 500;
  const message = err.message || 'Internal server error';
  const details = err.details;
  if (status >= 500) {
    console.error(err);
  }
  return error(res, message, status, details);
};
