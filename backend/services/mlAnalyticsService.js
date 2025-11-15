/**
 * ML Analytics Service
 * Provides machine learning-powered insights and predictions
 */

class MLAnalyticsService {
  constructor(dataService) {
    this.dataService = dataService;
  }

  /**
   * Predict future spending for next N months
   * Uses simple linear regression on historical data
   */
  async predictSpending(userId, months = 3) {
    const transactions = await this.dataService.getTransactionsByUserId(userId);
    const expenses = transactions.filter(t => t.type === 'expense');

    // Group by month
    const monthlySpending = this.groupByMonth(expenses);
    
    if (monthlySpending.length < 3) {
      return {
        predictions: [],
        confidence: 'low',
        message: 'Not enough data for accurate predictions (need at least 3 months)',
      };
    }

    // Calculate linear regression
    const { slope, intercept } = this.linearRegression(monthlySpending);
    
    // Generate predictions
    const predictions = [];
    const lastMonth = monthlySpending.length;
    
    for (let i = 1; i <= months; i++) {
      const monthIndex = lastMonth + i;
      const predicted = slope * monthIndex + intercept;
      
      predictions.push({
        month: this.getMonthName(i),
        amount: Math.max(0, predicted), // Don't predict negative
        confidence: this.calculateConfidence(monthlySpending, slope),
      });
    }

    return {
      predictions,
      trend: slope > 0 ? 'increasing' : slope < 0 ? 'decreasing' : 'stable',
      confidence: this.calculateConfidence(monthlySpending, slope),
      historical: monthlySpending,
    };
  }

  /**
   * Detect spending anomalies
   * Uses standard deviation to find unusual transactions
   */
  async detectAnomalies(userId, sigmaThreshold = 2) {
    const transactions = await this.dataService.getTransactionsByUserId(userId);
    const expenses = transactions.filter(t => t.type === 'expense');

    if (expenses.length < 10) {
      return {
        anomalies: [],
        message: 'Not enough data to detect anomalies (need at least 10 transactions)',
      };
    }

    // Calculate mean and standard deviation
    const amounts = expenses.map(t => Math.abs(t.amount));
    const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const variance = amounts.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / amounts.length;
    const stdDev = Math.sqrt(variance);

    // Find anomalies
    const anomalies = expenses.filter(t => {
      const amount = Math.abs(t.amount);
      const zScore = (amount - mean) / stdDev;
      return Math.abs(zScore) > sigmaThreshold;
    }).map(t => ({
      ...t,
      severity: this.getAnomalySeverity(Math.abs(t.amount), mean, stdDev),
      reason: `Transaction is ${((Math.abs(t.amount) - mean) / stdDev).toFixed(1)}σ from average`,
    }));

    return {
      anomalies,
      statistics: {
        mean,
        stdDev,
        threshold: mean + (sigmaThreshold * stdDev),
      },
    };
  }

  /**
   * Generate budget recommendations based on spending patterns
   */
  async generateBudgetRecommendations(userId) {
    const transactions = await this.dataService.getTransactionsByUserId(userId);
    const expenses = transactions.filter(t => t.type === 'expense');

    // Group by category
    const categorySpending = {};
    for (const tx of expenses) {
      if (!tx.category_id) continue;
      
      if (!categorySpending[tx.category_id]) {
        categorySpending[tx.category_id] = {
          total: 0,
          count: 0,
          transactions: [],
        };
      }
      
      categorySpending[tx.category_id].total += Math.abs(tx.amount);
      categorySpending[tx.category_id].count += 1;
      categorySpending[tx.category_id].transactions.push(tx);
    }

    // Generate recommendations
    const recommendations = [];
    
    for (const [categoryId, data] of Object.entries(categorySpending)) {
      const avgMonthly = data.total / this.getMonthsCount(data.transactions);
      const recommended = Math.ceil(avgMonthly * 1.1); // 10% buffer

      recommendations.push({
        category_id: parseInt(categoryId),
        recommended_limit: recommended,
        current_average: avgMonthly,
        rationale: `Based on ${data.count} transactions over recent months`,
        confidence: data.count >= 10 ? 'high' : data.count >= 5 ? 'medium' : 'low',
      });
    }

    return recommendations;
  }

  /**
   * Identify recurring expenses
   */
  async identifyRecurringExpenses(userId) {
    const transactions = await this.dataService.getTransactionsByUserId(userId);
    const expenses = transactions.filter(t => t.type === 'expense');

    // Group by description similarity and amount
    const groups = this.groupSimilarTransactions(expenses);
    
    // Find recurring patterns
    const recurring = [];
    
    for (const group of groups) {
      if (group.transactions.length < 3) continue;
      
      const intervals = this.calculateIntervals(group.transactions);
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      
      // Check if intervals are consistent (monthly, weekly, etc.)
      const isRecurring = intervals.every(i => Math.abs(i - avgInterval) < avgInterval * 0.2);
      
      if (isRecurring) {
        recurring.push({
          description: group.description,
          amount: group.avgAmount,
          frequency: this.determineFrequency(avgInterval),
          intervals: avgInterval,
          confidence: this.calculateRecurringConfidence(intervals),
          next_expected: this.predictNextDate(group.transactions, avgInterval),
        });
      }
    }

    return recurring;
  }

