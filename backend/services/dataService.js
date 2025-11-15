/**
 * Data persistence utilities
 * Handles reading and writing to JSON storage
 */

const db = require('./databaseService');

const getAllAccounts = (userId) => {
    db._reload(); // Ensure latest data is loaded
    return db.findAll('accounts').filter(acc => acc.userId === userId);
};

const createAccount = (userId, accountData) => {
    db._reload(); // Ensure latest data is loaded
    const newAccount = {
        ...accountData,
        userId,
    };
    return db.insert('accounts', newAccount);
};

module.exports = {
    getAllAccounts,
    createAccount,
};
