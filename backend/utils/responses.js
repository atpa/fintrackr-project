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

class AppError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

module.exports = {
  success,
  error,
  AppError,
};
