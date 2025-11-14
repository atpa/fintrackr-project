/**
 * Users Repository
 * Specialized methods for users
 */

const BaseRepository = require("./BaseRepository");

class UsersRepository extends BaseRepository {
  constructor() {
    super("users");
  }

  /**
   * Find user by email
   */
  findByEmail(email) {
    return this.findOneBy({ email: email.toLowerCase() });
  }

  /**
   * Check if email exists
   */
  emailExists(email) {
    return this.findByEmail(email) !== undefined;
  }

  /**
   * Create user with lowercase email
   */
  create(data) {
    const record = {
      email: String(data.email).toLowerCase(),
      name: data.name,
    };
    // Legacy hash (sha256) to satisfy current tests
    if (data.password) {
      const crypto = require("crypto");
      record.password_hash = crypto.createHash("sha256").update(String(data.password)).digest("hex");
    }
    return super.create(record);
  }

  /**
   * Update user settings
   */
  updateSettings(userId, settings) {
    const user = this.findById(userId);
    if (!user) return null;

    return this.update(userId, {
      settings: {
        ...user.settings,
        ...settings,
      },
    });
  }
}

module.exports = UsersRepository;
