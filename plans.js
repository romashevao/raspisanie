// Загружает OP.csv и строит таблицу дисциплин с лектором и руководителями практик
let allPlans = []; // храним все планы для фильтрации
let teachers = []; // список всех преподавателей

(async function initPlans() {
  try {
    // Синхронизируем тему с главной страницей
    try {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
      }
    } catch (_) {}

    const csvText = await fetchCsv();
    console.log('CSV текст загружен:', csvText ? 'да' : 'нет');
    allPlans = buildPlans(csvText);
    console.log('Планы построены:', allPlans.length);
    teachers = extractTeachers(allPlans);
    console.log('Преподаватели извлечены:', teachers.length);
    
    populateTeacherFilter();
    renderPlans(allPlans);
    
    // Обработчик фильтра
    const filter = document.getElementById('teacherFilter');
    if (filter) {
      filter.addEventListener('change', function() {
        const selectedTeacher = this.value;
        const filteredPlans = selectedTeacher 
          ? allPlans.filter(plan => 
              plan.lecturer === selectedTeacher || 
              plan.practitioners.includes(selectedTeacher)
            )
          : allPlans;
        renderPlans(filteredPlans);
      });
    }
  } catch (e) {
    console.error('Ошибка загрузки планов:', e);
    const tbody = document.querySelector('#plansTable tbody');
    if (tbody) {
      const tr = document.createElement('tr');
      tr.innerHTML = '<td colspan="3">Не удалось загрузить данные</td>';
      tbody.appendChild(tr);
    }
  }
})();

async function fetchCsv() {
  try {
    const res = await fetch('OP.csv');
    console.log('Статус ответа:', res.status);
    const text = await res.text();
    console.log('CSV размер:', text.length, 'символов');
    if (text && text.trim().length > 0) return text;
  } catch (e) {
    console.log('Ошибка fetch:', e);
  }
  // Фолбэк: встроенные данные
  console.log('Используем встроенные данные');
  return getBuiltInScheduleData();
}

// Минимальный бэкап встроенных данных (заголовки и несколько строк), синхронизирован с index.html
function getBuiltInScheduleData() {
  return `семестр;Фак-т;Курс;Ф.обуч;Примеч.;Группа:;Дисциплина;каф.;Преподаватель;№ груп.;кол-во человек;Вид занятия;аудитория;Корпус;Дата;Дата(конец диапазона);День;Нач.з.час;Нач.з.мин;Кон.з.час;Кон.з.мин;Сессия;Месяц;Время диапазон;1
осенний;Переработки минерального сырья;4;очная;;ОП-22;I Моделирование процессов обогащения;25;Асс. Кузнецов В.В.;;19;практика;3308;Уч.ц.1;2.9;9.12;вт;10;.35;12;.05;;;;
осенний;Переработки минерального сырья;6;очная;;ОП-20;Технология отходов;25;Доц. Афанасова А.В.;;22;лекция;6203;Уч.ц.1;1.9;31.10;пн;8;.50;10;.20;;;;
осенний;Переработки минерального сырья;5;очная;;ОП-21;Гравитационные методы обогащения;25;Доц. Афанасова А.В.;;22;лекция;6203;Уч.ц.1;4.9;11.12;чт;14;.15;15;.45;;;;
осенний;Переработки минерального сырья;5;очная;;ОП-21;II Гравитационные методы обогащения;25;Доц. Афанасова А.В.;;22;практика;6203;Уч.ц.1;12.9;5.12;пт;10;.35;12;.05;;;;`;
}

