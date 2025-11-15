/**
 * UI notification utilities
 * Centralized notification and error handling for frontend
 */

/**
 * Show error message to user
 * @param {string} message - Error message
 * @param {Error} error - Optional error object for logging
 */
function showError(message, error = null) {
  if (error) {
    console.error("[Error]", message, error);
  }
  alert(message);
}

/**
 * Show success message to user
 * @param {string} message - Success message
 */
function showSuccess(message) {
  alert(message);
}

/**
 * Show info message to user
 * @param {string} message - Info message
 */
function showInfo(message) {
  alert(message);
}

/**
 * Confirm action with user
 * @param {string} message - Confirmation message
 * @returns {boolean} True if confirmed
 */
function confirmUser(message) {
  return confirm(message);
}

/**
 * Handle API error response
 * @param {Response} response - Fetch response object
 * @param {string} defaultMessage - Default error message
 */
async function handleApiError(response, defaultMessage = "Произошла ошибка") {
  try {
    const data = await response.json();
    showError(data.error || defaultMessage);
  } catch (e) {
    showError(defaultMessage);
  }
}

/**
 * Validate required fields
 * @param {object} fields - Object with field names and values
 * @returns {boolean} True if all fields are valid
 */
function validateRequired(fields) {
  for (const [name, value] of Object.entries(fields)) {
    if (!value || (typeof value === "string" && !value.trim())) {
      showError(`Заполните поле: ${name}`);
      return false;
    }
  }
  return true;
}

/**
 * Validate number field
 * @param {number} value - Value to validate
 * @param {string} fieldName - Field name for error message
 * @param {number} min - Minimum value (optional)
 * @returns {boolean} True if valid
 */
function validateNumber(value, fieldName, min = null) {
  if (!isFinite(value)) {
    showError(`Введите корректное число для поля: ${fieldName}`);
    return false;
  }
  if (min !== null && value < min) {
    showError(`${fieldName} должно быть не меньше ${min}`);
    return false;
  }
  return true;
}

// Export for use in browser
if (typeof window !== "undefined") {
  window.UINotifications = {
    showError,
    showSuccess,
    showInfo,
    confirmUser,
    handleApiError,
    validateRequired,
    validateNumber,
  };
}

// Export for modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    showError,
    showSuccess,
    showInfo,
    confirmUser,
    handleApiError,
    validateRequired,
    validateNumber,
  };
}
