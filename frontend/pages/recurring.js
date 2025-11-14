import initNavigation from '../modules/navigation.js';
import initProfileShell from '../modules/profile.js';

initNavigation();
initProfileShell();

async function loadRecurring() {
  try {
    const response = await fetch('/api/recurring');
    const data = await response.json();
    const tbody = document.querySelector('#recurringTable tbody');
    const summary = document.getElementById('recurringSummary');

    if (!tbody) {
      return;
    }

    tbody.innerHTML = '';
    if (Array.isArray(data.items) && data.items.length) {
      data.items.forEach((item) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${item.name}</td>
          <td>${item.sampleAmount} ₽</td>
          <td>${item.frequency || item.avgPeriodDays + ' дней'}</td>
          <td>${item.nextDate || '—'}</td>
        `;
        tbody.appendChild(tr);
      });
    } else {
      const emptyRow = document.createElement('tr');
      emptyRow.innerHTML = '<td colspan="4">Регулярные операции ещё не добавлены</td>';
      tbody.appendChild(emptyRow);
    }

    if (summary) {
      const monthly = data.monthly ? `${data.monthly} ₽` : '0 ₽';
      summary.textContent = `Суммарная ежемесячная нагрузка: ${monthly}`;
    }
  } catch (error) {
    console.error('Не удалось загрузить повторяющиеся операции', error);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadRecurring);
} else {
  loadRecurring();
}
