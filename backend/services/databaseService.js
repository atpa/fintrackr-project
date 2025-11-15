const fs = require('fs');
const path = require('path');

class JsonDatabase {
    constructor(filePath) {
        this.filePath = filePath;
        this.data = this._readData();
    }

    _readData() {
        try {
            const jsonString = fs.readFileSync(this.filePath, 'utf8');
            return JSON.parse(jsonString);
        } catch (error) {
            console.error('Error reading database file:', error);
            throw new Error('Could not read database.');
        }
    }

    _reload() {
        this.data = JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
    }

    _commit() {
        try {
            const jsonString = JSON.stringify(this.data, null, 2);
            fs.writeFileSync(this.filePath, jsonString, 'utf8');
        } catch (error) {
            console.error('Error writing to database file:', error);
            throw new Error('Could not write to database.');
        }
    }

    getTable(tableName) {
        if (!this.data[tableName]) {
            throw new Error(`Table "${tableName}" does not exist.`);
        }
        return JSON.parse(JSON.stringify(this.data[tableName])); // Return a deep copy
    }

    updateTable(tableName, newData) {
        if (!this.data[tableName]) {
            throw new Error(`Table "${tableName}" does not exist.`);
        }
        this.data[tableName] = newData;
        this._commit();
    }

    findOne(tableName, predicate) {
        const table = this.getTable(tableName);
        return table.find(predicate) || null;
    }

    findAll(tableName, predicate) {
        const table = this.getTable(tableName);
        return predicate ? table.filter(predicate) : table;
    }

    insert(tableName, item) {
        const table = this.getTable(tableName);
        // Handle potential empty table for max id calculation
        const maxId = table.length > 0 ? Math.max(...table.map(i => i.id || 0)) : 0;
        const newId = maxId + 1;
        const newItem = { ...item, id: newId };
        table.push(newItem);
        this.updateTable(tableName, table);
        return newItem; // Return the newly created item
    }
}

const dbPath = path.join(__dirname, '../data.json');
const db = new JsonDatabase(dbPath);

module.exports = db;
