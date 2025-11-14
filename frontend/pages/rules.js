import initNavigation from '../modules/navigation.js';
import initProfileShell from '../modules/profile.js';

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
      if (!keyword || !categoryId) return;
      try {
        const resp = await fetch('/api/rules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keyword, category_id: categoryId })
        });
        if (resp.ok) {
          keywordInput.value = '';
          await loadRules();
        } else {
          alert('Ошибка при добавлении правила');
        }
      } catch (err) {
        console.error(err);
        alert('Ошибка сети');
      }
    });
  }
}

async function loadCategories() {
  try {
    const resp = await fetch('/api/categories');
    const cats = await resp.json();
    const select = document.getElementById('ruleCategorySelect');
    select.innerHTML = '';
    cats.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat.id;
      opt.textContent = cat.name;
      select.appendChild(opt);
    });
  } catch (err) {
    console.error(err);
  }
}

async function loadRules() {
  try {
    const resp = await fetch('/api/rules');
    const rules = await resp.json();
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
      const respCats = await fetch('/api/categories');
      cats = await respCats.json();
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
        if (!confirm('Удалить правило?')) return;
        try {
          const resDel = await fetch(`/api/rules/${rule.id}`, { method: 'DELETE' });
          if (resDel.ok) {
            await loadRules();
          } else {
            alert('Ошибка удаления');
          }
        } catch (err) {
          console.error(err);
        }
      });
      tdActions.appendChild(btn);
      tr.appendChild(tdActions);
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
  }
}