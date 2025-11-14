async function loadRecurring(){
  const res = await fetch('/api/recurring');
  const data = await res.json();
  const tbody = document.querySelector('#table tbody');
  tbody.innerHTML = '';
  // XSS FIX: Use textContent for user-provided data
  for (const r of data.items) {
    const tr = document.createElement('tr');
    const tdName = document.createElement('td');
    tdName.textContent = r.name;
    const tdPeriod = document.createElement('td');
    tdPeriod.textContent = r.avgPeriodDays;
    const tdSample = document.createElement('td');
    tdSample.textContent = `${r.sampleAmount} ₽`;
    const tdMonthly = document.createElement('td');
    tdMonthly.textContent = `${r.estimatedMonthly} ₽`;
    tr.append(tdName, tdPeriod, tdSample, tdMonthly);
    tbody.appendChild(tr);
  }
  document.getElementById('summary').textContent = `Сумма по цикличным платежам в месяц: ${data.monthly} ₽`;
}
document.addEventListener('DOMContentLoaded', loadRecurring);
