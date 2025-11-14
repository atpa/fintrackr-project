/**
 * Toast.js - Система уведомлений (замена alert/confirm)
 * 
 * Функциональность:
 * - 4 варианта: success, error, warning, info
 * - Автоматическое закрытие через N секунд
 * - Стекирование (несколько toast одновременно)
 * - Позиционирование (top-right, top-left, bottom-right, bottom-left, top-center, bottom-center)
 * - Прогресс-бар автозакрытия
 * - Паузa на hover
 * - Кнопка закрытия
 */

let toastContainer = null;
let toastCounter = 0;

/**
 * Инициализирует контейнер для toast (вызывается автоматически)
 * @param {string} position - Позиция: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center'
 */
function initToastContainer(position = 'top-right') {
  if (toastContainer) return;

  toastContainer = document.createElement('div');
  toastContainer.className = `toast-container toast-container--${position}`;
  toastContainer.setAttribute('aria-live', 'polite');
  toastContainer.setAttribute('aria-atomic', 'true');
  document.body.appendChild(toastContainer);
}

/**
 * Показывает toast уведомление
 * @param {Object} options - Опции toast
 * @param {string} options.message - Текст уведомления
 * @param {string} options.variant - Вариант: 'success' | 'error' | 'warning' | 'info'
 * @param {number} options.duration - Длительность в мс (0 = не закрывать автоматически)
 * @param {string} options.position - Позиция контейнера
 * @param {boolean} options.dismissible - Показывать кнопку закрытия
 * @param {Function} options.onClick - Callback при клике на toast
 * @param {Function} options.onClose - Callback после закрытия
 * @returns {Object} API для управления toast
 */
export function showToast(options = {}) {
  const {
    message = '',
    variant = 'info',
    duration = 3000,
    position = 'top-right',
    dismissible = true,
    onClick = null,
    onClose = null,
  } = options;

  // Инициализируем контейнер если нужно
  if (!toastContainer) {
    initToastContainer(position);
  }

  const toastId = `toast-${++toastCounter}`;

  // Иконки для вариантов
  const icons = {
    success: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="2" fill="none"/></svg>',
    error: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="2" fill="none"/></svg>',
    warning: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" stroke="currentColor" stroke-width="2" fill="none"/></svg>',
    info: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="2" fill="none"/></svg>',
  };

  // Создаём toast элемент
  const toast = document.createElement('div');
  toast.className = `toast toast--${variant}`;
  toast.id = toastId;
  toast.setAttribute('role', 'alert');
  toast.innerHTML = `
    <div class="toast-icon">${icons[variant]}</div>
    <div class="toast-message">${message}</div>
    ${dismissible ? '<button class="toast-close" aria-label="Закрыть"><svg viewBox="0 0 24 24" width="16" height="16"><path d="M6 18L18 6M6 6l12 12" stroke="currentColor" stroke-width="2"/></svg></button>' : ''}
    ${duration > 0 ? '<div class="toast-progress"><div class="toast-progress-bar"></div></div>' : ''}
  `;

  // Добавляем в контейнер
  toastContainer.appendChild(toast);

  // Анимация появления
  requestAnimationFrame(() => {
    toast.classList.add('toast--show');
  });

  let autoCloseTimeout = null;
  let progressInterval = null;
  let startTime = Date.now();
  let remainingTime = duration;
  let isPaused = false;

  // Функция закрытия
  const closeToast = () => {
    if (autoCloseTimeout) clearTimeout(autoCloseTimeout);
    if (progressInterval) clearInterval(progressInterval);

    toast.classList.remove('toast--show');
    setTimeout(() => {
      toast.remove();
      if (onClose) onClose();
      
      // Удаляем контейнер если пустой
      if (toastContainer && toastContainer.children.length === 0) {
        toastContainer.remove();
        toastContainer = null;
      }
    }, 300);
  };

  // Автозакрытие
  if (duration > 0) {
    const progressBar = toast.querySelector('.toast-progress-bar');
    
    const startAutoClose = () => {
      startTime = Date.now();
      
      autoCloseTimeout = setTimeout(closeToast, remainingTime);
      
      progressInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = (elapsed / duration) * 100;
        if (progressBar) {
          progressBar.style.width = `${Math.min(progress, 100)}%`;
        }
      }, 16);
    };

    const pauseAutoClose = () => {
      if (isPaused) return;
      isPaused = true;
      
      clearTimeout(autoCloseTimeout);
      clearInterval(progressInterval);
      
      const elapsed = Date.now() - startTime;
      remainingTime = remainingTime - elapsed;
    };

    const resumeAutoClose = () => {
      if (!isPaused) return;
      isPaused = false;
      startAutoClose();
    };

    // Запускаем автозакрытие
    startAutoClose();

    // Пауза на hover
    toast.addEventListener('mouseenter', pauseAutoClose);
    toast.addEventListener('mouseleave', resumeAutoClose);
  }

  // Кнопка закрытия
  if (dismissible) {
    const closeButton = toast.querySelector('.toast-close');
    closeButton.addEventListener('click', (e) => {
      e.stopPropagation();
      closeToast();
    });
  }

  // Клик на toast
  if (onClick) {
    toast.style.cursor = 'pointer';
    toast.addEventListener('click', () => {
      onClick(toastInstance);
    });
  }

  const toastInstance = {
    id: toastId,
    close: closeToast,
    element: toast,
  };

  return toastInstance;
}

/**
 * Shorthand для success toast
 * @param {string} message
 * @param {Object} options
 */
export function toastSuccess(message, options = {}) {
  return showToast({ message, variant: 'success', ...options });
}

/**
 * Shorthand для error toast
 * @param {string} message
 * @param {Object} options
 */
export function toastError(message, options = {}) {
  return showToast({ message, variant: 'error', duration: 5000, ...options });
}

/**
/**
 * Shorthand для warning toast
 */
export function toastWarning(message, options = {}) {
  return showToast({ message, variant: 'warning', ...options });
}

/**
 * Shorthand для info toast
 */
export function toastInfo(message, options = {}) {
  return showToast({ message, variant: 'info', ...options });
}


/**
 * Закрывает все активные toast
 */
export function clearAllToasts() {
  if (toastContainer) {
    const toasts = toastContainer.querySelectorAll('.toast');
    toasts.forEach(toast => {
      toast.classList.remove('toast--show');
    });
    
    setTimeout(() => {
      if (toastContainer) {
        toastContainer.remove();
        toastContainer = null;
      }
    }, 300);
  }
}

/**
 * Устанавливает позицию контейнера (до показа первого toast)
 * @param {string} position
 */
export function setToastPosition(position) {
  if (toastContainer) {
    toastContainer.className = `toast-container toast-container--${position}`;
  }
}
