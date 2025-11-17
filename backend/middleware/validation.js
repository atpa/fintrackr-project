/**
 * Input Validation Middleware
 * Uses Joi for schema-based request validation
 */

const Joi = require('joi');
const logger = require('../utils/logger');

/**
 * Validation middleware factory
 * @param {Joi.Schema} schema - Joi validation schema
 * @param {string} property - Which request property to validate ('body', 'query', 'params')
 * @returns {Function} Express middleware
 */
function validate(schema, property = 'body') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false, // Return all errors, not just the first one
      stripUnknown: true // Remove unknown properties
    });

    if (error) {
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      logger.warn('Validation failed', {
        method: req.method,
        url: req.url,
        errors: errorDetails
      });

      return res.status(400).json({
        error: 'Validation failed',
        details: errorDetails
      });
    }

    // Replace request property with validated value (with defaults applied)
    req[property] = value;
    next();
  };
}

// ============================================
// AUTHENTICATION SCHEMAS
// ============================================

const authSchemas = {
  register: Joi.object({
    name: Joi.string().min(2).max(100).required()
      .messages({
        'string.empty': 'Имя обязательно',
        'string.min': 'Имя должно содержать минимум 2 символа',
        'string.max': 'Имя должно содержать максимум 100 символов'
      }),
    email: Joi.string().email().required()
      .messages({
        'string.empty': 'Email обязателен',
        'string.email': 'Некорректный формат email'
      }),
    password: Joi.string()
      .min(8)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/)
      .required()
      .messages({
        'string.empty': 'Пароль обязателен',
        'string.min': 'Пароль должен содержать минимум 8 символов',
        'string.pattern.base': 'Пароль должен содержать заглавные и строчные буквы, цифры и спецсимволы (@$!%*?&)'
      })
  }),

  login: Joi.object({
    email: Joi.string().email().required()
      .messages({
        'string.empty': 'Email обязателен',
        'string.email': 'Некорректный формат email'
      }),
    password: Joi.string().required()
      .messages({
        'string.empty': 'Пароль обязателен'
      })
  })
};

// ============================================
// TRANSACTION SCHEMAS
// ============================================

const transactionSchemas = {
  create: Joi.object({
    account_id: Joi.number().integer().positive().required()
      .messages({
        'number.base': 'ID счёта должен быть числом',
        'number.positive': 'ID счёта должен быть положительным числом',
        'any.required': 'ID счёта обязателен'
      }),
    category_id: Joi.number().integer().positive().optional().allow(null)
      .messages({
        'number.base': 'ID категории должен быть числом',
        'number.positive': 'ID категории должен быть положительным числом'
      }),
    type: Joi.string().valid('income', 'expense').required()
      .messages({
        'any.only': 'Тип должен быть income или expense',
        'any.required': 'Тип транзакции обязателен'
      }),
    amount: Joi.number().positive().precision(2).required()
      .messages({
        'number.base': 'Сумма должна быть числом',
        'number.positive': 'Сумма должна быть положительной',
        'any.required': 'Сумма обязательна'
      }),
    currency: Joi.string().length(3).uppercase().required()
      .messages({
        'string.length': 'Валюта должна быть трёхбуквенным кодом (USD, EUR и т.д.)',
        'any.required': 'Валюта обязательна'
      }),
    date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required()
      .messages({
        'string.pattern.base': 'Дата должна быть в формате YYYY-MM-DD',
        'any.required': 'Дата обязательна'
      }),
    note: Joi.string().max(500).optional().allow('', null)
      .messages({
        'string.max': 'Примечание должно содержать максимум 500 символов'
      })
  }),

  update: Joi.object({
    account_id: Joi.number().integer().positive().optional(),
    category_id: Joi.number().integer().positive().optional().allow(null),
    type: Joi.string().valid('income', 'expense').optional(),
    amount: Joi.number().positive().precision(2).optional(),
    currency: Joi.string().length(3).uppercase().optional(),
    date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional(),
    note: Joi.string().max(500).optional().allow('', null)
  }).min(1).messages({
    'object.min': 'Необходимо указать хотя бы одно поле для обновления'
  })
};

// ============================================
// ACCOUNT SCHEMAS
// ============================================

