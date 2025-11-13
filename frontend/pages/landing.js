import initProfileShell from '../modules/profile.js';

initProfileShell({ requireAuth: false });

// Скрипт лендинга: анимация появления элементов
document.addEventListener('DOMContentLoaded', () => {
  const features = document.querySelectorAll('.feature');
  features.forEach((feat, idx) => {
    feat.style.animationDelay = `${idx * 0.2}s`;
    // Добавляем класс show чуть позже, чтобы анимация сыграла после загрузки
    setTimeout(() => {
      feat.classList.add('show');
    }, 100);
  });

  // Навигация: переключение адаптивного меню для лендинга
  const burger = document.querySelector('.burger');
  const nav = document.querySelector('.landing-nav');
  const authLinks = document.querySelector('.auth-links');
  if (burger && nav) {
    burger.addEventListener('click', () => {
      burger.classList.toggle('open');
      nav.classList.toggle('open');
      if (authLinks) authLinks.classList.toggle('open');
    });
    // Закрываем меню при клике по ссылке внутри навигации (только на мобильных)
    nav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
          burger.classList.remove('open');
          nav.classList.remove('open');
          if (authLinks) authLinks.classList.remove('open');
        }
      });
    });
    // Закрываем меню по нажатию Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        burger.classList.remove('open');
        nav.classList.remove('open');
        if (authLinks) authLinks.classList.remove('open');
      }
    });
  }
});