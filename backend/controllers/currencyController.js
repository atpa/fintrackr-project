const { success, AppError } = require('../utils/responses');
const { fetchRate, getFallbackRate, FALLBACK_RATES } = require('../utils/currency');

async function convert(req, res) {
  const { from, to, amount } = req.query;
  const value = Number(amount);
  if (!from || !to || Number.isNaN(value)) {
    throw new AppError(400, 'Missing parameters');
  }

  let rate;
  try {
    rate = await fetchRate(from, to);
  } catch (err) {
    try {
      rate = getFallbackRate(from, to);
    } catch (fallbackError) {
      throw new AppError(400, 'Unable to convert');
    }
  }

  const result = Number(value) * Number(rate);
  return success(res, {
    from,
    to,
    amount: value,
    rate,
    result: +result.toFixed(4),
  });
}

async function rates(req, res) {
  const base = req.query.base || 'USD';
  const quote = req.query.quote || 'USD';

  let rate;
  try {
    rate = getFallbackRate(base, quote);
  } catch (err) {
    throw new AppError(400, 'Unsupported currency');
  }

  return success(res, { base, quote, rate });
}

async function fallbackTable(req, res) {
  return success(res, FALLBACK_RATES);
}

module.exports = {
  convert,
  rates,
  fallbackTable,
};