// Возвращает массив: { discipline, lecturer, practitioners[] }
function buildPlans(csvText) {
  if (!csvText) return [];
  // Нормализуем переносы строк (CRLF/LF) и удалим кавычки в заголовках
  const lines = csvText.replace(/\r\n?/g, '\n').split('\n');
  const plansMap = new Map(); // key: нормализованная дисциплина без префикса I/II

  // Очищаем предыдущие сырые данные
  rawScheduleData = [];

  // Некоторые файлы содержат 4 служебные строки в начале — пропустим первые 4,
  // но если данных мало, начнём с 0
  const startIdx = Math.min(4, Math.max(0, lines.length - 1));
  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = line.split(';');
    if (cols.length < 15) continue; // минимально достаточное кол-во полей

    // Сохраняем сырые данные для детального просмотра
    rawScheduleData.push(cols);

    let discipline = cols[6] ? cols[6].trim() : '';
    if (!discipline) continue;
    const teacher = (cols[8] || '').trim();
    const lessonType = (cols[11] || '').trim().toLowerCase();

    // Уберём префикс I/II из названия дисциплины
    const low = discipline.toLowerCase();
    if (low.startsWith('i ') || low.startsWith('ii ')) {
      discipline = discipline.substring(discipline.indexOf(' ') + 1).trim();
    }

    if (!plansMap.has(discipline)) {
      plansMap.set(discipline, { discipline, lecturer: '', practitioners: new Set() });
    }
    const rec = plansMap.get(discipline);

    if (lessonType.includes('лекц')) {
      // Считаем этого преподавателя лектором
      rec.lecturer = teacher;
    } else {
      // Практики/семинары/лабы попадут сюда
      if (teacher) rec.practitioners.add(teacher);
    }
  }

  // Преобразуем в массив и отсортируем по названию дисциплины
  return Array.from(plansMap.values()).map(r => ({
    discipline: r.discipline,
    lecturer: r.lecturer,
    practitioners: Array.from(r.practitioners)
  })).sort((a, b) => a.discipline.localeCompare(b.discipline, 'ru'));
}

function extractTeachers(plans) {
  const teacherSet = new Set();
  plans.forEach(plan => {
    if (plan.lecturer) teacherSet.add(plan.lecturer);
    plan.practitioners.forEach(p => teacherSet.add(p));
  });
  return Array.from(teacherSet).sort();
}

function populateTeacherFilter() {
  const select = document.getElementById('teacherFilter');
  if (!select) return;
  
  // Очищаем опции кроме первой
  while (select.children.length > 1) {
    select.removeChild(select.lastChild);
  }
  
  teachers.forEach(teacher => {
    const option = document.createElement('option');
    option.value = teacher;
    option.textContent = teacher;
    select.appendChild(option);
  });
}

function renderPlans(list) {
  const tbody = document.querySelector('#plansTable tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (!list.length) {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td colspan="3">Данные отсутствуют</td>';
    tbody.appendChild(tr);
    return;
  }

  list.forEach(item => {
    const tr = document.createElement('tr');
    const practitioners = item.practitioners.length ? item.practitioners.join(', ') : '—';
    tr.innerHTML = `
      <td><span class="clickable-discipline" onclick="showDisciplineDetails('${item.discipline.replace(/'/g, "\\'")}')">${escapeHtml(item.discipline)}</span></td>
      <td>${escapeHtml(item.lecturer || '—')}</td>
      <td>${escapeHtml(practitioners)}</td>
    `;
    tbody.appendChild(tr);
  });
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
}

// Глобальные переменные для работы с данными
let rawScheduleData = [];

