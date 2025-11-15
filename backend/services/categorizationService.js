/**
 * Smart Transaction Categorization Service
 * AI-powered automatic transaction categorization using pattern matching
 */

/**
 * Built-in categorization rules database
 * Organized by category patterns
 */
const CATEGORIZATION_PATTERNS = {
  'Groceries': {
    keywords: [
      'grocery', 'supermarket', 'продукты', 'магазин', 'market',
      'walmart', 'target', 'costco', 'whole foods', 'trader joe',
      'aldi', 'kroger', 'safeway', 'publix', 'wegmans',
      'перекрёсток', 'пятёрочка', 'магнит', 'лента', 'ашан'
    ],
    patterns: [/grocery/i, /market/i, /продукт/i, /супермаркет/i]
  },
  'Restaurants': {
    keywords: [
      'restaurant', 'cafe', 'coffee', 'bar', 'grill', 'pizza',
      'ресторан', 'кафе', 'бар', 'кофе', 'пицца',
      'mcdonald', 'burger king', 'kfc', 'subway', 'starbucks',
      'dunkin', 'chipotle', 'taco bell', 'wendys',
      'макдональд', 'бургер кинг', 'старбакс'
    ],
    patterns: [/restaurant/i, /cafe/i, /coffee/i, /ресторан/i, /кафе/i]
  },
  'Transportation': {
    keywords: [
      'uber', 'lyft', 'taxi', 'gas', 'fuel', 'parking',
      'такси', 'бензин', 'топливо', 'парковка',
      'metro', 'subway', 'bus', 'train', 'airline',
      'метро', 'автобус', 'поезд',
      'яндекс такси', 'яндекс.такси', 'bolt', 'gett'
    ],
    patterns: [/taxi/i, /uber/i, /gas/i, /fuel/i, /парковка/i]
  },
  'Entertainment': {
    keywords: [
      'netflix', 'spotify', 'hulu', 'disney', 'cinema', 'movie',
      'theater', 'concert', 'game', 'steam', 'playstation',
      'кино', 'театр', 'концерт', 'игра',
      'youtube premium', 'apple music', 'amazon prime'
    ],
    patterns: [/entertainment/i, /movie/i, /concert/i, /кино/i]
  },
  'Shopping': {
    keywords: [
      'amazon', 'ebay', 'walmart', 'shop', 'store', 'mall',
      'магазин', 'покупка', 'товар',
      'aliexpress', 'ozon', 'wildberries', 'lamoda',
      'ikea', 'zara', 'h&m', 'nike', 'adidas'
    ],
    patterns: [/shop/i, /store/i, /mall/i, /магазин/i]
  },
  'Utilities': {
    keywords: [
      'electric', 'electricity', 'water', 'gas utility', 'internet',
      'phone', 'mobile', 'internet provider',
      'электричество', 'вода', 'газ', 'интернет', 'телефон',
      'мтс', 'билайн', 'мегафон', 'теле2'
    ],
    patterns: [/electric/i, /utility/i, /internet/i, /телефон/i]
  },
  'Healthcare': {
    keywords: [
      'pharmacy', 'hospital', 'doctor', 'medical', 'clinic',
      'аптека', 'больница', 'врач', 'медицин', 'клиника',
      'cvs', 'walgreens', 'rite aid'
    ],
    patterns: [/pharmacy/i, /medical/i, /doctor/i, /аптека/i]
  },
  'Fitness': {
    keywords: [
      'gym', 'fitness', 'yoga', 'sport', 'workout',
      'спортзал', 'фитнес', 'йога', 'спорт', 'тренировка',
      'planet fitness', '24 hour fitness', 'anytime fitness'
    ],
    patterns: [/gym/i, /fitness/i, /sport/i, /фитнес/i]
  },
  'Salary': {
    keywords: [
      'salary', 'payroll', 'wages', 'income', 'payment',
      'зарплата', 'оплата труда', 'доход'
    ],
    patterns: [/salary/i, /payroll/i, /wages/i, /зарплата/i]
  },
  'Investment': {
    keywords: [
      'dividend', 'interest', 'investment', 'stock', 'bond',
      'дивиденд', 'процент', 'инвестиция', 'акции'
    ],
    patterns: [/dividend/i, /investment/i, /interest/i, /инвестиц/i]
  }
};

/**
 * Categorize transaction based on description
 * @param {string} description - Transaction description
 * @param {Array} categories - Available categories
 * @param {Array} userRules - User-defined categorization rules
 * @returns {Object|null} Matched category with confidence score
 */
function categorizeTransaction(description, categories, userRules = []) {
  if (!description) return null;
  
  const normalizedDesc = description.toLowerCase().trim();
  
  // First, check user-defined rules (highest priority)
  const userMatch = matchUserRules(normalizedDesc, userRules, categories);
  if (userMatch) {
    return userMatch;
  }
  
  // Then, check built-in patterns
  const patternMatch = matchPatterns(normalizedDesc, categories);
  if (patternMatch) {
    return patternMatch;
  }
  
  // Finally, try fuzzy matching
  const fuzzyMatch = fuzzyMatchCategory(normalizedDesc, categories);
  if (fuzzyMatch && fuzzyMatch.confidence > 0.3) {
    return fuzzyMatch;
  }
  
  return null;
}

/**
 * Match against user-defined rules
 */
