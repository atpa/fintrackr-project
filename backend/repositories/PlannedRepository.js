/**
 * Planned Repository
 * Запланированные операции (будущие транзакции) + DB passthrough.
 */

const BaseRepository = require('./BaseRepository');
const DbBaseRepository = require('./DbBaseRepository');
const { ENV } = require('../config/constants');

class PlannedRepository extends BaseRepository {
  constructor() {
    super('planned');
    this.dbRepo = new DbBaseRepository('planned');
  }

  findByUserId(userId) {
    if (ENV.USE_DB) return this.dbRepo.findBy({ user_id: Number(userId) });
    return this.findBy({ user_id: Number(userId) });
  }

  findByCategory(userId, categoryId) {
    if (ENV.USE_DB) return this.dbRepo.findBy({ user_id: Number(userId), category_id: Number(categoryId) });
    return this.findBy({ user_id: Number(userId), category_id: Number(categoryId) });
  }

  async findByDateRange(userId, fromDate, toDate) {
    const list = await this.findByUserId(userId);
    return list.filter(item => {
      const d = new Date(item.date);
      return d >= new Date(fromDate) && d <= new Date(toDate);
    });
  }

  async findUpcoming(userId, fromDate = new Date().toISOString().slice(0,10)) {
    const list = await this.findByUserId(userId);
    return list.filter(item => new Date(item.date) >= new Date(fromDate))
      .sort((a,b) => new Date(a.date) - new Date(b.date));
  }

  async findMonthly(userId, month) { // month: YYYY-MM
    const list = await this.findByUserId(userId);
    return list.filter(item => item.date && item.date.slice(0,7) === month);
  }
}

module.exports = PlannedRepository;
