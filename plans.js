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
    allPlans = buildPlans(csvText);
    teachers = extractTeachers(allPlans);
    
    console.log('Загружено планов:', allPlans.length);
    console.log('Найдено преподавателей:', teachers.length);
    console.log('Преподаватели:', teachers);
    
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
    const text = await res.text();
    if (text && text.trim().length > 0) return text;
  } catch (_) {
    // ignore
  }
  // Фолбэк: встроенные данные
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

  // Некоторые файлы содержат 4 служебные строки в начале — пропустим первые 4,
  // но если данных мало, начнём с 0
  const startIdx = Math.min(4, Math.max(0, lines.length - 1));
  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = line.split(';');
    if (cols.length < 15) continue; // минимально достаточное кол-во полей

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
  
  console.log('Заполняем фильтр преподавателей:', teachers);
  
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
  
  console.log('Добавлено опций:', select.children.length - 1);
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
      <td>${escapeHtml(item.discipline)}</td>
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


