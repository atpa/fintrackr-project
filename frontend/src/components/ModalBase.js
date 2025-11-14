/**
 * ModalBase.js - Универсальный компонент модальных окон
 * 
 * Функциональность:
 * - Различные размеры (sm, md, lg, xl, fullscreen)
 * - Поддержка custom контента (string HTML или DOM элемент)
 * - Массив кнопок с callback'ами
 * - Закрытие по ESC и клику на backdrop
 * - Анимации открытия/закрытия
 * - Accessibility (ARIA, focus trap)
 * - Стекирование модалок (z-index управление)
 */

let activeModals = [];
let modalCounter = 0;

/**
 * Создаёт и показывает модальное окно
 * @param {Object} config - Конфигурация модалки
 * @param {string} config.title - Заголовок модалки
 * @param {string|HTMLElement} config.content - Контент (HTML строка или DOM элемент)
 * @param {string} config.size - Размер: 'sm' | 'md' | 'lg' | 'xl' | 'fullscreen'
 * @param {Array} config.actions - Массив кнопок [{label, variant, onClick}]
 * @param {boolean} config.closeOnBackdrop - Закрывать при клике на backdrop (default: true)
 * @param {boolean} config.closeOnEsc - Закрывать по ESC (default: true)
 * @param {boolean} config.showCloseButton - Показывать кнопку закрытия (default: true)
 * @param {Function} config.onOpen - Callback после открытия
 * @param {Function} config.onClose - Callback после закрытия
 * @returns {Object} API для управления модалкой
 */
export function openModal(config) {
  const {
    title = '',
    content = '',
    size = 'md',
    actions = [],
    closeOnBackdrop = true,
    closeOnEsc = true,
    showCloseButton = true,
    onOpen = null,
    onClose = null,
  } = config;

  const modalId = `modal-${++modalCounter}`;
  const zIndex = 1000 + activeModals.length * 10;

  // Создаём структуру модалки
  const modalBackdrop = document.createElement('div');
  modalBackdrop.className = 'modal-backdrop';
  modalBackdrop.style.zIndex = zIndex;
  modalBackdrop.setAttribute('aria-hidden', 'true');

  const modalContainer = document.createElement('div');
  modalContainer.className = 'modal-container';
  modalContainer.style.zIndex = zIndex + 1;

  const modal = document.createElement('div');
  modal.className = `modal modal--${size}`;
  modal.id = modalId;
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  if (title) modal.setAttribute('aria-labelledby', `${modalId}-title`);

  // Header
  const modalHeader = document.createElement('div');
  modalHeader.className = 'modal-header';
  modalHeader.innerHTML = `
    <h2 class="modal-title" id="${modalId}-title">${title}</h2>
    ${showCloseButton ? '<button class="modal-close" aria-label="Закрыть"><svg viewBox="0 0 24 24" width="24" height="24"><path d="M6 18L18 6M6 6l12 12" stroke="currentColor" stroke-width="2"/></svg></button>' : ''}
  `;

  // Body
  const modalBody = document.createElement('div');
  modalBody.className = 'modal-body';
  if (typeof content === 'string') {
    modalBody.innerHTML = content;
  } else {
    modalBody.appendChild(content);
  }

  // Footer (если есть actions)
  const modalFooter = document.createElement('div');
  if (actions.length > 0) {
    modalFooter.className = 'modal-footer';
    actions.forEach(action => {
      const button = document.createElement('button');
      button.className = `btn btn--${action.variant || 'secondary'}`;
      button.textContent = action.label;
      button.addEventListener('click', () => {
        if (action.onClick) {
          action.onClick(closeModalFunc);
        }
      });
      modalFooter.appendChild(button);
    });
  }

  // Собираем модалку
  modal.appendChild(modalHeader);
  modal.appendChild(modalBody);
  if (actions.length > 0) modal.appendChild(modalFooter);
  modalContainer.appendChild(modal);

  // Добавляем в DOM
  document.body.appendChild(modalBackdrop);
  document.body.appendChild(modalContainer);
  document.body.style.overflow = 'hidden'; // Блокируем скролл body

  // Анимация появления
  requestAnimationFrame(() => {
    modalBackdrop.classList.add('modal-backdrop--active');
    modalContainer.classList.add('modal-container--active');
  });

  // Функция закрытия
  const closeModalFunc = () => {
    modalBackdrop.classList.remove('modal-backdrop--active');
    modalContainer.classList.remove('modal-container--active');

    setTimeout(() => {
      modalBackdrop.remove();
      modalContainer.remove();
      
      // Восстанавливаем скролл если нет других модалок
      activeModals = activeModals.filter(m => m.id !== modalId);
      if (activeModals.length === 0) {
        document.body.style.overflow = '';
      }

      if (onClose) onClose();
    }, 300); // Время анимации
  };

  // Обработчики событий
  if (showCloseButton) {
    const closeButton = modal.querySelector('.modal-close');
    closeButton.addEventListener('click', closeModalFunc);
  }

  if (closeOnBackdrop) {
    modalBackdrop.addEventListener('click', closeModalFunc);
  }

  if (closeOnEsc) {
    const escHandler = (e) => {
      if (e.key === 'Escape' && activeModals[activeModals.length - 1]?.id === modalId) {
        closeModalFunc();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
  }

  // Focus trap (фокус остаётся внутри модалки)
  const focusableElements = modal.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  const firstFocusable = focusableElements[0];
  const lastFocusable = focusableElements[focusableElements.length - 1];

  const trapFocus = (e) => {
    if (e.key === 'Tab') {
      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          lastFocusable.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          firstFocusable.focus();
          e.preventDefault();
        }
      }
    }
  };
  modal.addEventListener('keydown', trapFocus);

  // Устанавливаем фокус на первый элемент
  setTimeout(() => {
    if (firstFocusable) firstFocusable.focus();
  }, 100);

  // Регистрируем модалку
  const modalInstance = { id: modalId, close: closeModalFunc, modal, modalBody };
  activeModals.push(modalInstance);

  if (onOpen) onOpen(modalInstance);

  return modalInstance;
}

