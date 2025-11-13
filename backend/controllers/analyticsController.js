const store = require('../repositories/jsonStore');
const { success } = require('../utils/responses');
const { convertAmount } = require('../utils/currency');

async function forecast(req, res) {
  const data = await store.read((state) => ({ transactions: state.transactions }));
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - 30);

  let incomeSum = 0;
  let expenseSum = 0;

  data.transactions.forEach((tx) => {
    const txDate = new Date(tx.date);
    if (Number.isNaN(txDate.getTime())) {
      return;
    }
    if (txDate >= cutoff && txDate <= now) {
      const amount = convertAmount(Number(tx.amount), tx.currency || 'USD', 'USD');
      if (tx.type === 'income') {
        incomeSum += amount;
      } else if (tx.type === 'expense') {
        expenseSum += amount;
      }
    }
  });

  const days = 30;
  const avgIncome = incomeSum / days || 0;
  const avgExpense = expenseSum / days || 0;

  return success(res, {
    predicted_income: +(avgIncome * days).toFixed(2),
    predicted_expense: +(avgExpense * days).toFixed(2),
  });
}

async function recurring(req, res) {
  const { transactions } = await store.read((state) => ({
    transactions: state.transactions,
  }));

  const groupKey = (tx) =>
    (tx.merchant || tx.description || tx.note || tx.category || 'unknown')
      .toLowerCase()
      .trim();

  const byKey = new Map();
  transactions.forEach((tx) => {
    if (tx.type !== 'expense') return;
    const key = groupKey(tx);
    if (!byKey.has(key)) {
      byKey.set(key, []);
    }
    byKey.get(key).push(tx);
  });

  const candidates = [];
  for (const [key, values] of byKey.entries()) {
    if (values.length < 2) continue;
    const dates = values
      .map((tx) => new Date(tx.date))
      .filter((d) => !Number.isNaN(d.getTime()))
      .sort((a, b) => a - b);
    if (dates.length < 2) continue;
    const gaps = [];
    for (let i = 1; i < dates.length; i += 1) {
      gaps.push((dates[i] - dates[i - 1]) / (1000 * 60 * 60 * 24));
    }
    if (!gaps.length) continue;
    const avg = gaps.reduce((sum, value) => sum + value, 0) / gaps.length;
    const period = [7, 14, 30, 31].reduce(
      (best, candidate) =>
        Math.abs(avg - candidate) < Math.abs(avg - best) ? candidate : best,
      30
    );
    if (Math.abs(avg - period) > 3) {
      continue;
    }
    const amountAvg =
      values.reduce((sum, tx) => sum + Number(tx.amount || 0), 0) / values.length;
    candidates.push({
      name: key || 'unknown',
      count: values.length,
      avgPeriodDays: Math.round(avg),
      estimatedMonthly: +(amountAvg * (30 / period)).toFixed(2),
      sampleAmount: +amountAvg.toFixed(2),
    });
  }

  candidates.sort((a, b) => b.estimatedMonthly - a.estimatedMonthly);

  return success(res, {
    items: candidates,
    monthly: +candidates.reduce((sum, item) => sum + item.estimatedMonthly, 0).toFixed(2),
  });
}

module.exports = {
  forecast,
  recurring,
};
