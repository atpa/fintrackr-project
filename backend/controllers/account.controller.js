const AccountService = require('../services/account.service');
const { sendSuccess, sendError } = require('../utils/responses');

class AccountController {
  /**
   * GET /api/accounts - Получить все счета пользователя.
   */
  async getAll(req, res) {
    try {
      const userId = req.user.id;
      const accounts = await AccountService.getAllAccounts(userId);
      sendSuccess(res, 200, accounts);
    } catch (error) {
      sendError(res, error.statusCode || 500, error.message);
    }
  }

  /**
   * GET /api/accounts/:id - Получить счет по ID.
   */
  async getById(req, res) {
    try {
      const accountId = parseInt(req.params.id, 10);
      const userId = req.user.id;
      const account = await AccountService.getAccountById(accountId, userId);
      sendSuccess(res, 200, account);
    } catch (error) {
      sendError(res, error.statusCode || 500, error.message);
    }
  }

  /**
   * POST /api/accounts - Создать новый счет.
   */
  async create(req, res) {
    try {
      const { name, balance, currency } = req.body;
      if (!name || balance === undefined || !currency) {
        return sendError(res, 400, 'Missing required fields: name, balance, currency');
      }
      const userId = req.user.id;
      const newAccount = await AccountService.createAccount({ name, balance, currency }, userId);
      sendSuccess(res, 201, newAccount, 'Account created successfully');
    } catch (error) {
      sendError(res, error.statusCode || 500, error.message);
    }
  }

  /**
   * PUT /api/accounts/:id - Обновить счет.
   */
  async update(req, res) {
    try {
      const accountId = parseInt(req.params.id, 10);
      const userId = req.user.id;
      const updateData = req.body;
      const updatedAccount = await AccountService.updateAccount(accountId, updateData, userId);
      sendSuccess(res, 200, updatedAccount, 'Account updated successfully');
    } catch (error) {
      sendError(res, error.statusCode || 500, error.message);
    }
  }

  /**
   * DELETE /api/accounts/:id - Удалить счет.
   */
  async delete(req, res) {
    try {
      const accountId = parseInt(req.params.id, 10);
      const userId = req.user.id;
      await AccountService.deleteAccount(accountId, userId);
      sendSuccess(res, 200, null, 'Account deleted successfully');
    } catch (error) {
      sendError(res, error.statusCode || 500, error.message);
    }
  }
}

module.exports = new AccountController();
