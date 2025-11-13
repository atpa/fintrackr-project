const fs = require('fs/promises');
const path = require('path');

const DEFAULT_DATA = {
  accounts: [],
  categories: [],
  transactions: [],
  budgets: [],
  goals: [],
  planned: [],
  users: [],
  bankConnections: [],
  subscriptions: [],
  rules: [],
};

function ensureDefaults(store) {
  for (const key of Object.keys(DEFAULT_DATA)) {
    if (!Array.isArray(store[key])) {
      store[key] = Array.isArray(DEFAULT_DATA[key])
        ? [...DEFAULT_DATA[key]]
        : DEFAULT_DATA[key];
    }
  }
  return store;
}

class JsonStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.cache = null;
    this.initialized = false;
    this.writeQueue = Promise.resolve();
  }

  async init() {
    if (this.initialized) {
      return this.cache;
    }

    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      const parsed = raw ? JSON.parse(raw) : {};
      this.cache = ensureDefaults(parsed || {});
    } catch (err) {
      if (err.code !== 'ENOENT') {
        console.error('Failed to read JSON store', err);
      }
      await fs.mkdir(path.dirname(this.filePath), { recursive: true });
      this.cache = ensureDefaults({ ...DEFAULT_DATA });
      await this.persist();
    }

    this.initialized = true;
    return this.cache;
  }

  clone(value) {
    if (value === undefined) {
      return value;
    }
    return JSON.parse(JSON.stringify(value));
  }

  async persist() {
    if (!this.cache) {
      return;
    }
    await fs.writeFile(
      this.filePath,
      JSON.stringify(this.cache, null, 2),
      'utf8'
    );
  }

  async read(selector = (data) => data) {
    await this.init();
    await this.writeQueue;
    const value = selector(this.cache);
    return this.clone(value);
  }

  async write(mutator) {
    await this.init();
    const run = this.writeQueue.then(async () => {
      const result = await mutator(this.cache);
      ensureDefaults(this.cache);
      await this.persist();
      return this.clone(result);
    });

    this.writeQueue = run.then(
      () => undefined,
      () => undefined
    );

    return run;
  }
}

const storePath = path.join(__dirname, '..', 'data.json');
const store = new JsonStore(storePath);

module.exports = store;