function matchUserRules(description, rules, categories) {
  for (const rule of rules) {
    const keyword = rule.keyword.toLowerCase();
    if (description.includes(keyword)) {
      const category = categories.find(c => c.id === rule.category_id);
      if (category) {
        return {
          category_id: category.id,
          category_name: category.name,
          confidence: 1.0,
          method: 'user_rule',
          matched_keyword: keyword
        };
      }
    }
  }
  return null;
}

/**
 * Match against built-in patterns
 */
function matchPatterns(description, categories) {
  const matches = [];
  
  for (const [patternName, pattern] of Object.entries(CATEGORIZATION_PATTERNS)) {
    let score = 0;
    let matchedKeyword = null;
    
    // Check keywords
    for (const keyword of pattern.keywords) {
      if (description.includes(keyword.toLowerCase())) {
        score += 1.0;
        matchedKeyword = keyword;
        break;
      }
    }
    
    // Check regex patterns
    if (score === 0) {
      for (const regex of pattern.patterns) {
        if (regex.test(description)) {
          score += 0.8;
          matchedKeyword = regex.toString();
          break;
        }
      }
    }
    
    if (score > 0) {
      // Find matching category
      const category = categories.find(c => 
        c.name.toLowerCase() === patternName.toLowerCase() ||
        c.name.toLowerCase().includes(patternName.toLowerCase()) ||
        patternName.toLowerCase().includes(c.name.toLowerCase())
      );
      
      if (category) {
        matches.push({
          category_id: category.id,
          category_name: category.name,
          confidence: Math.min(score, 1.0),
          method: 'pattern_match',
          matched_keyword: matchedKeyword
        });
      }
    }
  }
  
  // Return best match
  if (matches.length > 0) {
    matches.sort((a, b) => b.confidence - a.confidence);
    return matches[0];
  }
  
  return null;
}

/**
 * Fuzzy match category name in description
 */
function fuzzyMatchCategory(description, categories) {
  const matches = categories.map(category => {
    const categoryName = category.name.toLowerCase();
    const similarity = calculateSimilarity(description, categoryName);
    
    return {
      category_id: category.id,
      category_name: category.name,
      confidence: similarity,
      method: 'fuzzy_match'
    };
  }).filter(m => m.confidence > 0);
  
  if (matches.length > 0) {
    matches.sort((a, b) => b.confidence - a.confidence);
    return matches[0];
  }
  
  return null;
}

/**
 * Calculate string similarity (Jaccard similarity)
 */
function calculateSimilarity(str1, str2) {
  const words1 = new Set(str1.split(/\s+/));
  const words2 = new Set(str2.split(/\s+/));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}

/**
 * Learn from user corrections
 * When user changes category, create or update a rule
 * @param {string} description - Transaction description
 * @param {number} category_id - Correct category ID
 * @param {Array} existingRules - Current rules
 * @returns {Object} New or updated rule
 */
function learnFromCorrection(description, category_id, existingRules) {
  const normalizedDesc = description.toLowerCase().trim();
  
  // Extract meaningful keyword (first word or most distinctive word)
  const words = normalizedDesc.split(/\s+/);
  const keyword = words.find(w => w.length > 3) || words[0];
  
  // Check if rule already exists
  const existingRule = existingRules.find(r => 
    r.keyword.toLowerCase() === keyword && 
    r.category_id === category_id
  );
  
  if (existingRule) {
    return existingRule;
  }
  
  // Create new rule
  return {
    keyword,
    category_id,
    confidence: 0.8,
    created_from: 'user_correction'
  };
}

/**
 * Batch categorize multiple transactions
 * @param {Array} transactions - Transactions to categorize
 * @param {Array} categories - Available categories
 * @param {Array} userRules - User-defined rules
 * @returns {Array} Categorization results
 */
function batchCategorize(transactions, categories, userRules = []) {
  return transactions.map(tx => {
    const result = categorizeTransaction(tx.description || tx.note, categories, userRules);
    
    return {
      transaction_id: tx.id,
      ...result,
      original_category: tx.category_id
    };
  }).filter(r => r.category_id); // Only return successful matches
}

/**
 * Get categorization statistics
 * @param {Array} transactions - Transactions
 * @param {Array} categories - Available categories
 * @param {Array} userRules - User rules
 * @returns {Object} Statistics
 */
function getCategorizationStatistics(transactions, categories, userRules = []) {
  const results = batchCategorize(transactions, categories, userRules);
  
  const byMethod = {
    user_rule: 0,
    pattern_match: 0,
    fuzzy_match: 0
  };
  
  const byConfidence = {
    high: 0,    // > 0.8
    medium: 0,  // 0.5 - 0.8
    low: 0      // < 0.5
  };
  
  results.forEach(r => {
    byMethod[r.method] = (byMethod[r.method] || 0) + 1;
    
    if (r.confidence > 0.8) byConfidence.high++;
    else if (r.confidence >= 0.5) byConfidence.medium++;
    else byConfidence.low++;
  });
  
  return {
    total_transactions: transactions.length,
    categorized: results.length,
    uncategorized: transactions.length - results.length,
    success_rate: ((results.length / transactions.length) * 100).toFixed(1),
    by_method: byMethod,
    by_confidence: byConfidence
  };
}

module.exports = {
  categorizeTransaction,
  learnFromCorrection,
  batchCategorize,
  getCategorizationStatistics,
  CATEGORIZATION_PATTERNS
};
