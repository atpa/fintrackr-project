import fetchData from '../modules/api.js';
import initNavigation from '../modules/navigation.js';
import initProfileShell from '../modules/profile.js';

initNavigation();
initProfileShell();

function renderRecurringRows(items, tbody) {
  tbody.innerHTML = '';
  if (!Array.isArray(items) || items.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td colspan="4">No recurring patterns detected yet.</td>';
    tbody.appendChild(tr);
    return;
  }

  items.forEach((item) => {
    const tr = document.createElement('tr');
    const amount = item.amount ?? item.sampleAmount ?? 0;
    const currency = item.currency || item.sampleCurrency || 'USD';
    const frequency = item.frequency || (item.avgPeriodDays ? `${item.avgPeriodDays} days` : '-');
    tr.innerHTML = `
      <td>${item.name || item.pattern || '-'}</td>
      <td>${amount.toFixed(2)} ${currency}</td>
      <td>${frequency}</td>
      <td><button class="btn-secondary" data-id="${item.id}">Удалить</button></td>
    `;
    tbody.appendChild(tr);
  });
}

function updateSummary(items) {
  const summary = document.getElementById('recurringSummary');
  if (!summary) return;
  if (!Array.isArray(items) || items.length === 0) {
    summary.textContent = 'Monthly recurring total: 0';
    return;
  }
  const total = items.reduce((sum, item) => sum + Number(item.amount ?? item.sampleAmount ?? 0), 0);
  summary.textContent = `Monthly recurring total: ${total.toFixed(2)}`;
}

async function loadRecurring() {
  try {
    const tbody = document.querySelector('#recurringTable tbody');
    if (!tbody) {
      return;
    }
    const data = await fetchData('/api/recurring');
    const items = data?.recurring || [];
    renderRecurringRows(items, tbody);
    updateSummary(items);
  } catch (error) {
    console.error('Failed to load recurring data', error);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadRecurring);
} else {
  loadRecurring();
}
