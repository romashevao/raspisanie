// Загружает OP.csv и строит таблицу дисциплин с лектором и руководителями практик
(async function initPlans() {
  try {
    const csvText = await fetchCsv();
    const list = buildPlans(csvText);
    renderPlans(list);
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
    return await res.text();
  } catch (_) {
    // Фолбэк: возьмём встроенные данные из index.html логики невозможно, поэтому отобразим пусто
    return '';
  }
}

// Возвращает массив: { discipline, lecturer, practitioners[] }
function buildPlans(csvText) {
  if (!csvText) return [];
  const lines = csvText.split('\n');
  const plansMap = new Map(); // key: нормализованная дисциплина без префикса I/II

  for (let i = 4; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = line.split(';');
    if (cols.length < 20) continue;

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


