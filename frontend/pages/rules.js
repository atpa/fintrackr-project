import initNavigation from '../modules/navigation.js';
import initProfileShell from '../modules/profile.js';
import { API } from '../src/modules/api.js';
import { toastSuccess, toastError } from '../src/components/Toast.js';
import { confirmModal } from '../src/components/ModalBase.js';

initNavigation();
initProfileShell();

// rules.js – управление правилами автоматической категоризации

document.addEventListener('DOMContentLoaded', initRulesPage);

function initRulesPage() {
  // Заполнить категории и правила
  loadCategories().then(() => {
    loadRules();
  });
  // Навешиваем обработчик на форму добавления
  const form = document.getElementById('addRuleForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const keywordInput = document.getElementById('ruleKeyword');
      const categorySelect = document.getElementById('ruleCategorySelect');
      const keyword = keywordInput.value.trim();
      const categoryId = Number(categorySelect.value);
      if (!keyword || !categoryId) {
        toastError('Заполните все поля');
        return;
      }
      try {
        await API.rules.create({ keyword, category_id: categoryId });
        keywordInput.value = '';
        toastSuccess('Правило добавлено');
        await loadRules();
      } catch (error) {
        console.error(error);
        toastError(`Не удалось добавить правило: ${error.message}`);
      }
    });
  }
}

async function loadCategories() {
  try {
    const cats = await API.categories.getAll();
    const select = document.getElementById('ruleCategorySelect');
    select.innerHTML = '';
    cats.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat.id;
      opt.textContent = cat.name;
      select.appendChild(opt);
    });
  } catch (error) {
    console.error(error);
    toastError(`Не удалось загрузить категории: ${error.message}`);
  }
}

async function loadRules() {
  try {
    const rules = await API.rules.getAll();
    const tbody = document.querySelector('#rulesTable tbody');
    tbody.innerHTML = '';
    if (!rules || rules.length === 0) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 3;
      td.textContent = 'Нет правил';
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }
    // Получаем категории для отображения имен
    let cats = [];
    try {
      cats = await API.categories.getAll();
    } catch {}
    rules.forEach(rule => {
      const tr = document.createElement('tr');
      const tdKeyword = document.createElement('td');
      tdKeyword.textContent = rule.keyword;
      tr.appendChild(tdKeyword);
      const tdCategory = document.createElement('td');
      const catName = cats.find(c => c.id === rule.category_id)?.name || rule.category_id;
      tdCategory.textContent = catName;
      tr.appendChild(tdCategory);
      const tdActions = document.createElement('td');
      const btn = document.createElement('button');
      btn.textContent = 'Удалить';
      btn.className = 'btn-danger';
      btn.addEventListener('click', async () => {
        const confirmed = await confirmModal({
          title: 'Удалить правило?',
          message: 'Это действие нельзя отменить',
          danger: true,
        });
        if (!confirmed) return;
        try {
          await API.rules.delete(rule.id);
          toastSuccess('Правило удалено');
          await loadRules();
        } catch (error) {
          console.error(error);
          toastError(`Не удалось удалить: ${error.message}`);
        }
      });
      tdActions.appendChild(btn);
      tr.appendChild(tdActions);
      tbody.appendChild(tr);
    });
  } catch (error) {
    console.error(error);
    toastError(`Не удалось загрузить правила: ${error.message}`);
  }
}