/**
 * Utility Routes
 * API endpoints for currency conversion and other utilities
 */

const { convertAmount, getExchangeRate } = require("../services/currencyService");
const { HttpError } = require("../middleware");

/**
 * GET /api/convert
 * Convert currency amount
 */
async function convertCurrency(req, res) {
  const { amount, from, to } = req.query;

  // Validation
  if (!amount || !from || !to) {
    throw new HttpError("Missing conversion parameters", 400);
  }

  const numAmount = Number(amount);
  if (isNaN(numAmount)) {
    throw new HttpError("Invalid amount", 400);
  }

  // Convert
  const converted = convertAmount(numAmount, from, to);
  const rate = getExchangeRate(from, to);

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(
    JSON.stringify({
      amount: numAmount,
      from,
      to,
      converted,
      rate,
    })
  );
}

/**
 * GET /api/rates
 * Get exchange rates
 */
async function getExchangeRates(req, res) {
  const { base, quote } = req.query;
  const baseCurrency = base || "USD";

  if (quote) {
    // Legacy single rate response expected by tests
    const rate = getExchangeRate(baseCurrency, quote);
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.end(JSON.stringify({ base: baseCurrency, quote, rate }));
  }

  const currencies = ["USD", "EUR", "PLN", "RUB"];
  const rates = {};
  currencies.forEach((currency) => {
    rates[currency] = getExchangeRate(baseCurrency, currency);
  });
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify({ base: baseCurrency, rates }));
}

module.exports = {
  convertCurrency,
  getExchangeRates,
};
