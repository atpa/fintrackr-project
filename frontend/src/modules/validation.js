/**
 * Validation Module
 * @module validation
 * @description Unified validation rules and schemas for forms
 */

// ======================
// Validation Rules
// ======================

export const ValidationRules = {
  /**
   * Required field validation
   */
  required: (value) => {
    if (value == null || value === '') {
      return 'Это поле обязательно';
    }
    if (typeof value === 'string' && value.trim() === '') {
      return 'Это поле не может быть пустым';
    }
    return null;
  },

  /**
   * Email validation
   */
  email: (value) => {
    if (!value) return null;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return 'Неверный формат email';
    }
    return null;
  },

  /**
   * Minimum length validation
   */
  minLength: (min) => (value) => {
    if (!value) return null;
    if (value.length < min) {
      return `Минимальная длина: ${min} символов`;
    }
    return null;
  },

  /**
   * Maximum length validation
   */
  maxLength: (max) => (value) => {
    if (!value) return null;
    if (value.length > max) {
      return `Максимальная длина: ${max} символов`;
    }
    return null;
  },

  /**
   * Minimum value validation (numbers)
   */
  min: (min) => (value) => {
    if (value == null) return null;
    const num = Number(value);
    if (isNaN(num)) {
      return 'Значение должно быть числом';
    }
    if (num < min) {
      return `Минимальное значение: ${min}`;
    }
    return null;
  },

  /**
   * Maximum value validation (numbers)
   */
  max: (max) => (value) => {
    if (value == null) return null;
    const num = Number(value);
    if (isNaN(num)) {
      return 'Значение должно быть числом';
    }
    if (num > max) {
      return `Максимальное значение: ${max}`;
    }
    return null;
  },

  /**
   * Pattern validation (regex)
   */
  pattern: (regex, message = 'Неверный формат') => (value) => {
    if (!value) return null;
    if (!regex.test(value)) {
      return message;
    }
    return null;
  },

  /**
   * Numeric validation
   */
  numeric: (value) => {
    if (!value) return null;
    if (isNaN(Number(value))) {
      return 'Значение должно быть числом';
    }
    return null;
  },

  /**
   * Alphanumeric validation
   */
  alphanumeric: (value) => {
    if (!value) return null;
    if (!/^[a-zA-Z0-9]+$/.test(value)) {
      return 'Только буквы и цифры';
    }
    return null;
  },

  /**
   * URL validation
   */
  url: (value) => {
    if (!value) return null;
    try {
      new URL(value);
      return null;
    } catch {
      return 'Неверный формат URL';
    }
  },

  /**
   * Date validation (YYYY-MM-DD)
   */
  date: (value) => {
    if (!value) return null;
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(value)) {
      return 'Формат даты: YYYY-MM-DD';
    }
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return 'Неверная дата';
    }
    return null;
  },

  /**
   * Currency validation
   */
  currency: (value) => {
    if (!value) return null;
    const validCurrencies = ['USD', 'EUR', 'PLN', 'RUB'];
    if (!validCurrencies.includes(value)) {
      return 'Неверная валюта';
    }
    return null;
  },

  /**
   * Positive number validation
   */
  positive: (value) => {
    if (value == null) return null;
    const num = Number(value);
    if (isNaN(num)) {
      return 'Значение должно быть числом';
    }
    if (num <= 0) {
      return 'Значение должно быть положительным';
    }
    return null;
  },
};

// ======================
// Entity Schemas
// ======================

