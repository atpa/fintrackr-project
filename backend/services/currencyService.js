/**
 * Currency service
 * Handles currency conversion and rates
 */

const { RATE_MAP } = require("../config/constants");

/**
 * Convert amount from one currency to another
 * @param {number} amount - Amount to convert
 * @param {string} fromCurrency - Source currency code
 * @param {string} toCurrency - Target currency code
 * @returns {number} Converted amount
 */
function convertAmount(amount, fromCurrency, toCurrency) {
  const amt = Number(amount) || 0;
  const from = (fromCurrency || "").toUpperCase();
  const to = (toCurrency || "").toUpperCase();

  if (from === to) return amt;
  if (!RATE_MAP[from] || !RATE_MAP[from][to]) return amt;

  return amt * RATE_MAP[from][to];
}

/**
 * Get exchange rate between two currencies
 * @param {string} fromCurrency - Source currency code
 * @param {string} toCurrency - Target currency code
 * @returns {number} Exchange rate
 */
function getExchangeRate(fromCurrency, toCurrency) {
  const from = (fromCurrency || "").toUpperCase();
  const to = (toCurrency || "").toUpperCase();

  if (from === to) return 1;
  if (!RATE_MAP[from] || !RATE_MAP[from][to]) return 1;

  return RATE_MAP[from][to];
}

module.exports = {
  convertAmount,
  getExchangeRate,
  RATE_MAP,
};
