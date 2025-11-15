/**
 * Логика для страницы обучения: вывод уроков и простой викторины.
 */

// Список уроков. Каждый объект содержит id, заголовок и краткое описание.
const lessons = [
  { id: 1, title: 'Основы бюджета', description: 'Узнайте, что такое доходы, расходы и зачем нужно вести бюджет.' },
  { id: 2, title: 'Формирование финансовых целей', description: 'Поставьте себе цель и узнайте, как эффективно к ней идти.' },
  { id: 3, title: 'Инвестиции и сбережения', description: 'Почему важно откладывать и как начать инвестировать.' }
];

// Вопросы викторины. Каждый содержит вопрос, варианты ответов и индекс правильного.
const quizQuestions = [
  {
    question: 'Что такое актив?',
    options: ['Долг, который нужно вернуть', 'То, что приносит доход', 'Расходы на развлечения'],
    correct: 1
  },
  {
    question: 'Что такое бюджет?',
    options: ['План доходов и расходов', 'Кредитный лимит', 'Финансовая подушка безопасности'],
    correct: 0
  },
  {
    question: 'Почему важно иметь резервный фонд?',
    options: ['Для оплаты покупок по акциям', 'Для подстраховки на случай непредвидённых расходов', 'Для развлечений'],
    correct: 1
  }
];

// Загружает прогресс уроков из localStorage
function loadLessonProgress() {
  try {
    return JSON.parse(localStorage.getItem('eduProgress') || '{}');
  } catch (e) {
    return {};
  }
}

// Сохраняет прогресс уроков
function saveLessonProgress(progress) {
  localStorage.setItem('eduProgress', JSON.stringify(progress));
}

// Отображает список уроков с кнопкой завершения
function renderLessons() {
  const container = document.getElementById('lessonsContainer');
  if (!container) return;
  const progress = loadLessonProgress();
  container.innerHTML = '';
  lessons.forEach(lesson => {
    const card = document.createElement('div');
    card.className = 'lesson-card';
    const h3 = document.createElement('h3');
    h3.textContent = lesson.title;
    const desc = document.createElement('p');
    desc.textContent = lesson.description;
    const status = document.createElement('p');
    status.style.fontWeight = '600';
    const btn = document.createElement('button');
    btn.className = 'btn-primary';
    if (progress[lesson.id]) {
      status.textContent = '✔ Завершено';
      status.style.color = 'var(--primary)';
      btn.textContent = 'Повторить';
    } else {
      status.textContent = 'Еще не завершён';
      status.style.color = 'var(--danger)';
      btn.textContent = 'Отметить завершённым';
    }
    btn.style.marginTop = '0.5rem';
    btn.addEventListener('click', () => {
      const progress = loadLessonProgress();
      progress[lesson.id] = !progress[lesson.id];
      saveLessonProgress(progress);
      renderLessons();
    });
    card.appendChild(h3);
    card.appendChild(desc);
    card.appendChild(status);
    card.appendChild(btn);
    container.appendChild(card);
  });
}

// Отображает викторину
function renderQuiz() {
  const container = document.getElementById('quizContainer');
  if (!container) return;
  container.innerHTML = '';
  quizQuestions.forEach((q, idx) => {
    const qDiv = document.createElement('div');
    qDiv.className = 'quiz-question';
    const qTitle = document.createElement('p');
    qTitle.textContent = `${idx + 1}. ${q.question}`;
    qTitle.style.fontWeight = '600';
    qDiv.appendChild(qTitle);
    const optionsList = document.createElement('ul');
    optionsList.style.listStyle = 'none';
    optionsList.style.paddingLeft = '0';
    q.options.forEach((opt, optIdx) => {
      const li = document.createElement('li');
      li.style.marginBottom = '0.5rem';
      const btn = document.createElement('button');
      btn.textContent = opt;
      btn.className = 'btn-primary';
      btn.style.fontSize = '0.9rem';
      btn.addEventListener('click', () => {
        // При выборе варианта показываем подсказку
        const correct = optIdx === q.correct;
        const result = document.createElement('span');
        result.textContent = correct ? ' ✔ Верно' : ' ✖ Неверно';
        result.style.marginLeft = '0.5rem';
        result.style.color = correct ? 'green' : 'red';
        // Удаляем предыдущие метки
        li.querySelectorAll('span').forEach(s => s.remove());
        li.appendChild(result);
      });
      li.appendChild(btn);
      optionsList.appendChild(li);
    });
    qDiv.appendChild(optionsList);
    container.appendChild(qDiv);
  });
}

function initEducationPage() {
  renderLessons();
  renderQuiz();
}

if (document.readyState !== 'loading') {
  initEducationPage();
} else {
  document.addEventListener('DOMContentLoaded', initEducationPage);
}