export const Schemas = {
  /**
   * Account validation schema
   */
  account: {
    name: [
      ValidationRules.required,
      ValidationRules.minLength(2),
      ValidationRules.maxLength(50),
    ],
    currency: [ValidationRules.required, ValidationRules.currency],
    balance: [ValidationRules.numeric],
  },

  /**
   * Transaction validation schema
   */
  transaction: {
    account_id: [ValidationRules.required],
    category_id: [ValidationRules.required],
    type: [
      ValidationRules.required,
      ValidationRules.pattern(/^(income|expense)$/, 'Тип должен быть income или expense'),
    ],
    amount: [ValidationRules.required, ValidationRules.positive],
    currency: [ValidationRules.required, ValidationRules.currency],
    date: [ValidationRules.required, ValidationRules.date],
    note: [ValidationRules.maxLength(200)],
  },

  /**
   * Category validation schema
   */
  category: {
    name: [
      ValidationRules.required,
      ValidationRules.minLength(2),
      ValidationRules.maxLength(30),
    ],
    kind: [
      ValidationRules.required,
      ValidationRules.pattern(/^(income|expense)$/, 'Вид должен быть income или expense'),
    ],
    icon: [ValidationRules.maxLength(10)],
  },

  /**
   * Budget validation schema
   */
  budget: {
    category_id: [ValidationRules.required],
    month: [
      ValidationRules.required,
      ValidationRules.pattern(/^\d{4}-\d{2}$/, 'Формат месяца: YYYY-MM'),
    ],
    limit: [ValidationRules.required, ValidationRules.positive],
    currency: [ValidationRules.required, ValidationRules.currency],
  },

  /**
   * Goal validation schema
   */
  goal: {
    name: [
      ValidationRules.required,
      ValidationRules.minLength(3),
      ValidationRules.maxLength(50),
    ],
    target_amount: [ValidationRules.required, ValidationRules.positive],
    currency: [ValidationRules.required, ValidationRules.currency],
    deadline: [ValidationRules.date],
  },

  /**
   * Subscription validation schema
   */
  subscription: {
    name: [
      ValidationRules.required,
      ValidationRules.minLength(2),
      ValidationRules.maxLength(50),
    ],
    amount: [ValidationRules.required, ValidationRules.positive],
    currency: [ValidationRules.required, ValidationRules.currency],
    billing_period: [
      ValidationRules.required,
      ValidationRules.pattern(/^(monthly|yearly)$/, 'Период должен быть monthly или yearly'),
    ],
    next_billing_date: [ValidationRules.required, ValidationRules.date],
  },

  /**
   * Planned operation validation schema
   */
  planned: {
    name: [
      ValidationRules.required,
      ValidationRules.minLength(2),
      ValidationRules.maxLength(50),
    ],
    amount: [ValidationRules.required, ValidationRules.positive],
    currency: [ValidationRules.required, ValidationRules.currency],
    category_id: [ValidationRules.required],
    account_id: [ValidationRules.required],
    planned_date: [ValidationRules.required, ValidationRules.date],
  },
};

// ======================
// Validation Helpers
// ======================

/**
 * Validate single field
 * @param {*} value - Field value
 * @param {Array} rules - Array of validation functions
 * @returns {string|null} Error message or null
 */
export function validateField(value, rules) {
  if (!Array.isArray(rules)) return null;

  for (const rule of rules) {
    const error = rule(value);
    if (error) return error;
  }

  return null;
}

/**
 * Validate entire object against schema
 * @param {Object} data - Data to validate
 * @param {Object} schema - Validation schema
 * @returns {Object} { isValid: boolean, errors: Object }
 */
export function validateSchema(data, schema) {
  const errors = {};
  let isValid = true;

  for (const [field, rules] of Object.entries(schema)) {
    const error = validateField(data[field], rules);
    if (error) {
      errors[field] = error;
      isValid = false;
    }
  }

  return { isValid, errors };
}

/**
 * Validate entity by type
 * @param {string} entityType - Type of entity (account, transaction, etc.)
 * @param {Object} data - Entity data
 * @returns {Object} { isValid: boolean, errors: Object }
 */
export function validateEntity(entityType, data) {
  const schema = Schemas[entityType];
  if (!schema) {
    throw new Error(`Unknown entity type: ${entityType}`);
  }
  return validateSchema(data, schema);
}

/**
 * Create custom validator function
 * @param {Function} validatorFn - Custom validation function
 * @param {string} errorMessage - Error message
 * @returns {Function} Validator function
 */
export function createValidator(validatorFn, errorMessage) {
  return (value) => {
    if (!value) return null;
    return validatorFn(value) ? null : errorMessage;
  };
}

// ======================
// Form Validation Helper
// ======================

/**
 * Validate form and show errors
 * @param {HTMLFormElement} form - Form element
 * @param {Object} schema - Validation schema
 * @returns {Object} { isValid: boolean, values: Object, errors: Object }
 */
export function validateForm(form, schema) {
  const formData = new FormData(form);
  const values = Object.fromEntries(formData);
  const { isValid, errors } = validateSchema(values, schema);

  // Clear previous errors
  form.querySelectorAll('.field-error').forEach((el) => el.remove());
  form.querySelectorAll('.field-input--error').forEach((el) => {
    el.classList.remove('field-input--error');
  });

  // Show new errors
  if (!isValid) {
    Object.entries(errors).forEach(([field, message]) => {
      const input = form.querySelector(`[name="${field}"]`);
      if (input) {
        input.classList.add('field-input--error');
        const errorEl = document.createElement('div');
        errorEl.className = 'field-error';
        errorEl.textContent = message;
        input.parentElement.appendChild(errorEl);
      }
    });
  }

  return { isValid, values, errors };
}

// Default export
export default {
  ValidationRules,
  Schemas,
  validateField,
  validateSchema,
  validateEntity,
  validateForm,
  createValidator,
};
