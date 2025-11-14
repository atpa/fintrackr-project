/**
 * Base Repository
 * Generic CRUD operations for collections
 */

const { getData, persistData, getNextId } = require("../services/dataService");

class BaseRepository {
  /**
   * @param {string} collectionName - Name of the collection in data.json
   */
  constructor(collectionName) {
    this.collectionName = collectionName;
  }

  /**
   * Get the collection
   */
  getCollection() {
    const data = getData();
    return data[this.collectionName] || [];
  }

  /**
   * Find all items
   */
  findAll() {
    return this.getCollection();
  }

  /**
   * Find by ID
   */
  findById(id) {
    const collection = this.getCollection();
    return collection.find((item) => item.id === Number(id));
  }

  /**
   * Find by criteria
   */
  findBy(criteria) {
    const collection = this.getCollection();
    return collection.filter((item) => {
      return Object.entries(criteria).every(([key, value]) => item[key] === value);
    });
  }

  /**
   * Find one by criteria
   */
  findOneBy(criteria) {
    const collection = this.getCollection();
    return collection.find((item) => {
      return Object.entries(criteria).every(([key, value]) => item[key] === value);
    });
  }

  /**
   * Create new item
   */
  create(data) {
    const collection = this.getCollection();
    const newItem = {
      id: getNextId(collection),
      ...data,
    };
    collection.push(newItem);
    persistData();
    return newItem;
  }

  /**
   * Update item by ID
   */
  update(id, updates) {
    const data = getData();
    const collection = data[this.collectionName];
    const index = collection.findIndex((item) => item.id === Number(id));

    if (index === -1) {
      return null;
    }

    collection[index] = {
      ...collection[index],
      ...updates,
      id: collection[index].id, // Preserve ID
    };

    persistData();
    return collection[index];
  }

  /**
   * Delete item by ID
   */
  delete(id) {
    const data = getData();
    const collection = data[this.collectionName];
    const index = collection.findIndex((item) => item.id === Number(id));

    if (index === -1) {
      return false;
    }

    collection.splice(index, 1);
    persistData();
    return true;
  }

  /**
   * Delete multiple items by criteria
   */
  deleteBy(criteria) {
    const data = getData();
    const collection = data[this.collectionName];
    const initialLength = collection.length;

    data[this.collectionName] = collection.filter((item) => {
      return !Object.entries(criteria).every(([key, value]) => item[key] === value);
    });

    const deletedCount = initialLength - data[this.collectionName].length;

    if (deletedCount > 0) {
      persistData();
    }

    return deletedCount;
  }

  /**
   * Count items
   */
  count() {
    return this.getCollection().length;
  }

  /**
   * Count items by criteria
   */
  countBy(criteria) {
    return this.findBy(criteria).length;
  }

  /**
   * Check if item exists
   */
  exists(id) {
    return this.findById(id) !== undefined;
  }
}

module.exports = BaseRepository;
