/**
 * Currency routes  
 * Handles currency conversion and rate queries
 */

const express = require('express');
const router = express.Router();
const { convertAmount, getExchangeRate } = require('../services/currencyService');
const { RATE_MAP, BANKS } = require('../config/constants');

/**
 * GET /api/rates
 * Get exchange rate between two currencies
 */
router.get('/rates', (req, res) => {
  try {
    const { base, quote } = req.query;
    
    if (!base || !quote) {
      return res.status(400).json({ error: 'Base and quote currencies are required' });
    }
    
    const baseUpper = base.toUpperCase();
    const quoteUpper = quote.toUpperCase();
    
    if (!RATE_MAP[baseUpper] || !RATE_MAP[baseUpper][quoteUpper]) {
      return res.status(400).json({ error: 'Unsupported currency pair' });
    }
    
    const rate = RATE_MAP[baseUpper][quoteUpper];
    
    res.json({
      base: baseUpper,
      quote: quoteUpper,
      rate
    });
  } catch (error) {
    console.error('Get rates error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/convert
 * Convert amount between currencies
 */
router.get('/convert', (req, res) => {
  try {
    const { amount, from, to } = req.query;
    
    if (!amount || !from || !to) {
      return res.status(400).json({ error: 'Amount, from, and to currencies are required' });
    }
    
    const fromUpper = from.toUpperCase();
    const toUpper = to.toUpperCase();
    
    if (!RATE_MAP[fromUpper] || !RATE_MAP[fromUpper][toUpper]) {
      return res.status(400).json({ error: 'Unsupported currency pair' });
    }
    
    const result = convertAmount(Number(amount), fromUpper, toUpper);
    const rate = RATE_MAP[fromUpper][toUpper];
    
    res.json({
      from: fromUpper,
      to: toUpper,
      amount: Number(amount),
      rate,
      result
    });
  } catch (error) {
    console.error('Convert error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/banks
 * Get list of supported banks for sync
 */
router.get('/banks', (req, res) => {
  try {
    res.json(BANKS);
  } catch (error) {
    console.error('Get banks error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
