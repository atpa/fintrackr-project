/**
 * Financial Insights Generator
 * Generates actionable insights from financial data
 */

/**
 * Generate insights from financial data
 * @param {Object} data - Financial data (transactions, budgets, goals)
 * @returns {Array} Array of insight objects
 */
export function generateInsights(data) {
  const insights = [];
  
  if (!data) return insights;
  
  const { transactions = [], budgets = [], goals = [], accounts = [] } = data;
  
  // Budget insights
  insights.push(...analyzeBudgets(budgets));
  
  // Spending pattern insights
  insights.push(...analyzeSpendingPatterns(transactions));
  
  // Goal progress insights
  insights.push(...analyzeGoals(goals));
  
  // Account balance insights
  insights.push(...analyzeAccounts(accounts));
  
  // Savings opportunities
  insights.push(...identifySavingsOpportunities(transactions));
  
  // Sort by priority and return top 5
  return insights
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 5);
}

/**
 * Analyze budgets for insights
 */
function analyzeBudgets(budgets) {
  const insights = [];
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  budgets.forEach(budget => {
    if (budget.month !== currentMonth) return;
    
    const usage = (budget.spent / budget.limit) * 100;
    
    if (usage >= 90) {
      insights.push({
        type: 'warning',
        category: 'budget',
        title: 'Бюджет почти исчерпан',
        message: `Вы потратили ${usage.toFixed(0)}% бюджета. Осталось ${(budget.limit - budget.spent).toFixed(2)}.`,
        priority: 9,
        action: {
          label: 'Посмотреть бюджет',
          url: '/budgets.html'
        }
      });
    } else if (usage >= 75) {
      insights.push({
        type: 'info',
        category: 'budget',
        title: 'Приближаемся к лимиту',
        message: `Использовано ${usage.toFixed(0)}% бюджета. Следите за расходами.`,
        priority: 6,
        action: {
          label: 'Посмотреть бюджет',
          url: '/budgets.html'
        }
      });
    } else if (usage < 50) {
      insights.push({
        type: 'success',
        category: 'budget',
        title: 'Отличный контроль расходов!',
        message: `Использовано только ${usage.toFixed(0)}% бюджета.`,
        priority: 3
      });
    }
  });
  
  return insights;
}

/**
 * Analyze spending patterns
 */
function analyzeSpendingPatterns(transactions) {
  const insights = [];
  
  if (transactions.length < 10) return insights;
  
  // Get last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const recentTransactions = transactions.filter(tx => 
    new Date(tx.date) >= thirtyDaysAgo
  );
  
  const expenses = recentTransactions.filter(tx => tx.type === 'expense');
  
  if (expenses.length === 0) return insights;
  
  // Calculate daily average
  const totalExpenses = expenses.reduce((sum, tx) => sum + tx.amount, 0);
  const dailyAverage = totalExpenses / 30;
  
  // Check for unusual spending days
  const dailySpending = {};
  expenses.forEach(tx => {
    const date = tx.date;
    dailySpending[date] = (dailySpending[date] || 0) + tx.amount;
  });
  
  const unusualDays = Object.entries(dailySpending)
    .filter(([_, amount]) => amount > dailyAverage * 2)
    .sort((a, b) => b[1] - a[1]);
  
  if (unusualDays.length > 0) {
    const [date, amount] = unusualDays[0];
    insights.push({
      type: 'info',
      category: 'spending',
      title: 'Необычно высокие расходы',
      message: `${date}: ${amount.toFixed(2)} (в ${(amount / dailyAverage).toFixed(1)}x раз больше среднего)`,
      priority: 7
    });
  }
  
  // Recurring patterns
  const recurringInsight = detectRecurring(expenses);
  if (recurringInsight) {
    insights.push(recurringInsight);
  }
  
  return insights;
}

/**
 * Detect recurring transactions
 */
function detectRecurring(transactions) {
  if (transactions.length < 3) return null;
  
  // Group by similar amounts
  const amountGroups = {};
  transactions.forEach(tx => {
    const roundedAmount = Math.round(tx.amount);
    if (!amountGroups[roundedAmount]) {
      amountGroups[roundedAmount] = [];
    }
    amountGroups[roundedAmount].push(tx);
  });
  
  // Find groups with 3+ transactions
  for (const [amount, txs] of Object.entries(amountGroups)) {
    if (txs.length >= 3) {
      return {
        type: 'info',
        category: 'pattern',
        title: 'Обнаружена повторяющаяся транзакция',
        message: `${txs.length} транзакций на сумму ~${amount}. Возможно, это подписка?`,
        priority: 5,
        action: {
          label: 'Управление подписками',
          url: '/subscriptions.html'
        }
      };
    }
  }
  
  return null;
}

