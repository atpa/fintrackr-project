const dataService = require('../services/dataService');

const getAccounts = (req, res, next) => {
    try {
        const accounts = dataService.getAllAccounts(req.user.id);
        res.json(accounts);
    } catch (error) {
        next(error);
    }
};

const createAccount = (req, res, next) => {
    try {
        const newAccount = dataService.createAccount(req.user.id, req.body);
        res.status(201).json(newAccount);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAccounts,
    createAccount,
};
