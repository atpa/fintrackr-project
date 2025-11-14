/**
 * DbBaseRepository (Draft)
 * Abstracts DB operations; falls back to JSON BaseRepository when USE_DB=false.
 */

const { ENV } = require('../config/constants');
const BaseRepository = require('./BaseRepository');
const { connect } = require('../db/connection');

class DbBaseRepository {
  constructor(collectionName) {
    this.collectionName = collectionName;
    this.jsonRepo = new BaseRepository(collectionName);
  }

  async ensureConnection() {
    if (!ENV.USE_DB) return null;
    return await connect();
  }

  async findAll() {
    if (!ENV.USE_DB) return this.jsonRepo.findAll();
    // Placeholder: perform DB query
    return this.jsonRepo.findAll(); // temporary passthrough
  }

  async findBy(filter) {
    if (!ENV.USE_DB) return this.jsonRepo.findBy(filter);
    // Draft: filter in memory until real DB implementation
    const all = await this.findAll();
    return all.filter(item => {
      return Object.entries(filter).every(([k, v]) => item[k] === v);
    });
  }

  async findById(id) {
    if (!ENV.USE_DB) return this.jsonRepo.findById(id);
    return this.jsonRepo.findById(id);
  }

  async create(data) {
    if (!ENV.USE_DB) return this.jsonRepo.create(data);
    return this.jsonRepo.create(data);
  }

  async update(id, updates) {
    if (!ENV.USE_DB) return this.jsonRepo.update(id, updates);
    return this.jsonRepo.update(id, updates);
  }

  async delete(id) {
    if (!ENV.USE_DB) return this.jsonRepo.delete(id);
    return this.jsonRepo.delete(id);
  }

  async paginate({ page = 1, pageSize = 20, filter = {}, sort = null }) {
    const start = (page - 1) * pageSize;
    const list = await this.findBy(filter);
    let sorted = list;
    if (sort && sort.field) {
      sorted = [...list].sort((a, b) => {
        if (a[sort.field] === b[sort.field]) return 0;
        return (a[sort.field] < b[sort.field] ? -1 : 1) * (sort.direction === 'desc' ? -1 : 1);
      });
    }
    return {
      items: sorted.slice(start, start + pageSize),
      total: sorted.length,
      page,
      pageSize,
      pages: Math.ceil(sorted.length / pageSize) || 1,
    };
  }
}

module.exports = DbBaseRepository;
