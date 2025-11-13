const BANKS = require('../utils/banks');
const { success } = require('../utils/responses');

async function banks(req, res) {
  return success(res, BANKS);
}

module.exports = {
  banks,
};
