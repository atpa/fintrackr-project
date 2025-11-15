/**
 * Утилиты валидации форм для FinTrackr
 * Используется в accounts.js, categories.js, transactions.js, settings.js
 */

/**
 * Установить сообщение об ошибке для поля
 * @param {HTMLInputElement|HTMLSelectElement} input - Элемент формы
 * @param {string} message - Текст ошибки (пустая строка для очистки)
 */
function setFieldError(input, message) {
  if (!input) return;
  
  const field = input.closest('.form-field');
  const errorEl = field ? field.querySelector('.form-error') : null;
  
  if (errorEl) {
    errorEl.textContent = message || '';
  }
  
  if (message) {
    input.classList.add('has-error');
  } else {
    input.classList.remove('has-error');
  }
}

/**
 * Очистить все ошибки валидации в форме
 * @param {HTMLFormElement} form - Элемент формы
 */
function clearAllFieldErrors(form) {
  if (!form) return;
  
  form.querySelectorAll('.has-error').forEach(input => {
    input.classList.remove('has-error');
  });
  
  form.querySelectorAll('.form-error').forEach(errorEl => {
    errorEl.textContent = '';
  });
}

/**
 * Валидировать обязательное поле
 * @param {HTMLInputElement} input - Элемент поля
 * @param {string} fieldName - Название поля для сообщения об ошибке
 * @returns {boolean} - true если валидно
 */
function validateRequired(input, fieldName = 'Поле') {
  const value = input.value.trim();
  if (!value) {
    setFieldError(input, `${fieldName} обязательно для заполнения`);
    return false;
  }
  setFieldError(input, '');
  return true;
}

/**
 * Валидировать email
 * @param {HTMLInputElement} input - Элемент поля email
 * @returns {boolean} - true если валидно
 */
function validateEmail(input) {
  const value = input.value.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!value) {
    setFieldError(input, 'Email обязателен для заполнения');
    return false;
  }
  
  if (!emailRegex.test(value)) {
    setFieldError(input, 'Введите корректный email');
    return false;
  }
  
  setFieldError(input, '');
  return true;
}

/**
 * Валидировать числовое поле
 * @param {HTMLInputElement} input - Элемент поля
 * @param {Object} options - Опции валидации
 * @param {number} [options.min] - Минимальное значение
 * @param {number} [options.max] - Максимальное значение
 * @param {string} [options.fieldName='Значение'] - Название поля
 * @returns {boolean} - true если валидно
 */
function validateNumber(input, options = {}) {
  const { min, max, fieldName = 'Значение' } = options;
  const value = input.value.trim();
  
  if (!value) {
    setFieldError(input, `${fieldName} обязательно для заполнения`);
    return false;
  }
  
  const num = parseFloat(value);
  
  if (isNaN(num)) {
    setFieldError(input, `${fieldName} должно быть числом`);
    return false;
  }
  
  if (min !== undefined && num < min) {
    setFieldError(input, `${fieldName} должно быть не менее ${min}`);
    return false;
  }
  
  if (max !== undefined && num > max) {
    setFieldError(input, `${fieldName} должно быть не более ${max}`);
    return false;
  }
  
  setFieldError(input, '');
  return true;
}
