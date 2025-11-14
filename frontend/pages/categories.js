import fetchData from '../modules/api.js';
import initNavigation from '../modules/navigation.js';
import initProfileShell from '../modules/profile.js';

initNavigation();
initProfileShell();

/**
 * Логика для страницы категорий: загрузка, отображение, добавление и удаление категорий.
 */

async function loadCategories() {
  try {
    const categories = await fetchData('/api/categories');
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
        if (!confirm('Удалить категорию? Все операции останутся без категории.')) return;
        try {
          const resp = await fetch(`/api/categories/${cat.id}`, { method: 'DELETE' });
          if (resp.ok) {
            loadCategories();
          } else {
            const err = await resp.json();
            alert('Ошибка: ' + (err.error || 'не удалось удалить'));
          }
        } catch (err) {
          console.error(err);
          alert('Ошибка сети');
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
        const resp = await fetch('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, kind })
        });
        if (resp.ok) {
          const created = await resp.json();
          // Перезагружаем список
          loadCategories();
          form.reset();
        } else {
          const err = await resp.json();
          alert('Ошибка: ' + (err.error || 'не удалось добавить'));
        }
      } catch (err) {
        console.error(err);
        alert('Ошибка сети');
      }
    });
  }
}

if (document.readyState !== 'loading') {
  initCategoriesPage();
} else {
  document.addEventListener('DOMContentLoaded', initCategoriesPage);
}