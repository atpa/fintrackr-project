/**
 * Логика для страницы Premium: обработка кликов по кнопкам подписки.
 * Пока что подписка демонстрационная и только выводит уведомление.
 */
document.addEventListener('DOMContentLoaded', () => {
  const buttons = document.querySelectorAll('.subscribe-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const plan = btn.getAttribute('data-plan');
      alert(`Спасибо за выбор тарифа ${plan === 'premium' ? 'Премиум' : 'AI‑Plus'}! Подписка пока недоступна, функция демонстрационная.`);
    });
  });
});