// Функция для показа детальной информации о дисциплине
function showDisciplineDetails(disciplineName) {
  const modal = document.getElementById('disciplineModal');
  const title = document.getElementById('modalDisciplineTitle');
  const content = document.getElementById('modalContent');
  
  title.textContent = disciplineName;
  
  // Получаем все занятия по этой дисциплине
  const disciplineLessons = getDisciplineLessons(disciplineName);
  
  if (!disciplineLessons.length) {
    content.innerHTML = '<p>Нет данных о занятиях по данной дисциплине.</p>';
    modal.style.display = 'block';
    return;
  }
  
  // Группируем занятия по типам
  const lectures = disciplineLessons.filter(lesson => lesson.type.includes('лекц'));
  const practices = disciplineLessons.filter(lesson => !lesson.type.includes('лекц'));
  
  let html = '';
  
  // Лекции
  if (lectures.length > 0) {
    html += '<div class="discipline-type-header">Лекции</div>';
    html += createLessonsTable(lectures, 'Лекция');
  }
  
  // Практические занятия
  if (practices.length > 0) {
    html += '<div class="discipline-type-header">Практические занятия</div>';
    html += createLessonsTable(practices, 'Практическое занятие');
  }
  
  content.innerHTML = html;
  modal.style.display = 'block';
}

// Функция для получения всех занятий по дисциплине
function getDisciplineLessons(disciplineName) {
  if (!rawScheduleData.length) return [];
  
  return rawScheduleData.filter(row => {
    let discipline = row[6] ? row[6].trim() : '';
    if (!discipline) return false;
    
    // Убираем префикс I/II из названия дисциплины для сравнения
    const low = discipline.toLowerCase();
    if (low.startsWith('i ') || low.startsWith('ii ')) {
      discipline = discipline.substring(discipline.indexOf(' ') + 1).trim();
    }
    
    return discipline === disciplineName;
  }).map(row => ({
    date: row[14] ? row[14].trim() : '',
    type: row[11] ? row[11].trim() : '',
    teacher: row[8] ? row[8].trim() : ''
  })).sort((a, b) => {
    // Сортируем по дате
    const dateA = a.date.split('.');
    const dateB = b.date.split('.');
    if (dateA.length === 2 && dateB.length === 2) {
      const monthA = parseInt(dateA[1]);
      const dayA = parseInt(dateA[0]);
      const monthB = parseInt(dateB[1]);
      const dayB = parseInt(dateB[0]);
      
      if (monthA !== monthB) return monthA - monthB;
      return dayA - dayB;
    }
    return 0;
  });
}

// Функция для создания таблицы занятий
function createLessonsTable(lessons, prefix) {
  if (!lessons.length) return '';
  
  let html = `
    <table class="discipline-details-table">
      <thead>
        <tr>
          <th>№ п/п</th>
          <th>Дата</th>
          <th>Тема занятия</th>
          <th>Кол-во часов</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  lessons.forEach((lesson, index) => {
    const formattedDate = formatLessonDate(lesson.date);
    html += `
      <tr>
        <td>${index + 1}</td>
        <td>${formattedDate}</td>
        <td>${prefix} ${index + 1}</td>
        <td>2</td>
      </tr>
    `;
  });
  
  // Итого
  html += `
      <tr class="discipline-total">
        <td colspan="3">Итого часов</td>
        <td>${lessons.length * 2}</td>
      </tr>
    </tbody>
  </table>
  `;
  
  return html;
}

// Функция для форматирования даты занятия
function formatLessonDate(dateStr) {
  if (!dateStr) return '-';
  
  // Парсим дату в формате "д.м" (например, "2.9")
  const parts = dateStr.split('.');
  if (parts.length !== 2) return dateStr;
  
  const day = parseInt(parts[0]);
  const month = parseInt(parts[1]);
  
  if (isNaN(day) || isNaN(month)) return dateStr;
  
  // Создаем дату (предполагаем текущий год)
  const currentYear = new Date().getFullYear();
  const date = new Date(currentYear, month - 1, day);
  
  // Проверяем, что дата валидна
  if (isNaN(date.getTime())) return dateStr;
  
  // Форматируем дату
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

// Функция для закрытия модального окна
function closeDisciplineModal() {
  const modal = document.getElementById('disciplineModal');
  modal.style.display = 'none';
}

// Обработчик клика вне модального окна
document.addEventListener('click', function(event) {
  const modal = document.getElementById('disciplineModal');
  if (event.target === modal) {
    closeDisciplineModal();
  }
});