/**
 * Закрывает все открытые модалки
 */
export function closeAllModals() {
  [...activeModals].forEach(modal => modal.close());
}

/**
 * Получает текущую активную модалку
 * @returns {Object|null}
 */
export function getActiveModal() {
  return activeModals[activeModals.length - 1] || null;
}

/**
 * Обновляет контент модалки
 * @param {Object} modalInstance - Инстанс модалки из openModal()
 * @param {string|HTMLElement} newContent - Новый контент
 */
export function updateModalContent(modalInstance, newContent) {
  if (!modalInstance || !modalInstance.modalBody) return;
  
  if (typeof newContent === 'string') {
    modalInstance.modalBody.innerHTML = newContent;
  } else {
    modalInstance.modalBody.innerHTML = '';
    modalInstance.modalBody.appendChild(newContent);
  }
}

/**
 * Preset для модалки подтверждения
 * @param {Object} options
 * @returns {Promise<boolean>}
 */
export function confirmModal(options = {}) {
  return new Promise((resolve) => {
    const {
      title = 'Подтверждение',
      message = 'Вы уверены?',
      confirmLabel = 'Подтвердить',
      cancelLabel = 'Отмена',
      danger = false,
    } = options;

    openModal({
      title,
      content: `<p>${message}</p>`,
      size: 'sm',
      actions: [
        {
          label: cancelLabel,
          variant: 'secondary',
          onClick: (close) => {
            resolve(false);
            close();
          }
        },
        {
          label: confirmLabel,
          variant: danger ? 'danger' : 'primary',
          onClick: (close) => {
            resolve(true);
            close();
          }
        }
      ],
      closeOnBackdrop: false,
      onClose: () => resolve(false)
    });
  });
}

/**
 * Preset для модалки предупреждения
 * @param {Object} options
 */
export function alertModal(options = {}) {
  return new Promise((resolve) => {
    const {
      title = 'Внимание',
      message = '',
      variant = 'info', // 'info' | 'success' | 'warning' | 'danger'
      okLabel = 'OK',
    } = options;

    const icons = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      danger: '❌'
    };

    openModal({
      title,
      content: `
        <div class="modal-alert modal-alert--${variant}">
          <div class="modal-alert-icon">${icons[variant]}</div>
          <p>${message}</p>
        </div>
      `,
      size: 'sm',
      actions: [
        {
          label: okLabel,
          variant: 'primary',
          onClick: (close) => {
            resolve();
            close();
          }
        }
      ],
      onClose: () => resolve()
    });
  });
}
