/**
 * Categories Repository
 * Логика работы с категориями (income/expense) + DB passthrough.
 */

const BaseRepository = require('./BaseRepository');
const DbBaseRepository = require('./DbBaseRepository');
const { ENV } = require('../config/constants');

class CategoriesRepository extends BaseRepository {
  constructor() {
    super('categories');
    this.dbRepo = new DbBaseRepository('categories');
  }

  findByUserId(userId) {
    if (ENV.USE_DB) return this.dbRepo.findBy({ user_id: Number(userId) });
    return this.findBy({ user_id: Number(userId) });
  }

  findByType(userId, type) {
    if (ENV.USE_DB) return this.dbRepo.findBy({ user_id: Number(userId), type });
    return this.findBy({ user_id: Number(userId), type });
  }

  findByName(userId, name) {
    return this.findOneBy({ user_id: Number(userId), name });
  }

  ensureCategory(userId, name, type = 'expense') {
    const existing = this.findByName(userId, name);
    if (existing) return existing;
    return this.create({ user_id: Number(userId), name, type });
  }
}

module.exports = CategoriesRepository;
