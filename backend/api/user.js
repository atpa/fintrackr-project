/**
 * User Settings Routes
 * API endpoints for user profile and settings
 */

const { usersRepo } = require("../repositories");
const authService = require("../services/authService");
const { HttpError } = require("../middleware");

/**
 * GET /api/user
 * Get current user profile
 */
async function getUserProfile(req, res) {
  const userId = req.user.id;
  const user = usersRepo.findById(userId);

  if (!user) {
    throw new HttpError("User not found", 404);
  }

  const sanitized = authService.sanitizeUser(user);

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(sanitized));
}

/**
 * PUT /api/user/settings
 * Update user settings
 */
async function updateSettings(req, res) {
  const userId = req.user.id;
  const { name, default_currency, theme } = req.body;

  const updates = {};
  if (name) updates.name = name;
  if (default_currency) updates.default_currency = default_currency;
  if (theme) updates.theme = theme;

  const updated = usersRepo.updateSettings(userId, updates);

  if (!updated) {
    throw new HttpError("User not found", 404);
  }

  const sanitized = authService.sanitizeUser(updated);

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(sanitized));
}

/**
 * PUT /api/user/password
 * Change user password
 */
async function changePassword(req, res) {
  const userId = req.user.id;
  const { currentPassword, newPassword } = req.body;

  // Validation
  if (!currentPassword || !newPassword) {
    throw new HttpError("Missing current or new password", 400);
  }

  const user = usersRepo.findById(userId);
  if (!user) {
    throw new HttpError("User not found", 404);
  }

  // Verify current password
  const isValid = await authService.verifyPassword(currentPassword, user.password_hash);
  if (!isValid) {
    throw new HttpError("Invalid current password", 401);
  }

  // Hash new password
  const newHash = await authService.hashPassword(newPassword);

  // Update password
  const data = require("../services/dataService").getData();
  const userIndex = data.users.findIndex((u) => u.id === userId);
  if (userIndex !== -1) {
    data.users[userIndex].password_hash = newHash;
    require("../services/dataService").persistData();
  }

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify({ success: true }));
}

module.exports = {
  getUserProfile,
  updateSettings,
  changePassword,
};
