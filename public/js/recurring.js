async function loadRecurring(){
  const res = await fetch('/api/recurring');
  const data = await res.json();
  const tbody = document.querySelector('#table tbody');
  tbody.innerHTML = '';
  for (const r of data.items) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${r.name}</td><td>${r.avgPeriodDays}</td><td>${r.sampleAmount} ₽</td><td>${r.estimatedMonthly} ₽</td>`;
    tbody.appendChild(tr);
  }
  document.getElementById('summary').textContent = `Сумма по цикличным платежам в месяц: ${data.monthly} ₽`;
}
document.addEventListener('DOMContentLoaded', loadRecurring);
