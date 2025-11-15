const https = require('https');

const FALLBACK_RATES = {
  USD: { USD: 1, EUR: 0.94, PLN: 4.5, RUB: 90 },
  EUR: { USD: 1.06, EUR: 1, PLN: 4.8, RUB: 95 },
  PLN: { USD: 0.22, EUR: 0.21, PLN: 1, RUB: 20 },
  RUB: { USD: 0.011, EUR: 0.0105, PLN: 0.05, RUB: 1 },
};

function convertAmount(amount, from, to) {
  if (!from || !to || from === to) {
    return Number(amount) || 0;
  }
  const rates = FALLBACK_RATES[from];
  if (rates && rates[to]) {
    return Number(amount) * rates[to];
  }
  return Number(amount) || 0;
}

async function fetchRate(from, to) {
  const url = `https://api.exchangerate.host/latest?base=${encodeURIComponent(
    from
  )}&symbols=${encodeURIComponent(to)}`;

  const response = await new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => resolve({ status: res.statusCode, body: raw }));
      })
      .on('error', reject);
  });

  if (response.status !== 200) {
    throw new Error('Rate service unavailable');
  }

  const data = JSON.parse(response.body || '{}');
  if (!data.rates || typeof data.rates[to] !== 'number') {
    throw new Error('Rate not found');
  }
  return data.rates[to];
}

function getFallbackRate(from, to) {
  const rate = FALLBACK_RATES[from] && FALLBACK_RATES[from][to];
  if (typeof rate !== 'number') {
    throw new Error('Unsupported currency');
  }
  return rate;
}

module.exports = {
  convertAmount,
  fetchRate,
  getFallbackRate,
  FALLBACK_RATES,
};
