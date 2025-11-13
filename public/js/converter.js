/**
 * Логика конвертера валют: отправка запроса на сервер и отображение результата.
 */
async function initConverter() {
  const form = document.getElementById('converterForm');
  const resultEl = document.getElementById('convResult');
  if (form) {
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const amount = parseFloat(document.getElementById('convAmount').value);
      const from = document.getElementById('convFrom').value;
      const to = document.getElementById('convTo').value;
      if (isNaN(amount) || amount < 0) {
        resultEl.textContent = 'Введите корректную сумму';
        return;
      }
      // Если валюты совпадают — не обращаемся к серверу
      if (from === to) {
        const n = Number(amount) || 0;
        resultEl.textContent = `${n.toFixed(2)} ${from} = ${n.toFixed(2)} ${to}`;
        return;
      }
      try {
        // Запрос на сервер для конвертации. Используем эндпоинт /api/convert с параметрами.
        const resp = await fetch(`/api/convert?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&amount=${encodeURIComponent(amount)}`);
        if (!resp.ok) {
          const err = await resp.json();
          resultEl.textContent = 'Ошибка: ' + (err.error || 'Не удалось получить курс');
          return;
        }
        const data = await resp.json();
        if (data && typeof data.result === 'number') {
          const converted = data.result;
          const n = Number(amount) || 0;
          resultEl.textContent = `${n.toFixed(2)} ${from} = ${converted.toFixed(2)} ${to}`;
        } else {
          resultEl.textContent = 'Не удалось выполнить конвертацию';
        }
      } catch (err) {
        console.error(err);
        resultEl.textContent = 'Ошибка сети';
      }
    });
  }
}

if (document.readyState !== 'loading') {
  initConverter();
} else {
  document.addEventListener('DOMContentLoaded', initConverter);
}