const accountSchemas = {
  create: Joi.object({
    name: Joi.string().min(2).max(100).required()
      .messages({
        'string.empty': 'Название счёта обязательно',
        'string.min': 'Название должно содержать минимум 2 символа',
        'string.max': 'Название должно содержать максимум 100 символов'
      }),
    currency: Joi.string().length(3).uppercase().required()
      .messages({
        'string.length': 'Валюта должна быть трёхбуквенным кодом',
        'any.required': 'Валюта обязательна'
      }),
    initial_balance: Joi.number().default(0)
      .messages({
        'number.base': 'Начальный баланс должен быть числом'
      })
  }),

  update: Joi.object({
    name: Joi.string().min(2).max(100).optional(),
    currency: Joi.string().length(3).uppercase().optional(),
    balance: Joi.number().optional()
  }).min(1).messages({
    'object.min': 'Необходимо указать хотя бы одно поле для обновления'
  })
};

// ============================================
// BUDGET SCHEMAS
// ============================================

const budgetSchemas = {
  create: Joi.object({
    category_id: Joi.number().integer().positive().required()
      .messages({
        'any.required': 'ID категории обязателен'
      }),
    limit: Joi.number().positive().precision(2).required()
      .messages({
        'number.positive': 'Лимит должен быть положительным числом',
        'any.required': 'Лимит обязателен'
      }),
    currency: Joi.string().length(3).uppercase().required()
      .messages({
        'string.length': 'Валюта должна быть трёхбуквенным кодом',
        'any.required': 'Валюта обязательна'
      }),
    month: Joi.string().pattern(/^\d{4}-\d{2}$/).required()
      .messages({
        'string.pattern.base': 'Месяц должен быть в формате YYYY-MM',
        'any.required': 'Месяц обязателен'
      })
  }),

  update: Joi.object({
    limit: Joi.number().positive().precision(2).optional(),
    currency: Joi.string().length(3).uppercase().optional(),
    spent: Joi.number().precision(2).optional()
  }).min(1).messages({
    'object.min': 'Необходимо указать хотя бы одно поле для обновления'
  })
};

// ============================================
// CATEGORY SCHEMAS
// ============================================

const categorySchemas = {
  create: Joi.object({
    name: Joi.string().min(2).max(100).required()
      .messages({
        'string.empty': 'Название категории обязательно',
        'string.min': 'Название должно содержать минимум 2 символа'
      }),
    kind: Joi.string().valid('income', 'expense').required()
      .messages({
        'any.only': 'Вид должен быть income или expense',
        'any.required': 'Вид категории обязателен'
      }),
    icon: Joi.string().max(50).optional().allow('', null)
  }),

  update: Joi.object({
    name: Joi.string().min(2).max(100).optional(),
    icon: Joi.string().max(50).optional().allow('', null)
  }).min(1).messages({
    'object.min': 'Необходимо указать хотя бы одно поле для обновления'
  })
};

// ============================================
// GOAL SCHEMAS
// ============================================

const goalSchemas = {
  create: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    target_amount: Joi.number().positive().precision(2).required(),
    currency: Joi.string().length(3).uppercase().required(),
    deadline: Joi.date().iso().min('now').optional().allow(null)
      .messages({
        'date.min': 'Срок не может быть в прошлом'
      })
  }),

  update: Joi.object({
    name: Joi.string().min(2).max(100).optional(),
    target_amount: Joi.number().positive().precision(2).optional(),
    current_amount: Joi.number().min(0).precision(2).optional(),
    currency: Joi.string().length(3).uppercase().optional(),
    deadline: Joi.date().iso().optional().allow(null),
    achieved: Joi.boolean().optional()
  }).min(1)
};

// ============================================
// ID PARAMETER SCHEMA
// ============================================

const idSchema = Joi.object({
  id: Joi.number().integer().positive().required()
    .messages({
      'number.base': 'ID должен быть числом',
      'number.positive': 'ID должен быть положительным числом',
      'any.required': 'ID обязателен'
    })
});

module.exports = {
  validate,
  schemas: {
    auth: authSchemas,
    transaction: transactionSchemas,
    account: accountSchemas,
    budget: budgetSchemas,
    category: categorySchemas,
    goal: goalSchemas,
    id: idSchema
  }
};
