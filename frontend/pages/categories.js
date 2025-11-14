import initNavigation from '../modules/navigation.js';
import initProfileShell from '../modules/profile.js';
import { API } from '../src/modules/api.js';
import { toastSuccess, toastError } from '../src/components/Toast.js';
import { confirmModal } from '../src/components/ModalBase.js';

initNavigation();
initProfileShell();

/**
 * Логика для страницы категорий: загрузка, отображение, добавление и удаление категорий.
 */

async function loadCategories() {
  try {
    const categories = await API.categories.getAll();
    const tbody = document.querySelector('#categoriesTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (!categories.length) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 3;
      td.textContent = 'Категорий пока нет';
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }
    categories.forEach(cat => {
      const tr = document.createElement('tr');
      const nameTd = document.createElement('td');
      nameTd.textContent = cat.name;
      const kindTd = document.createElement('td');
      kindTd.textContent = cat.kind === 'income' ? 'Доход' : 'Расход';
      const actionTd = document.createElement('td');
      const delBtn = document.createElement('button');
      delBtn.textContent = 'Удалить';
      delBtn.className = 'btn-primary';
      delBtn.style.background = 'var(--danger)';
      delBtn.style.fontSize = '0.8rem';
      delBtn.addEventListener('click', async () => {
        const confirmed = await confirmModal({
          title: 'Удалить категорию?',
          message: 'Все операции останутся без категории.',
          confirmText: 'Удалить',
          danger: true
        });
        if (!confirmed) return;
        try {
          await API.categories.delete(cat.id);
          toastSuccess('Категория удалена');
          loadCategories();
        } catch (error) {
          console.error(error);
          toastError(`Не удалось удалить: ${error.message}`);
        }
      });
      actionTd.appendChild(delBtn);
      tr.append(nameTd, kindTd, actionTd);
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
  }
}

async function initCategoriesPage() {
  loadCategories();
  const form = document.getElementById('addCategoryForm');
  if (form) {
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const name = document.getElementById('catName').value.trim();
      const kind = document.getElementById('catKind').value;
      if (!name) return;
      try {
        await API.categories.create({ name, kind });
        toastSuccess('Категория добавлена!');
        loadCategories();
        form.reset();
      } catch (error) {
        console.error(error);
        toastError(`Не удалось добавить: ${error.message}`);
      }
    });
  }
}

if (document.readyState !== 'loading') {
  initCategoriesPage();
} else {
  document.addEventListener('DOMContentLoaded', initCategoriesPage);
}