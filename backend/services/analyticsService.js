/**
 * Analytics Service
 * Advanced financial analytics, forecasting, and insights
 */

/**
 * Calculate spending trends over time
 * @param {Array} transactions - Transaction history
 * @param {string} currency - Target currency
 * @param {Function} convertAmount - Currency converter function
 * @returns {Object} Trend analysis
 */
function analyzeSpendingTrends(transactions, currency = 'USD', convertAmount) {
  const expenses = transactions.filter(t => t.type === 'expense');
  
  // Group by month
  const monthlySpending = {};
  expenses.forEach(tx => {
    const month = tx.date.substring(0, 7); // YYYY-MM
    const amount = convertAmount(tx.amount, tx.currency, currency);
    
    if (!monthlySpending[month]) {
      monthlySpending[month] = 0;
    }
    monthlySpending[month] += amount;
  });
  
  // Calculate trend
  const months = Object.keys(monthlySpending).sort();
  const amounts = months.map(m => monthlySpending[m]);
  
  const trend = calculateLinearTrend(amounts);
  const average = amounts.reduce((sum, val) => sum + val, 0) / amounts.length || 0;
  
  return {
    monthlySpending,
    months,
    amounts,
    average,
    trend,
    direction: trend > 0 ? 'increasing' : trend < 0 ? 'decreasing' : 'stable'
  };
}

/**
 * Forecast future spending using linear regression
 * @param {Array} transactions - Transaction history
 * @param {number} monthsAhead - Number of months to forecast
 * @param {string} currency - Target currency
 * @param {Function} convertAmount - Currency converter function
 * @returns {Object} Forecast data
 */
function forecastSpending(transactions, monthsAhead = 3, currency = 'USD', convertAmount) {
  const trends = analyzeSpendingTrends(transactions, currency, convertAmount);
  
  if (trends.amounts.length < 2) {
    return {
      forecast: [],
      confidence: 'low',
      message: 'Not enough data for accurate forecasting'
    };
  }
  
  const forecast = [];
  const lastAmount = trends.amounts[trends.amounts.length - 1];
  
  for (let i = 1; i <= monthsAhead; i++) {
    const predictedAmount = lastAmount + (trends.trend * i);
    forecast.push({
      month: addMonths(trends.months[trends.months.length - 1], i),
      predicted: Math.max(0, predictedAmount),
      confidence: calculateConfidence(trends.amounts.length, i)
    });
  }
  
  return {
    forecast,
    historicalTrend: trends.trend,
    confidence: trends.amounts.length >= 6 ? 'high' : trends.amounts.length >= 3 ? 'medium' : 'low'
  };
}

/**
 * Analyze spending by category
 * @param {Array} transactions - Transaction history
 * @param {Array} categories - Category definitions
 * @param {string} currency - Target currency
 * @param {Function} convertAmount - Currency converter function
 * @returns {Array} Category analysis
 */
function analyzeByCategory(transactions, categories, currency = 'USD', convertAmount) {
  const categoryMap = {};
  
  // Initialize categories
  categories.forEach(cat => {
    categoryMap[cat.id] = {
      id: cat.id,
      name: cat.name,
      kind: cat.kind,
      total: 0,
      count: 0,
      average: 0,
      percentage: 0
    };
  });
  
  // Calculate totals
  let grandTotal = 0;
  transactions.forEach(tx => {
    if (!tx.category_id || !categoryMap[tx.category_id]) return;
    
    const amount = convertAmount(tx.amount, tx.currency, currency);
    categoryMap[tx.category_id].total += amount;
    categoryMap[tx.category_id].count += 1;
    grandTotal += amount;
  });
  
  // Calculate percentages and averages
  Object.values(categoryMap).forEach(cat => {
    cat.average = cat.count > 0 ? cat.total / cat.count : 0;
    cat.percentage = grandTotal > 0 ? (cat.total / grandTotal) * 100 : 0;
  });
  
  // Sort by total (descending)
  return Object.values(categoryMap)
    .filter(cat => cat.count > 0)
    .sort((a, b) => b.total - a.total);
}

/**
 * Detect anomalous transactions (unusually large expenses)
 * @param {Array} transactions - Transaction history
 * @param {string} currency - Target currency
 * @param {Function} convertAmount - Currency converter function
 * @returns {Array} Anomalous transactions
 */
function detectAnomalies(transactions, currency = 'USD', convertAmount) {
  const expenses = transactions
    .filter(t => t.type === 'expense')
    .map(t => ({
      ...t,
      normalizedAmount: convertAmount(t.amount, t.currency, currency)
    }));
  
  if (expenses.length < 10) {
    return []; // Not enough data
  }
  
  // Calculate statistics
  const amounts = expenses.map(e => e.normalizedAmount);
  const mean = amounts.reduce((sum, val) => sum + val, 0) / amounts.length;
  const variance = amounts.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / amounts.length;
  const stdDev = Math.sqrt(variance);
  
  // Detect outliers (beyond 2 standard deviations)
  const threshold = mean + (2 * stdDev);
  
  return expenses
    .filter(e => e.normalizedAmount > threshold)
    .map(e => ({
      ...e,
      deviation: ((e.normalizedAmount - mean) / stdDev).toFixed(2),
      percentageAboveMean: (((e.normalizedAmount - mean) / mean) * 100).toFixed(1)
    }))
    .sort((a, b) => b.normalizedAmount - a.normalizedAmount);
}

