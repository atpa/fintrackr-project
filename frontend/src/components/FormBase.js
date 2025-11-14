/**
 * FormBase.js - Универсальный компонент форм с валидацией
 * 
 * Функциональность:
 * - Автоматическая генерация полей из конфигурации
 * - Встроенная валидация (required, email, min, max, pattern, custom)
 * - Поддержка типов: text, email, password, number, select, textarea, date, checkbox, radio
 * - Показ ошибок валидации в реальном времени
 * - Группировка полей (fieldset)
 * - Disabled/readonly states
 * - Автофокус на первом поле
 */

/**
 * Правила валидации
 */
const VALIDATION_RULES = {
  required: (value) => {
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'string') return value.trim().length > 0;
    return value !== null && value !== undefined;
  },
  
  email: (value) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return !value || emailRegex.test(value);
  },
  
  min: (value, min) => {
    if (typeof value === 'number') return value >= min;
    if (typeof value === 'string') return value.length >= min;
    return true;
  },
  
  max: (value, max) => {
    if (typeof value === 'number') return value <= max;
    if (typeof value === 'string') return value.length <= max;
    return true;
  },
  
  minLength: (value, length) => {
    return !value || value.length >= length;
  },
  
  maxLength: (value, length) => {
    return !value || value.length <= length;
  },
  
  pattern: (value, pattern) => {
    if (!value) return true;
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    return regex.test(value);
  },
  
  numeric: (value) => {
    return !value || /^\d+$/.test(value);
  },
  
  alphanumeric: (value) => {
    return !value || /^[a-zA-Z0-9]+$/.test(value);
  },
};

/**
 * Сообщения об ошибках (можно кастомизировать)
 */
const ERROR_MESSAGES = {
  required: 'Это поле обязательно для заполнения',
  email: 'Введите корректный email',
  min: (min) => `Минимальное значение: ${min}`,
  max: (max) => `Максимальное значение: ${max}`,
  minLength: (length) => `Минимальная длина: ${length} символов`,
  maxLength: (length) => `Максимальная длина: ${length} символов`,
  pattern: 'Неверный формат',
  numeric: 'Только цифры',
  alphanumeric: 'Только буквы и цифры',
};

/**
 * Создаёт поле формы
 * @param {Object} fieldConfig - Конфигурация поля
 * @returns {HTMLElement}
 */
