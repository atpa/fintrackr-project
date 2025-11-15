/**
 * ML Analytics Service Tests
 * Tests for Phase 7 - ML Analytics Engine
 */

describe('MLAnalyticsService', () => {
  let mlService;
  let mockDataService;

  beforeEach(() => {
    // Mock data service with sample transactions
    mockDataService = {
      getTransactionsByUser: jest.fn(),
      getBudgetsByUser: jest.fn(),
    };

    // Import service after mocking
    const MLAnalyticsService = require('../services/mlAnalyticsService');
    mlService = new MLAnalyticsService(mockDataService);
  });

  describe('Spending Predictions', () => {
    it('should predict future spending using linear regression', async () => {
      // Mock 6 months of transaction data
      const transactions = [];
      for (let i = 0; i < 6; i++) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        transactions.push({
          user_id: 1,
          amount: 1000 + i * 100,
          type: 'expense',
          date: date.toISOString(),
          category_id: 1,
        });
      }
      mockDataService.getTransactionsByUser.mockResolvedValue(transactions);

      const prediction = await mlService.predictSpending(1, 3);

      expect(prediction).toHaveProperty('predictions');
      expect(prediction.predictions).toHaveLength(3);
      expect(prediction).toHaveProperty('trend');
      expect(prediction).toHaveProperty('confidence');
      expect(['high', 'medium', 'low']).toContain(prediction.confidence);
    });

    it('should return low confidence with insufficient data', async () => {
      const transactions = [
        { user_id: 1, amount: 1000, type: 'expense', date: new Date().toISOString() },
      ];
      mockDataService.getTransactionsByUser.mockResolvedValue(transactions);

      const prediction = await mlService.predictSpending(1, 1);

      expect(prediction.confidence).toBe('low');
    });
  });

  describe('Anomaly Detection', () => {
    it('should detect spending anomalies using z-score', async () => {
      // Create transactions with one outlier
      const transactions = [
        ...Array(10).fill(null).map(() => ({
          user_id: 1,
          amount: 100,
          type: 'expense',
          date: new Date().toISOString(),
          category_id: 1,
        })),
        {
          user_id: 1,
          amount: 1000, // Outlier
          type: 'expense',
          date: new Date().toISOString(),
          category_id: 1,
        },
      ];
      mockDataService.getTransactionsByUser.mockResolvedValue(transactions);

      const anomalies = await mlService.detectAnomalies(1, 2);

      expect(anomalies).toHaveProperty('anomalies');
      expect(anomalies.anomalies.length).toBeGreaterThan(0);
      expect(anomalies.anomalies[0]).toHaveProperty('severity');
      expect(anomalies.anomalies[0]).toHaveProperty('zscore');
    });

    it('should return empty array when no anomalies', async () => {
      const transactions = Array(10).fill(null).map(() => ({
        user_id: 1,
        amount: 100,
        type: 'expense',
        date: new Date().toISOString(),
        category_id: 1,
      }));
      mockDataService.getTransactionsByUser.mockResolvedValue(transactions);

      const anomalies = await mlService.detectAnomalies(1, 3);

      expect(anomalies.anomalies).toHaveLength(0);
    });
  });

  describe('Budget Recommendations', () => {
    it('should generate budget recommendations based on spending', async () => {
      const transactions = Array(5).fill(null).map(() => ({
        user_id: 1,
        amount: 500,
        type: 'expense',
        date: new Date().toISOString(),
        category_id: 1,
      }));
      mockDataService.getTransactionsByUser.mockResolvedValue(transactions);
      mockDataService.getBudgetsByUser.mockResolvedValue([]);

      const recommendations = await mlService.generateBudgetRecommendations(1);

      expect(recommendations).toHaveProperty('recommendations');
      expect(recommendations.recommendations).toBeInstanceOf(Array);
      if (recommendations.recommendations.length > 0) {
        expect(recommendations.recommendations[0]).toHaveProperty('category_id');
        expect(recommendations.recommendations[0]).toHaveProperty('suggested_limit');
        expect(recommendations.recommendations[0]).toHaveProperty('confidence');
      }
    });
  });

  describe('Recurring Expense Detection', () => {
    it('should identify recurring expenses by pattern matching', async () => {
      // Create recurring transactions
      const transactions = [];
      for (let i = 0; i < 3; i++) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        transactions.push({
          user_id: 1,
          amount: 50,
          description: 'Netflix Subscription',
          type: 'expense',
          date: date.toISOString(),
          category_id: 1,
        });
      }
      mockDataService.getTransactionsByUser.mockResolvedValue(transactions);

      const recurring = await mlService.identifyRecurringExpenses(1);

      expect(recurring).toHaveProperty('recurring');
      expect(recurring.recurring).toBeInstanceOf(Array);
    });
  });

  describe('Personalized Insights', () => {
    it('should generate actionable insights', async () => {
      const transactions = Array(20).fill(null).map((_, i) => ({
        user_id: 1,
        amount: 100 + i * 10,
        type: 'expense',
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
        category_id: 1,
      }));
      mockDataService.getTransactionsByUser.mockResolvedValue(transactions);
      mockDataService.getBudgetsByUser.mockResolvedValue([]);

      const insights = await mlService.generateInsights(1);

      expect(insights).toHaveProperty('insights');
      expect(insights.insights).toBeInstanceOf(Array);
      if (insights.insights.length > 0) {
        expect(insights.insights[0]).toHaveProperty('type');
        expect(insights.insights[0]).toHaveProperty('message');
        expect(insights.insights[0]).toHaveProperty('priority');
      }
    });
  });
});
