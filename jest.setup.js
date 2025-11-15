const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, 'backend', 'data.json');
const initialData = {
    users: [],
    accounts: [],
    categories: [],
    transactions: [],
    budgets: [],
    goals: [],
    planned: [],
    subscriptions: [],
    rules: [],
    recurring: [],
    refreshTokens: [],
    tokenBlacklist: [],
};

// This runs before each test file
beforeAll(() => {
    fs.writeFileSync(dataPath, JSON.stringify(initialData, null, 2), 'utf-8');
});