function createField(fieldConfig) {
  const {
    name,
    type = 'text',
    label,
    placeholder = '',
    value = '',
    options = [], // для select/radio
    validation = {},
    disabled = false,
    readonly = false,
    autofocus = false,
    hint = '', // Подсказка под полем
  } = fieldConfig;

  const fieldWrapper = document.createElement('div');
  fieldWrapper.className = 'form-field';
  fieldWrapper.setAttribute('data-field', name);

  // Label
  if (label) {
    const labelEl = document.createElement('label');
    labelEl.className = 'form-label';
    labelEl.setAttribute('for', name);
    labelEl.textContent = label;
    if (validation.required) {
      labelEl.innerHTML += ' <span class="form-required">*</span>';
    }
    fieldWrapper.appendChild(labelEl);
  }

  let inputEl;

  // Создаём элемент в зависимости от типа
  switch (type) {
    case 'textarea':
      inputEl = document.createElement('textarea');
      inputEl.className = 'form-textarea';
      inputEl.rows = 4;
      break;

    case 'select':
      inputEl = document.createElement('select');
      inputEl.className = 'form-select';
      
      // Placeholder option
      if (placeholder) {
        const placeholderOption = document.createElement('option');
        placeholderOption.value = '';
        placeholderOption.textContent = placeholder;
        placeholderOption.disabled = true;
        placeholderOption.selected = !value;
        inputEl.appendChild(placeholderOption);
      }
      
      // Options
      options.forEach(opt => {
        const option = document.createElement('option');
        option.value = typeof opt === 'object' ? opt.value : opt;
        option.textContent = typeof opt === 'object' ? opt.label : opt;
        if (option.value === value) option.selected = true;
        inputEl.appendChild(option);
      });
      break;

    case 'checkbox':
      const checkboxWrapper = document.createElement('div');
      checkboxWrapper.className = 'form-checkbox-wrapper';
      
      inputEl = document.createElement('input');
      inputEl.type = 'checkbox';
      inputEl.className = 'form-checkbox';
      inputEl.checked = !!value;
      
      const checkboxLabel = document.createElement('label');
      checkboxLabel.className = 'form-checkbox-label';
      checkboxLabel.appendChild(inputEl);
      checkboxLabel.appendChild(document.createTextNode(label || ''));
      
      fieldWrapper.innerHTML = ''; // Очищаем обычный label
      fieldWrapper.appendChild(checkboxLabel);
      break;

    case 'radio':
      const radioWrapper = document.createElement('div');
      radioWrapper.className = 'form-radio-group';
      
      options.forEach(opt => {
        const radioOption = document.createElement('div');
        radioOption.className = 'form-radio-wrapper';
        
        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = name;
        radio.value = typeof opt === 'object' ? opt.value : opt;
        radio.className = 'form-radio';
        radio.checked = radio.value === value;
        
        const radioLabel = document.createElement('label');
        radioLabel.className = 'form-radio-label';
        radioLabel.appendChild(radio);
        radioLabel.appendChild(document.createTextNode(typeof opt === 'object' ? opt.label : opt));
        
        radioOption.appendChild(radioLabel);
        radioWrapper.appendChild(radioOption);
      });
      
      fieldWrapper.appendChild(radioWrapper);
      inputEl = radioWrapper; // Для валидации будем проверять группу
      break;

    default:
      inputEl = document.createElement('input');
      inputEl.type = type;
      inputEl.className = 'form-input';
      if (placeholder) inputEl.placeholder = placeholder;
      if (value) inputEl.value = value;
  }

  // Общие атрибуты
  if (inputEl.tagName !== 'DIV') {
    inputEl.id = name;
    inputEl.name = name;
    if (disabled) inputEl.disabled = true;
    if (readonly) inputEl.readOnly = true;
    if (autofocus) inputEl.autofocus = true;
    
    // Добавляем в wrapper если не checkbox/radio
    if (type !== 'checkbox' && type !== 'radio') {
      fieldWrapper.appendChild(inputEl);
    }
  }

  // Hint
  if (hint) {
    const hintEl = document.createElement('div');
    hintEl.className = 'form-hint';
    hintEl.textContent = hint;
    fieldWrapper.appendChild(hintEl);
  }

  // Error container
  const errorEl = document.createElement('div');
  errorEl.className = 'form-error';
  errorEl.style.display = 'none';
  fieldWrapper.appendChild(errorEl);

  return fieldWrapper;
}

/**
 * Валидирует поле
 * @param {HTMLElement} field - DOM элемент поля
 * @param {Object} validation - Правила валидации
 * @returns {Object} {valid, errors}
 */
function validateField(field, validation = {}) {
  const input = field.querySelector('input, select, textarea');
  if (!input) return { valid: true, errors: [] };

  const value = input.type === 'checkbox' 
    ? input.checked 
    : input.type === 'radio'
      ? field.querySelector('input[type="radio"]:checked')?.value || ''
      : input.value;

  const errors = [];

  // Проверяем каждое правило
  Object.entries(validation).forEach(([rule, ruleValue]) => {
    if (rule === 'custom') {
      const customResult = ruleValue(value);
      if (customResult !== true) {
        errors.push(typeof customResult === 'string' ? customResult : 'Некорректное значение');
      }
      return;
    }

    const validator = VALIDATION_RULES[rule];
    if (!validator) return;

    const isValid = validator(value, ruleValue);
    if (!isValid) {
      const errorMsg = ERROR_MESSAGES[rule];
      errors.push(
        typeof errorMsg === 'function' 
          ? errorMsg(ruleValue) 
          : errorMsg
      );
    }
  });

  return { valid: errors.length === 0, errors };
}

/**
 * Показывает ошибки валидации
 * @param {HTMLElement} field
 * @param {Array} errors
 */
function showFieldErrors(field, errors) {
  const errorEl = field.querySelector('.form-error');
  const input = field.querySelector('input, select, textarea');
  
  if (errors.length > 0) {
    errorEl.textContent = errors[0]; // Показываем первую ошибку
    errorEl.style.display = 'block';
    field.classList.add('form-field--error');
    if (input) input.classList.add('form-input--error');
  } else {
    errorEl.style.display = 'none';
    field.classList.remove('form-field--error');
    if (input) input.classList.remove('form-input--error');
  }
}

/**
 * Создаёт форму
 * @param {Object} config - Конфигурация формы
 * @returns {HTMLFormElement}
 */