/**
 * Generate budget recommendations based on spending patterns
 * @param {Array} transactions - Transaction history
 * @param {Array} categories - Category definitions
 * @param {string} currency - Target currency
 * @param {Function} convertAmount - Currency converter function
 * @returns {Array} Budget recommendations
 */
function generateBudgetRecommendations(transactions, categories, currency = 'USD', convertAmount) {
  const categoryAnalysis = analyzeByCategory(transactions, categories, currency, convertAmount);
  const trends = analyzeSpendingTrends(transactions, currency, convertAmount);
  
  return categoryAnalysis.map(cat => {
    // Recommend 10% buffer above average spending
    const recommendedLimit = cat.average * 1.1;
    
    // Adjust for trend
    const trendAdjustment = trends.direction === 'increasing' ? 1.05 : 1.0;
    const adjustedLimit = recommendedLimit * trendAdjustment;
    
    return {
      category_id: cat.id,
      category_name: cat.name,
      current_average: cat.average,
      recommended_limit: Math.round(adjustedLimit),
      monthly_transactions: cat.count,
      confidence: cat.count >= 5 ? 'high' : cat.count >= 3 ? 'medium' : 'low',
      reasoning: generateRecommendationReason(cat, trends)
    };
  });
}

/**
 * Calculate savings potential
 * @param {Array} transactions - Transaction history
 * @param {Array} categories - Category definitions
 * @param {string} currency - Target currency
 * @param {Function} convertAmount - Currency converter function
 * @returns {Object} Savings analysis
 */
function analyzeSavingsPotential(transactions, categories, currency = 'USD', convertAmount) {
  const analysis = analyzeByCategory(transactions, categories, currency, convertAmount);
  
  // Categories where savings are typically possible
  const savingsCategories = ['Entertainment', 'Развлечения', 'Dining', 'Рестораны', 
                             'Shopping', 'Покупки', 'Subscriptions', 'Подписки'];
  
  let totalSavingsPotential = 0;
  const opportunities = [];
  
  analysis.forEach(cat => {
    const isSavingsCategory = savingsCategories.some(s => 
      cat.name.toLowerCase().includes(s.toLowerCase())
    );
    
    if (isSavingsCategory && cat.total > 0) {
      // Assume 20% savings potential in discretionary categories
      const potential = cat.total * 0.20;
      totalSavingsPotential += potential;
      
      opportunities.push({
        category: cat.name,
        current_spending: cat.total,
        potential_savings: potential,
        percentage: 20,
        confidence: cat.count >= 5 ? 'medium' : 'low'
      });
    }
  });
  
  return {
    total_potential: totalSavingsPotential,
    opportunities: opportunities.sort((a, b) => b.potential_savings - a.potential_savings),
    impact: totalSavingsPotential > 0 ? 'Save up to ' + totalSavingsPotential.toFixed(2) + ' ' + currency : 'No significant savings identified'
  };
}

/**
 * Helper: Calculate linear trend
 */
function calculateLinearTrend(values) {
  if (values.length < 2) return 0;
  
  const n = values.length;
  const indices = values.map((_, i) => i);
  
  const sumX = indices.reduce((sum, x) => sum + x, 0);
  const sumY = values.reduce((sum, y) => sum + y, 0);
  const sumXY = indices.reduce((sum, x, i) => sum + x * values[i], 0);
  const sumX2 = indices.reduce((sum, x) => sum + x * x, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  return slope;
}

/**
 * Helper: Add months to YYYY-MM string
 */
function addMonths(monthString, count) {
  const [year, month] = monthString.split('-').map(Number);
  const date = new Date(year, month - 1 + count, 1);
  const newYear = date.getFullYear();
  const newMonth = String(date.getMonth() + 1).padStart(2, '0');
  return `${newYear}-${newMonth}`;
}

/**
 * Helper: Calculate confidence based on data points and forecast distance
 */
function calculateConfidence(dataPoints, monthsAhead) {
  if (dataPoints < 3) return 'low';
  if (dataPoints >= 12 && monthsAhead <= 3) return 'high';
  if (dataPoints >= 6 && monthsAhead <= 2) return 'high';
  if (dataPoints >= 6 && monthsAhead <= 4) return 'medium';
  return 'low';
}

/**
 * Helper: Generate recommendation reasoning
 */
function generateRecommendationReason(category, trends) {
  const reasons = [];
  
  if (category.count < 3) {
    reasons.push('Limited data available');
  }
  
  if (trends.direction === 'increasing') {
    reasons.push('Spending trend is increasing');
  } else if (trends.direction === 'decreasing') {
    reasons.push('Spending trend is decreasing');
  }
  
  if (category.percentage > 30) {
    reasons.push('High percentage of total spending');
  }
  
  return reasons.join('. ') || 'Based on average spending pattern';
}

module.exports = {
  analyzeSpendingTrends,
  forecastSpending,
  analyzeByCategory,
  detectAnomalies,
  generateBudgetRecommendations,
  analyzeSavingsPotential
};
