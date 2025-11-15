/**
 * Логика для страницы целей: загрузка целей, отображение и создание новых.
 */

/**
 * Отрисовывает карточки целей в виде сетки.
 * @param {Array} goals
 * @param {HTMLElement} container
 */
function renderGoals(goals, container) {
  container.innerHTML = '';
  if (!goals.length) {
    const p = document.createElement('p');
    p.textContent = 'Цели отсутствуют';
    container.appendChild(p);
    return;
  }
  goals.forEach(goal => {
    const card = document.createElement('div');
    card.className = 'goal-card';
    const title = document.createElement('h3');
    // XSS FIX: goal.title already uses textContent (safe)
    title.textContent = goal.title;
    const progressText = document.createElement('p');
    const current = Number(goal.current_amount || 0);
    const target = Number(goal.target_amount);
    // XSS FIX: Replace innerHTML with textContent + createElement
    const strong = document.createElement('strong');
    strong.textContent = current.toFixed(2);
    progressText.appendChild(strong);
    progressText.appendChild(document.createTextNode(` / ${target.toFixed(2)}`));
    // Создаём прогресс‑бар
    const barContainer = document.createElement('div');
    barContainer.className = 'progress-bar-small';
    const bar = document.createElement('div');
    const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0;
    bar.style.width = pct.toFixed(0) + '%';
    barContainer.appendChild(bar);
    const deadline = document.createElement('p');
    deadline.className = 'deadline';
    deadline.textContent = goal.deadline ? `Дедлайн: ${goal.deadline}` : 'Без дедлайна';
    card.append(title, progressText, barContainer, deadline);
    container.appendChild(card);
  });
}

async function initGoalsPage() {
  const grid = document.getElementById('goalsGrid');
  if (!grid) return;
  let goals = await fetchData('/api/goals');
  renderGoals(goals, grid);
  const form = document.getElementById('addGoalForm');
  if (form) {
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const newGoal = {
        title: document.getElementById('goalTitle').value,
        target_amount: parseFloat(document.getElementById('goalTarget').value),
        current_amount: parseFloat(document.getElementById('goalCurrent').value) || 0,
        deadline: document.getElementById('goalDeadline').value
      };
      try {
        const resp = await fetch('/api/goals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newGoal)
        });
        if (!resp.ok) {
          const err = await resp.json();
          alert('Ошибка: ' + (err.error || 'не удалось добавить цель'));
          return;
        }
        const created = await resp.json();
        goals.push(created);
        renderGoals(goals, grid);
        form.reset();
      } catch (err) {
        console.error(err);
        alert('Ошибка сети');
      }
    });
  }
}

if (document.readyState !== 'loading') {
  initGoalsPage();
} else {
  document.addEventListener('DOMContentLoaded', initGoalsPage);
}