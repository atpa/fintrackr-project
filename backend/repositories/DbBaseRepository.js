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
    const { getDb } = require('../db/connection');
    const db = getDb();
    if (!db) return this.jsonRepo.findAll(); // stub fallback
    const col = db.collection(this.collectionName);
    try {
      const docs = await col.find({}).toArray();
      return docs.map(this._mapDoc.bind(this));
    } catch (e) {
      console.error(`[DB] findAll error in ${this.collectionName}:`, e.message);
      return this.jsonRepo.findAll();
    }
  }

  async findBy(filter) {
    if (!ENV.USE_DB) return this.jsonRepo.findBy(filter);
    const { getDb } = require('../db/connection');
    const db = getDb();
    if (!db) {
      const all = await this.findAll();
      return all.filter(item => Object.entries(filter).every(([k,v]) => item[k] === v));
    }
    const col = db.collection(this.collectionName);
    try {
      const query = this._buildQuery(filter);
      const docs = await col.find(query).toArray();
      return docs.map(this._mapDoc.bind(this));
    } catch (e) {
      console.error(`[DB] findBy error in ${this.collectionName}:`, e.message);
      const all = await this.findAll();
      return all.filter(item => Object.entries(filter).every(([k,v]) => item[k] === v));
    }
  }

  async findById(id) {
    if (!ENV.USE_DB) return this.jsonRepo.findById(id);
    const { getDb } = require('../db/connection');
    const db = getDb();
    if (!db) return this.jsonRepo.findById(id);
    const col = db.collection(this.collectionName);
    try {
      const doc = await col.findOne({ id: Number(id) });
      return doc ? this._mapDoc(doc) : null;
    } catch (e) {
      console.error(`[DB] findById error in ${this.collectionName}:`, e.message);
      return this.jsonRepo.findById(id);
    }
  }

  async create(data) {
    if (!ENV.USE_DB) return this.jsonRepo.create(data);
    const { getDb } = require('../db/connection');
    const db = getDb();
    if (!db) return this.jsonRepo.create(data);
    const col = db.collection(this.collectionName);
    // Простейшая генерация id: макс + 1 из JSON fallback (упростим до timestamp если нужно)
    const existing = await this.findAll();
    const nextId = data.id != null ? data.id : (existing.reduce((m, x) => x.id > m ? x.id : m, 0) + 1);
    const doc = { ...data, id: nextId };
    try {
      await col.insertOne(doc);
      return doc;
    } catch (e) {
      console.error(`[DB] create error in ${this.collectionName}:`, e.message);
      return this.jsonRepo.create(data);
    }
  }

  async update(id, updates) {
    if (!ENV.USE_DB) return this.jsonRepo.update(id, updates);
    const { getDb } = require('../db/connection');
    const db = getDb();
    if (!db) return this.jsonRepo.update(id, updates);
    const col = db.collection(this.collectionName);
    try {
      const res = await col.findOneAndUpdate(
        { id: Number(id) },
        { $set: updates, $currentDate: { updated_at: true } },
        { returnDocument: 'after' }
      );
      return res.value ? this._mapDoc(res.value) : null;
    } catch (e) {
      console.error(`[DB] update error in ${this.collectionName}:`, e.message);
      return this.jsonRepo.update(id, updates);
    }
  }

  async delete(id) {
    if (!ENV.USE_DB) return this.jsonRepo.delete(id);
    const { getDb } = require('../db/connection');
    const db = getDb();
    if (!db) return this.jsonRepo.delete(id);
    const col = db.collection(this.collectionName);
    try {
      await col.deleteOne({ id: Number(id) });
      return true;
    } catch (e) {
      console.error(`[DB] delete error in ${this.collectionName}:`, e.message);
      return this.jsonRepo.delete(id);
    }
  }

  async paginate({ page = 1, pageSize = 20, filter = {}, sort = null }) {
    if (!ENV.USE_DB) {
      const start = (page - 1) * pageSize;
      const list = await this.findBy(filter);
      let sorted = list;
      if (sort && sort.field) {
        sorted = [...list].sort((a, b) => {
          if (a[sort.field] === b[sort.field]) return 0;
          return (a[sort.field] < b[sort.field] ? -1 : 1) * (sort.direction === 'desc' ? -1 : 1);
        });
      }
      return { items: sorted.slice(start, start + pageSize), total: sorted.length, page, pageSize, pages: Math.ceil(sorted.length / pageSize) || 1 };
    }
    const { getDb } = require('../db/connection');
    const db = getDb();
    if (!db) return this.paginate({ page, pageSize, filter, sort });
    const col = db.collection(this.collectionName);
    const query = this._buildQuery(filter);
    const cursor = col.find(query);
    if (sort && sort.field) {
      cursor.sort({ [sort.field]: sort.direction === 'desc' ? -1 : 1 });
    }
    const total = await col.countDocuments(query);
    const items = await cursor.skip((page - 1) * pageSize).limit(pageSize).toArray();
    return { items: items.map(this._mapDoc.bind(this)), total, page, pageSize, pages: Math.ceil(total / pageSize) || 1 };
  }

  _mapDoc(doc) {
    return doc; // место для нормализации (например преобразование ObjectId)
  }

  _buildQuery(filter) {
    // Простая конвертация точного соответствия; для сложных операторов расширить.
    const query = {};
    Object.entries(filter).forEach(([k, v]) => {
      if (v == null) return;
      query[k] = v;
    });
    return query;
  }
}

module.exports = DbBaseRepository;