export function createForm(config) {
  const {
    fields = [],
    onSubmit = null,
    submitLabel = 'Отправить',
    cancelLabel = null,
    onCancel = null,
    validateOnBlur = true,
    validateOnChange = false,
    showSubmitButton = true,
  } = config;

  const form = document.createElement('form');
  form.className = 'form-base';
  form.noValidate = true; // Отключаем браузерную валидацию

  // Храним конфигурацию полей для валидации
  const fieldConfigs = new Map();

  // Создаём поля
  fields.forEach(fieldConfig => {
    const field = createField(fieldConfig);
    form.appendChild(field);
    fieldConfigs.set(fieldConfig.name, fieldConfig);

    // Валидация на blur
    if (validateOnBlur) {
      const input = field.querySelector('input, select, textarea');
      if (input) {
        input.addEventListener('blur', () => {
          const result = validateField(field, fieldConfig.validation);
          showFieldErrors(field, result.errors);
        });
      }
    }

    // Валидация на change
    if (validateOnChange) {
      const input = field.querySelector('input, select, textarea');
      if (input) {
        input.addEventListener('input', () => {
          const result = validateField(field, fieldConfig.validation);
          showFieldErrors(field, result.errors);
        });
      }
    }
  });

  // Кнопки
  if (showSubmitButton || cancelLabel) {
    const buttonGroup = document.createElement('div');
    buttonGroup.className = 'form-buttons';

    if (cancelLabel) {
      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.className = 'btn btn--secondary';
      cancelBtn.textContent = cancelLabel;
      cancelBtn.addEventListener('click', () => {
        if (onCancel) onCancel();
      });
      buttonGroup.appendChild(cancelBtn);
    }

    if (showSubmitButton) {
      const submitBtn = document.createElement('button');
      submitBtn.type = 'submit';
      submitBtn.className = 'btn btn--primary';
      submitBtn.textContent = submitLabel;
      buttonGroup.appendChild(submitBtn);
    }

    form.appendChild(buttonGroup);
  }

  // Submit handler
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Валидация всех полей
    let isValid = true;
    const formData = {};

    fields.forEach(fieldConfig => {
      const field = form.querySelector(`[data-field="${fieldConfig.name}"]`);
      const result = validateField(field, fieldConfig.validation);
      
      showFieldErrors(field, result.errors);
      
      if (!result.valid) {
        isValid = false;
      }

      // Собираем данные
      const input = field.querySelector('input, select, textarea');
      if (input) {
        if (input.type === 'checkbox') {
          formData[fieldConfig.name] = input.checked;
        } else if (input.type === 'radio') {
          formData[fieldConfig.name] = field.querySelector('input[type="radio"]:checked')?.value || '';
        } else {
          formData[fieldConfig.name] = input.value;
        }
      }
    });

    if (!isValid) {
      // Фокус на первом поле с ошибкой
      const firstError = form.querySelector('.form-field--error');
      if (firstError) {
        const input = firstError.querySelector('input, select, textarea');
        if (input) input.focus();
      }
      return;
    }

    // Вызываем callback
    if (onSubmit) {
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Отправка...';
      }

      try {
        await onSubmit(formData);
      } catch (error) {
        console.error('Form submission error:', error);
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = submitLabel;
        }
      }
    }
  });

  return form;
}

/**
 * Получает значения формы
 * @param {HTMLFormElement} form
 * @returns {Object}
 */
export function getFormValues(form) {
  const formData = new FormData(form);
  const values = {};
  
  for (const [key, value] of formData.entries()) {
    values[key] = value;
  }
  
  return values;
}

/**
 * Устанавливает значения формы
 * @param {HTMLFormElement} form
 * @param {Object} values
 */
export function setFormValues(form, values) {
  Object.entries(values).forEach(([name, value]) => {
    const input = form.querySelector(`[name="${name}"]`);
    if (input) {
      if (input.type === 'checkbox') {
        input.checked = !!value;
      } else if (input.type === 'radio') {
        const radio = form.querySelector(`[name="${name}"][value="${value}"]`);
        if (radio) radio.checked = true;
      } else {
        input.value = value;
      }
    }
  });
}

/**
 * Сбрасывает форму
 * @param {HTMLFormElement} form
 */
export function resetForm(form) {
  form.reset();
  
  // Очищаем ошибки
  const errors = form.querySelectorAll('.form-error');
  errors.forEach(error => {
    error.style.display = 'none';
  });
  
  const errorFields = form.querySelectorAll('.form-field--error');
  errorFields.forEach(field => {
    field.classList.remove('form-field--error');
  });
}