/**
 * Analyze goals
 */
function analyzeGoals(goals) {
  const insights = [];
  
  goals.forEach(goal => {
    const progress = (goal.current_amount / goal.target_amount) * 100;
    
    if (progress >= 100) {
      insights.push({
        type: 'success',
        category: 'goal',
        title: 'Цель достигнута! 🎉',
        message: `Поздравляем! Вы достигли цели "${goal.title}".`,
        priority: 10,
        action: {
          label: 'Посмотреть цели',
          url: '/goals.html'
        }
      });
    } else if (progress >= 75) {
      insights.push({
        type: 'success',
        category: 'goal',
        title: 'Почти у цели!',
        message: `Осталось ${((goal.target_amount - goal.current_amount)).toFixed(2)} до достижения "${goal.title}".`,
        priority: 8
      });
    } else if (goal.deadline) {
      const daysLeft = Math.ceil((new Date(goal.deadline) - new Date()) / (1000 * 60 * 60 * 24));
      const remaining = goal.target_amount - goal.current_amount;
      const dailyRequired = remaining / daysLeft;
      
      if (daysLeft > 0 && daysLeft < 30) {
        insights.push({
          type: 'warning',
          category: 'goal',
          title: 'Приближается дедлайн цели',
          message: `Осталось ${daysLeft} дней. Нужно откладывать ${dailyRequired.toFixed(2)} в день.`,
          priority: 7,
          action: {
            label: 'Посмотреть цели',
            url: '/goals.html'
          }
        });
      }
    }
  });
  
  return insights;
}

/**
 * Analyze accounts
 */
function analyzeAccounts(accounts) {
  const insights = [];
  
  accounts.forEach(account => {
    if (account.balance < 0) {
      insights.push({
        type: 'error',
        category: 'account',
        title: 'Отрицательный баланс',
        message: `Счёт "${account.name}" имеет отрицательный баланс: ${account.balance.toFixed(2)} ${account.currency}.`,
        priority: 10,
        action: {
          label: 'Посмотреть счета',
          url: '/accounts.html'
        }
      });
    } else if (account.balance < 100) {
      insights.push({
        type: 'warning',
        category: 'account',
        title: 'Низкий баланс',
        message: `На счету "${account.name}" осталось ${account.balance.toFixed(2)} ${account.currency}.`,
        priority: 8
      });
    }
  });
  
  return insights;
}

/**
 * Identify savings opportunities
 */
function identifySavingsOpportunities(transactions) {
  const insights = [];
  
  // Get last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const recentExpenses = transactions.filter(tx => 
    tx.type === 'expense' && new Date(tx.date) >= thirtyDaysAgo
  );
  
  if (recentExpenses.length < 5) return insights;
  
  // Categorize expenses
  const byCategory = {};
  recentExpenses.forEach(tx => {
    const cat = tx.category_name || 'Other';
    byCategory[cat] = (byCategory[cat] || 0) + tx.amount;
  });
  
  // Find high-spending categories
  const sortedCategories = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1]);
  
  // Suggest savings on discretionary categories
  const discretionary = ['Entertainment', 'Развлечения', 'Dining', 'Рестораны', 
                         'Shopping', 'Покупки'];
  
  for (const [category, amount] of sortedCategories.slice(0, 3)) {
    const isDiscretionary = discretionary.some(d => 
      category.toLowerCase().includes(d.toLowerCase())
    );
    
    if (isDiscretionary && amount > 100) {
      const potential = amount * 0.2;
      insights.push({
        type: 'info',
        category: 'savings',
        title: 'Возможность сэкономить',
        message: `Сократив расходы на "${category}" на 20%, можно сэкономить ${potential.toFixed(2)}.`,
        priority: 5
      });
      break; // Only suggest one savings opportunity
    }
  }
  
  return insights;
}

/**
 * Format insight for display
 */
export function formatInsight(insight) {
  const icons = {
    success: '✓',
    warning: '⚠',
    error: '✕',
    info: 'ℹ'
  };
  
  return {
    ...insight,
    icon: icons[insight.type] || icons.info
  };
}

export default { generateInsights, formatInsight };
