(function () {
  const state = {
    modal: null,
    backdrop: null,
    toastContainer: null,
  };

  function ensureModalRoot() {
    if (state.modal && state.backdrop) return;
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop hidden';
    backdrop.setAttribute('role', 'presentation');

    const modal = document.createElement('div');
    modal.className = 'modal hidden';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');

    document.body.appendChild(backdrop);
    document.body.appendChild(modal);

    backdrop.addEventListener('click', closeModal);

    state.modal = modal;
    state.backdrop = backdrop;
  }

  function ensureToastContainer() {
    if (state.toastContainer) return;
    const container = document.createElement('div');
    container.className = 'toast-container';
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('aria-atomic', 'true');
    document.body.appendChild(container);
    state.toastContainer = container;
  }

  function closeModal() {
    if (!state.modal || !state.backdrop) return;
    state.modal.classList.add('hidden');
    state.backdrop.classList.add('hidden');
    state.modal.innerHTML = '';
    document.body.classList.remove('modal-open');
  }

  function openModal({ title, content, actions = [], size = 'md' }) {
    ensureModalRoot();
    state.modal.className = `modal modal-${size}`;
    const header = document.createElement('div');
    header.className = 'modal-header';
    const titleEl = document.createElement('h3');
    titleEl.textContent = title || '';
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'modal-close';
    closeBtn.setAttribute('aria-label', 'Закрыть');
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', closeModal);
    header.append(titleEl, closeBtn);

    const body = document.createElement('div');
    body.className = 'modal-body';
    if (typeof content === 'string') {
      body.innerHTML = content;
    } else if (content instanceof Node) {
      body.appendChild(content);
    }

    const footer = document.createElement('div');
    footer.className = 'modal-footer';
    if (actions.length) {
      actions.forEach((action) => {
        const btn = document.createElement('button');
        btn.type = action.type || 'button';
        btn.textContent = action.label;
        btn.className = `btn-${action.variant || 'secondary'}`;
        if (action.onClick) {
          btn.addEventListener('click', (event) => action.onClick(event, closeModal));
        }
        footer.appendChild(btn);
      });
    }

    state.modal.innerHTML = '';
    state.modal.append(header, body, footer);
    state.modal.classList.remove('hidden');
    state.backdrop.classList.remove('hidden');
    document.body.classList.add('modal-open');
    return { close: closeModal, element: state.modal };
  }

  function confirmModal({
    title,
    description,
    confirmText = 'Подтвердить',
    cancelText = 'Отмена',
    variant = 'danger',
  }) {
    return new Promise((resolve) => {
      const content = document.createElement('p');
      content.textContent = description || '';
      openModal({
        title,
        content,
        actions: [
          {
            label: cancelText,
            variant: 'secondary',
            onClick: () => {
              closeModal();
              resolve(false);
            },
          },
          {
            label: confirmText,
            variant,
            onClick: () => {
              closeModal();
              resolve(true);
            },
          },
        ],
      });
    });
  }

  function showToast({ message, type = 'info', duration = 4000 }) {
    ensureToastContainer();
    if (!message) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    state.toastContainer.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  window.UI = {
    openModal,
    closeModal,
    confirmModal,
    showToast,
  };

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeModal();
    }
  });
})();