  /**
   * Generate personalized insights
   */
  async generateInsights(userId) {
    const insights = [];
    
    // Spending trend insight
    const prediction = await this.predictSpending(userId, 1);
    if (prediction.predictions.length > 0) {
      if (prediction.trend === 'increasing') {
        insights.push({
          type: 'warning',
          title: 'Расходы растут',
          message: `Ваши расходы увеличиваются. Прогноз на следующий месяц: ${prediction.predictions[0].amount.toFixed(2)}`,
          action: 'Пересмотрите бюджеты',
          priority: 'high',
        });
      } else if (prediction.trend === 'decreasing') {
        insights.push({
          type: 'success',
          title: 'Экономия работает',
          message: 'Ваши расходы снижаются. Отличная работа!',
          priority: 'medium',
        });
      }
    }

    // Anomaly insight
    const anomalies = await this.detectAnomalies(userId);
    if (anomalies.anomalies.length > 0) {
      const recent = anomalies.anomalies.filter(a => {
        const age = Date.now() - new Date(a.date).getTime();
        return age < 7 * 24 * 60 * 60 * 1000; // Last 7 days
      });
      
      if (recent.length > 0) {
        insights.push({
          type: 'info',
          title: 'Необычные расходы',
          message: `Обнаружено ${recent.length} необычных транзакций на этой неделе`,
          action: 'Проверить транзакции',
          priority: 'medium',
        });
      }
    }

    // Recurring expense insight
    const recurring = await this.identifyRecurringExpenses(userId);
    if (recurring.length > 0) {
      const totalRecurring = recurring.reduce((sum, r) => sum + r.amount, 0);
      insights.push({
        type: 'info',
        title: 'Регулярные платежи',
        message: `Найдено ${recurring.length} регулярных платежей на общую сумму ${totalRecurring.toFixed(2)}`,
        action: 'Просмотреть подписки',
        priority: 'low',
      });
    }

    return insights;
  }

  // Helper methods

  groupByMonth(transactions) {
    const groups = {};
    
    for (const tx of transactions) {
      const date = new Date(tx.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!groups[key]) {
        groups[key] = 0;
      }
      
      groups[key] += Math.abs(tx.amount);
    }
    
    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, amount], index) => ({ month, amount, index }));
  }

  linearRegression(data) {
    const n = data.length;
    const sumX = data.reduce((sum, d) => sum + d.index, 0);
    const sumY = data.reduce((sum, d) => sum + d.amount, 0);
    const sumXY = data.reduce((sum, d) => sum + (d.index * d.amount), 0);
    const sumX2 = data.reduce((sum, d) => sum + (d.index * d.index), 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return { slope, intercept };
  }

  calculateConfidence(data, slope) {
    if (data.length < 3) return 'low';
    if (data.length < 6) return 'medium';
    
    // Check variance - lower variance = higher confidence
    const amounts = data.map(d => d.amount);
    const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const variance = amounts.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / amounts.length;
    const cv = Math.sqrt(variance) / mean; // Coefficient of variation
    
    if (cv < 0.2) return 'high';
    if (cv < 0.4) return 'medium';
    return 'low';
  }

  getMonthName(offset) {
    const date = new Date();
    date.setMonth(date.getMonth() + offset);
    return date.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
  }

  getAnomalySeverity(amount, mean, stdDev) {
    const zScore = Math.abs((amount - mean) / stdDev);
    if (zScore > 3) return 'high';
    if (zScore > 2.5) return 'medium';
    return 'low';
  }

  getMonthsCount(transactions) {
    if (transactions.length === 0) return 1;
    
    const dates = transactions.map(t => new Date(t.date));
    const oldest = Math.min(...dates);
    const newest = Math.max(...dates);
    const monthsDiff = (newest - oldest) / (30 * 24 * 60 * 60 * 1000);
    
    return Math.max(1, monthsDiff);
  }

  groupSimilarTransactions(transactions) {
    const groups = [];
    
    for (const tx of transactions) {
      const desc = tx.description.toLowerCase();
      let found = false;
      
      for (const group of groups) {
        const similarity = this.stringSimilarity(desc, group.description.toLowerCase());
        const amountSimilar = Math.abs(tx.amount - group.avgAmount) < group.avgAmount * 0.1;
        
        if (similarity > 0.7 && amountSimilar) {
          group.transactions.push(tx);
          group.avgAmount = group.transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0) / group.transactions.length;
          found = true;
          break;
        }
      }
      
      if (!found) {
        groups.push({
          description: tx.description,
          avgAmount: Math.abs(tx.amount),
          transactions: [tx],
        });
      }
    }
    
    return groups;
  }

  stringSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  calculateIntervals(transactions) {
    const sorted = transactions.sort((a, b) => new Date(a.date) - new Date(b.date));
    const intervals = [];
    
    for (let i = 1; i < sorted.length; i++) {
      const diff = new Date(sorted[i].date) - new Date(sorted[i - 1].date);
      intervals.push(diff / (24 * 60 * 60 * 1000)); // Days
    }
    
    return intervals;
  }

  determineFrequency(intervalDays) {
    if (intervalDays < 10) return 'weekly';
    if (intervalDays < 20) return 'bi-weekly';
    if (intervalDays < 40) return 'monthly';
    if (intervalDays < 100) return 'quarterly';
    return 'yearly';
  }

  calculateRecurringConfidence(intervals) {
    if (intervals.length < 2) return 'low';
    
    const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / intervals.length;
    const cv = Math.sqrt(variance) / avg;
    
    if (cv < 0.15) return 'high';
    if (cv < 0.3) return 'medium';
    return 'low';
  }

  predictNextDate(transactions, intervalDays) {
    const sorted = transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    const lastDate = new Date(sorted[0].date);
    lastDate.setDate(lastDate.getDate() + intervalDays);
    return lastDate.toISOString().split('T')[0];
  }
}

module.exports = MLAnalyticsService;
