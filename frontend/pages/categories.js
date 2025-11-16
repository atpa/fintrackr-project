import fetchData, { postData, deleteData } from '../modules/api.js';
import initNavigation from '../modules/navigation.js';
import initProfileShell from '../modules/profile.js';

initNavigation();
initProfileShell();

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
      td.textContent = 'Категории пока не созданы';
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }
    categories.forEach((cat) => {
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
        if (!confirm('Удалить категорию? Связанные транзакции останутся без категории.')) return;
        try {
          await deleteData(`/api/categories/${cat.id}`);
          loadCategories();
        } catch (err) {
          alert(err.message || 'Не удалось удалить категорию');
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
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('catName').value.trim();
      const kind = document.getElementById('catKind').value;
      if (!name) return;
      try {
        await postData('/api/categories', { name, kind });
        form.reset();
        loadCategories();
      } catch (err) {
        alert(err.message || 'Не удалось создать категорию');
      }
    });
  }
}

if (document.readyState !== 'loading') {
  initCategoriesPage();
} else {
  document.addEventListener('DOMContentLoaded', initCategoriesPage);
}
