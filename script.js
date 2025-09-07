// Глобальные переменные
let scheduleData = [];
let teachers = [];
let currentDate = new Date();
let selectedTeacher = '';
let selectedDate = new Date();
let isDatePickerOpening = false; // больше не используем задержки, оставлено для совместимости
let hiddenDatePicker = null; // будет ссылаться на #hiddenDatePicker из DOM
const STORAGE_KEYS = {
    teacher: 'raspisanie:selectedTeacher'
};

// Константы для времени занятий
const LESSON_TIMES = {
    8: { start: '08:50', end: '10:20', number: 1 },
    10: { start: '10:35', end: '12:05', number: 2 },
    12: { start: '12:35', end: '14:05', number: 3 },
    14: { start: '14:15', end: '15:45', number: 4 },
    15: { start: '15:55', end: '17:20', number: 5 },
    17: { start: '17:30', end: '19:00', number: 6 }
};

// Дни недели
const DAYS_OF_WEEK = {
    'пн': 1, 'вт': 2, 'ср': 3, 'чт': 4, 'пт': 5
};

const DAY_NAMES = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
const DAY_NAMES_SHORT = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

// Праздничные дни 2025 года (дни, когда занятий нет)
const HOLIDAYS_2025 = [
    '01.01.2025', // Новый год
    '02.01.2025', // Новый год
    '03.01.2025', // Новый год
    '04.01.2025', // Новый год
    '05.01.2025', // Новый год
    '06.01.2025', // Новый год
    '07.01.2025', // Новый год
    '08.01.2025', // Новый год
    '23.02.2025', // День защитника Отечества
    '08.03.2025', // Международный женский день
    '01.05.2025', // Праздник Весны и Труда
    '09.05.2025', // День Победы
    '12.06.2025', // День России
    '04.11.2025', // День народного единства
    '31.12.2025'  // Новый год (предпраздничный)
];

// Переносы выходных дней 2025 года (субботы, которые стали рабочими)
const WORKING_SATURDAYS_2025 = [
    '08.02.2025', // Суббота - рабочий день (перенос с 23.02)
    '10.05.2025', // Суббота - рабочий день (перенос с 09.05)
    '07.11.2025'  // Суббота - рабочий день (перенос с 04.11)
];

// Инициализация приложения
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    try {
        await loadScheduleData();
        populateTeacherSelect();
        restoreSavedTeacher();
        setupEventListeners();
        updateDateTime();
        setInterval(updateDateTime, 1000);
        
        // Устанавливаем начальную дату на текущую дату
        const today = new Date();
        selectedDate = today;
        currentDate = today;
        document.getElementById('dateInput').value = formatDateForInput(today);
        
        // Принудительно устанавливаем формат даты
        setupDateInputFormat();
        
        // Инициализируем тему
        initializeTheme();
        
        updateScheduleInfo();
    } catch (error) {
        console.error('Ошибка инициализации:', error);
        showError('Ошибка загрузки данных расписания');
    }
}

// Загрузка данных из CSV файла
async function loadScheduleData() {
    try {
        // Пытаемся загрузить CSV файл
        let csvText;
        try {
            const response = await fetch('OP.csv');
            csvText = await response.text();
        } catch (fetchError) {
            // Если не удалось загрузить через fetch, используем встроенные данные
            console.log('Используем встроенные данные расписания');
            csvText = getBuiltInScheduleData();
        }
        
        const lines = csvText.split('\n');
        
        // Пропускаем заголовки и пустые строки
        for (let i = 4; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const columns = line.split(';');
            if (columns.length < 20) continue;
            
            const record = {
                semester: columns[0],
                faculty: columns[1],
                course: columns[2],
                form: columns[3],
                note: columns[4],
                group: columns[5],
                discipline: columns[6],
                department: columns[7],
                teacher: columns[8],
                groupNumber: columns[9],
                studentsCount: columns[10],
                lessonType: columns[11],
                room: columns[12],
                building: columns[13],
                startDate: columns[14],
                endDate: columns[15],
                dayOfWeek: columns[16],
                startHour: columns[17],
                startMin: columns[18],
                endHour: columns[19],
                endMin: columns[20]
            };
            
            if (record.teacher && record.teacher.trim()) {
                scheduleData.push(record);
                
                // Добавляем преподавателя в список, если его еще нет
                if (!teachers.includes(record.teacher.trim())) {
                    teachers.push(record.teacher.trim());
                }
                

            }
        }
        
        teachers.sort();
        console.log(`Загружено ${scheduleData.length} записей расписания для ${teachers.length} преподавателей`);
    } catch (error) {
        console.error('Ошибка загрузки CSV:', error);
        throw error;
    }
}

// Встроенные данные расписания (из CSV файла)
function getBuiltInScheduleData() {
    return `семестр;Фак-т;Курс;Ф.обуч;Примеч.;Группа:;Дисциплина;каф.;Преподаватель;№ груп.;кол-во человек;Вид занятия;аудитория;Корпус;Дата;"Дата
(конец
диапазона)";День;Нач.з.час;Нач.з.мин;Кон.з.час;Кон.з.мин;Сессия;Месяц;"Время
диапазон";1;;                                                                                                             ;;;;;;;;;;;;;;;
осенний;Институт базового инженерного образования;2;очная;9;ОТ-24-28;Основы обогащения минерального сырья;25;Асп. Люблянова В.А.;2;;практика;831;Инж.корп.;2.9;9.12;вт;12;.35;14;.05;;;;ос;;;;;;;;;;;;;;;;;
осенний;Переработки минерального сырья;4;очная;;ОП-22;I Моделирование процессов обогащения;25;Асс. Кузнецов В.В.;;19;практика;3308;Уч.ц.1;2.9;9.12;вт;10;.35;12;.05;;;;ос;;;;;;;;;;;;;;;;;
осенний;Переработки минерального сырья;5;очная;;ОП-21;II Флотационные методы обогащения;25;Асс. Кузнецов В.В.;;22;практика;6203;Уч.ц.1;11.9;4.12;чт;15;.55;17;.20;;;;ос;;;;;;;;;;;;;;;;;
осенний;Переработки минерального сырья;6;очная;;ОП-20;Технология отходов;25;Доц. Афанасова А.В.;;22;лекция;6203;Уч.ц.1;1.9;31.10;пн;8;.50;10;.20;;;;ос;;;;;;;;;;;;;;;;;
осенний;Переработки минерального сырья;5;очная;;ОП-21;Комплексная переработка полезных ископаемых;25;Доц. Афанасова А.В.;;22;лекция;6203;Уч.ц.1;1.9;8.12;пн;10;.35;12;.05;;;;ос;;;;;;;;;;;;;;;;;
осенний;Переработки минерального сырья;6;очная;;ОП-20;Технология отходов;25;Доц. Афанасова А.В.;;22;практика;6203;Уч.ц.1;2.9;31.10;вт;8;.50;10;.20;;;;ос;;;;;;;;;;;;;;;;;
осенний;Переработки минерального сырья;3;очная;;ОП-23;I Тепломассообменные процессы в горно-металлургических производствах;25;Доц. Афанасова А.В.;;17;лекция;6204;Уч.ц.1;2.9;9.12;вт;10;.35;12;.05;;;;ос;;;;;;;;;;;;;;;;;
осенний;Переработки минерального сырья;6;очная;;ОП-20;Технология отходов;25;Доц. Афанасова А.В.;;22;практика;6204;Уч.ц.1;3.9;31.10;ср;8;.50;10;.20;;;;ос;;;;;;;;;;;;;;;;;
осенний;Переработки минерального сырья;4;очная;;ОП-22;Теплотехника;25;Доц. Афанасова А.В.;;19;лекция;6203;Уч.ц.1;3.9;10.12;ср;10;.35;12;.05;;;;ос;;;;;;;;;;;;;;;;;
осенний;Переработки минерального сырья;4;очная;;ОП-22;II Теплотехника;25;Доц. Афанасова А.В.;;19;практика;6307;Уч.ц.1;10.9;3.12;ср;12;.35;14;.05;;;;ос;;;;;;;;;;;;;;;;;
осенний;Переработки минерального сырья;6;очная;;ОП-20;Технология отходов;25;Доц. Афанасова А.В.;;22;лекция;6203;Уч.ц.1;4.9;31.10;чт;12;.35;14;.05;;;;ос;;;;;;;;;;;;;;;;;
осенний;Переработки минерального сырья;5;очная;;ОП-21;Гравитационные методы обогащения;25;Доц. Афанасова А.В.;;22;лекция;6203;Уч.ц.1;4.9;11.12;чт;14;.15;15;.45;;;;ос;;;;;;;;;;;;;;;;;
осенний;Переработки минерального сырья;5;очная;;ОП-21;I Комплексная переработка полезных ископаемых;25;Доц. Афанасова А.В.;;22;практика;6203;Уч.ц.1;4.9;11.12;чт;15;.55;17;.20;;;;ос;;;;;;;;;;;;;;;;;
осенний;Переработки минерального сырья;3;очная;;ОП-23;II Тепломассообменные процессы в горно-металлургических производствах;25;Доц. Афанасова А.В.;;17;практика;6307;Уч.ц.1;12.9;5.12;пт;8;.50;10;.20;;;;ос;;;;;;;;;;;;;;;;;
осенний;Переработки минерального сырья;5;очная;;ОП-21;I Технология отходов;25;Доц. Афанасова А.В.;;22;лекция;6203;Уч.ц.1;5.9;12.12;пт;10;.35;12;.05;;;;ос;;;;;;;;;;;;;;;;;
осенний;Переработки минерального сырья;5;очная;;ОП-21;II Гравитационные методы обогащения;25;Доц. Афанасова А.В.;;22;практика;6203;Уч.ц.1;12.9;5.12;пт;10;.35;12;.05;;;;ос;;;;;;;;;;;;;;;;;
осенний;Переработки минерального сырья;5;очная;;ОП-21;I Технология отходов;25;Доц. Афанасова А.В.;;22;практика;6307;Уч.ц.1;5.9;12.12;пт;12;.35;14;.05;;;;ос;;;;;;;;;;;;;;;;;
осенний;Переработки минерального сырья;4;очная;;ОП-22;Магнитные, электрические и специальные методы обогощения;25;Доц. Мезенин А.О.;;19;лекция;6203;Уч.ц.1;1.9;8.12;пн;15;.55;17;.20;;;;ос;;;;;;;;;;;;;;;;;
осенний;Переработки минерального сырья;4;очная;;ОП-22;Магнитные, электрические и специальные методы обогощения;25;Доц. Мезенин А.О.;;19;практика;6203;Уч.ц.1;1.9;8.12;пн;17;.30;19;.00;;;;ос;;;;;;;;;;;;;;;;;
осенний;Переработки минерального сырья;5;очная;;ОП-21;Теория разделения минералов;25;Асп. Гатиатуллин Б.Л.;2;;практика;6307;Уч.ц.1;1.9;8.12;пн;8;.50;10;.20;;;;ос;;;;;;;;;;;;;;;;;
осенний;Механико-машиностроительный;3;очная;;ГМ-23;Основы обогащения и переработки минерального сырья;25;Доц. Николаева Н.В.;;14;лекция;7302;Уч.ц.1;1.9;8.12;пн;10;.35;12;.05;;;;ос;;;;;;;;;;;;;;;;;
осенний;Горный;3;очная;;БТБ-23;Основы обогащения полезных ископаемых;25;Доц. Николаева Н.В.;;27;лекция;6216;Уч.ц.1;1.9;8.12;пн;14;.15;15;.45;;;;ос;;;;;;;;;;;;;;;;;
осенний;Переработки минерального сырья;5;очная;;ОП-21;Теория разделения минералов;25;Асп. Гатиатуллин Б.Л.;1;;практика;6307;Уч.ц.1;2.9;9.12;вт;8;.50;10;.20;;;;ос;;;;;;;;;;;;;;;;;
осенний;Переработки минерального сырья;6;очная;;ОП-20;Исследование руд на обогатимость;25;Доц. Николаева Н.В.;;22;лекция;6203;Уч.ц.1;2.9;31.10;вт;10;.35;12;.05;;;;ос;;;;;;;;;;;;;;;;;
осенний;Геологоразведочный;5;очная;;РМ-21;Основы технологии переработки руд;25;Доц. Николаева Н.В.;;21;лекция;6309;Уч.ц.1;3.9;10.12;ср;12;.35;14;.05;;;;ос;;;;;;;;;;;;;;;;;
осенний;Переработки минерального сырья;6;очная;;ОП-20;II Исследование руд на обогатимость;25;Доц. Николаева Н.В.;;22;лекция;6204;Уч.ц.1;11.9;23.10;чт;10;.35;12;.05;;;;ос;;;;;;;;;;;;;;;;;
осенний;Переработки минерального сырья;3;очная;;ОП-23;Дробление, измельчение и подготовка сырья к обогащению;25;Асп. Ильин Е.С.;;17;практика;6307;Уч.ц.1;4.9;11.12;чт;12;.35;14;.05;;;;ос;;;;;;;;;;;;;;;;;
осенний;Переработки минерального сырья;5;очная;;ОП-21;Теория разделения минералов;25;Доц. Николаева Н.В.;;22;лекция;6203;Уч.ц.1;5.9;12.12;пт;8;.50;10;.20;;;;ос;;;;;;;;;;;;;;;;;
осенний;Переработки минерального сырья;3;очная;;ОП-23;Дробление, измельчение и подготовка сырья к обогащению;25;Доц. Николаева Н.В.;;17;лекция;6203;Уч.ц.1;5.9;12.12;пт;12;.35;14;.05;;;;ос;;;;;;;;;;;;;;;;;
осенний;Переработки минерального сырья;6;очная;;ОП-20;I Проектирование обогатительных фабрик;25;Доц. Ромашев А.О.;1;;практика;6307;Уч.ц.1;1.9;27.10;пн;10;.35;12;.05;;;;ос;;;;;;;;;;;;;;;;;
осенний;Переработки минерального сырья;6;очная;;ОП-20;II Проектирование обогатительных фабрик;25;Доц. Ромашев А.О.;2;;практика;6307;Уч.ц.1;8.9;20.10;пн;10;.35;12;.05;;;;ос;;;;;;;;;;;;;;;;;
осенний;Переработки минерального сырья;6;очная;;ОП-20;I Проектирование обогатительных фабрик;25;Доц. Ромашев А.О.;1;;практика;6307;Уч.ц.1;1.9;27.10;пн;12;.35;14;.05;;;;ос;;;;;;;;;;;;;;;;;
осенний;Переработки минерального сырья;6;очная;;ОП-20;II Проектирование обогатительных фабрик;25;Доц. Ромашев А.О.;2;;практика;6307;Уч.ц.1;8.9;20.10;пн;12;.35;14;.05;;;;ос;;;;;;;;;;;;;;;;;
осенний;Переработки минерального сырья;6;очная;;ОП-20;Проектирование обогатительных фабрик;25;Доц. Ромашев А.О.;;22;практика;6307;Уч.ц.1;22.9;27.10;пн;10;.35;12;.05;;;;ос;;;;;;;;;;;;;;;;;
осенний;Переработки минерального сырья;6;очная;;ОП-20;Проектирование обогатительных фабрик;25;Доц. Ромашев А.О.;;22;практика;6307;Уч.ц.1;22.9;27.10;пн;12;.35;14;.05;;;;ос;;;;;;;;;;;;;;;;;
осенний;Институт базового инженерного образования;2;очная;9;ОТ-24-28;Основы обогащения минерального сырья;25;Доц. Ромашев А.О.;;24;лекция;823;Инж.корп.;2.9;9.12;вт;10;.35;12;.05;;;;ос;;;;;;;;;;;;;;;;;
осенний;Институт базового инженерного образования;2;очная;9;ОТ-24-28;Основы обогащения минерального сырья;25;Асп. Абурова В.А.;1;;практика;803;Инж.корп.;2.9;9.12;вт;12;.35;14;.05;;;;ос;;;;;;;;;;;;;;;;;
осенний;Переработки минерального сырья;4;очная;;ОП-22;Основы проектирования горных предприятий;25;Доц. Ромашев А.О.;;19;лекция;6203;Уч.ц.1;3.9;10.12;ср;8;.50;10;.20;;;;ос;;;;;;;;;;;;;;;;;
осенний;Переработки минерального сырья;6;очная;;ОП-20;Проектирование обогатительных фабрик;25;Доц. Ромашев А.О.;;22;лекция;6204;Уч.ц.1;3.9;31.10;ср;10;.35;12;.05;;;;ос;;;;;;;;;;;;;;;;;
осенний;Институт базового инженерного образования;1;очная;9;ТГЭ-25-1;Введение в специальность;25;Доц. Ромашев А.О.;;30;лекция;823;Инж.корп.;3.9;10.12;ср;14;.15;15;.45;;;;ос;;;;;;;;;;;;;;;;;
осенний;Переработки минерального сырья;4;очная;;ОП-22;Моделирование процессов обогащения;25;Доц. Ромашев А.О.;;19;лекция;6203;Уч.ц.1;4.9;11.12;чт;10;.35;12;.05;;;;ос;;;;;;;;;;;;;;;;;
осенний;Переработки минерального сырья;6;очная;;ОП-20;I Проектирование обогатительных фабрик;25;Доц. Ромашев А.О.;2;;практика;6307;Уч.ц.1;4.9;31.10;чт;14;.15;15;.45;;;;ос;;;;;;;;;;;;;;;;;
осенний;Переработки минерального сырья;6;очная;;ОП-20;II Проектирование обогатительных фабрик;25;Доц. Ромашев А.О.;1;;практика;6307;Уч.ц.1;11.9;23.10;чт;14;.15;15;.45;;;;ос;;;;;;;;;;;;;;;;;
осенний;Переработки минерального сырья;6;очная;;ОП-20;Проектирование обогатительных фабрик;25;Доц. Ромашев А.О.;;22;лекция;6204;Уч.ц.1;5.9;31.10;пт;8;.50;10;.20;;;;ос;;;;;;;;;;;;;;;;;
осенний;Переработки минерального сырья;6;очная;;ОП-20;I Проектирование обогатительных фабрик;25;Доц. Ромашев А.О.;2;;практика;6307;Уч.ц.1;5.9;31.10;пт;10;.35;12;.05;;;;ос;;;;;;;;;;;;;;;;;
осенний;Переработки минерального сырья;6;очная;;ОП-20;II Проектирование обогатительных фабрик;25;Доц. Ромашев А.О.;1;;практика;6307;Уч.ц.1;12.9;31.10;пт;10;.35;12;.05;;;;ос;;;;;;;;;;;;;;;;;
осенний;Переработки минерального сырья;5;очная;;ОП-21;Флотационные методы обогащения;25;Проф. Александрова Т.Н.;;22;лекция;6203;Уч.ц.1;2.9;9.12;вт;12;.35;14;.05;;;;ос;;;;;;;;;;;;;;;;;`;
}

// Заполнение селекта преподавателей
function populateTeacherSelect() {
    const select = document.getElementById('teacherSelect');
    select.innerHTML = '<option value="">Выберите преподавателя</option>';
    
    teachers.forEach(teacher => {
        const option = document.createElement('option');
        option.value = teacher;
        option.textContent = teacher;
        select.appendChild(option);
    });
}

// Восстановление сохранённого преподавателя
function restoreSavedTeacher() {
    const saved = localStorage.getItem(STORAGE_KEYS.teacher);
    if (!saved) return;
    if (!teachers.includes(saved)) return; // если список обновился и такого нет
    const select = document.getElementById('teacherSelect');
    if (!select) return;
    select.value = saved;
    selectedTeacher = saved;
}

// Настройка обработчиков событий
function setupEventListeners() {
    document.getElementById('teacherSelect').addEventListener('change', function() {
        selectedTeacher = this.value;
        try { localStorage.setItem(STORAGE_KEYS.teacher, selectedTeacher || ''); } catch (_) {}
        updateScheduleInfo();
        updateSchedule();
    });
    
    document.getElementById('dateInput').addEventListener('change', function() {
        if (this.value && this.value.length === 10) {
            const date = parseDateFromInput(this.value);
            if (date && !isNaN(date.getTime())) {
                selectedDate = date;
                updateScheduleInfo();
                updateSchedule();
            }
        }
    });
    
    // Обработчик для обновления расписания при вводе даты уже добавлен в setupDateInputFormat
    
    document.getElementById('todayBtn').addEventListener('click', function() {
        selectedDate = new Date();
        document.getElementById('dateInput').value = formatDateForInput(selectedDate);
        updateScheduleInfo();
        updateSchedule();
    });
    
    document.getElementById('tomorrowBtn').addEventListener('click', function() {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        selectedDate = tomorrow;
        document.getElementById('dateInput').value = formatDateForInput(selectedDate);
        updateScheduleInfo();
        updateSchedule();
    });
    
    document.getElementById('weekBtn').addEventListener('click', function() {
        toggleWeekSchedule();
    });
    
    document.getElementById('datePickerBtn').addEventListener('click', function() {
        showDatePicker();
    });
    
    document.getElementById('themeToggle').addEventListener('click', function() {
        toggleTheme();
    });

    // Переход на страницу планов
    const plansBtn = document.getElementById('plansBtn');
    if (plansBtn) {
        plansBtn.addEventListener('click', function() {
            window.location.href = 'plans.html';
        });
    }
}

// Обновление информации о дате и времени
function updateDateTime() {
    const now = new Date();
    const currentDateTimeElement = document.getElementById('currentDateTime');
    
    if (currentDateTimeElement) {
        currentDateTimeElement.textContent = `${formatDate(now)} ${formatTime(now)}`;
    }
}

// Обновление информации о расписании
function updateScheduleInfo() {
    const teacherName = document.getElementById('teacherName');
    const selectedDateElement = document.getElementById('selectedDate');
    const dayOfWeek = document.getElementById('dayOfWeek');
    const weekIndex = document.getElementById('weekIndex');
    
    if (teacherName) {
        teacherName.textContent = selectedTeacher || 'Выберите преподавателя';
    }
    
    if (selectedDateElement) {
        selectedDateElement.textContent = formatDate(selectedDate);
    }
    
    if (dayOfWeek) {
        dayOfWeek.textContent = DAY_NAMES[selectedDate.getDay()];
    }
    
    if (weekIndex) {
        const weekNum = getWeekNumber(selectedDate);
        weekIndex.textContent = `${weekNum} неделя`;
    }
}

// Проверка, является ли день праздничным
function isHoliday(date) {
    const dateStr = formatDateForInput(date);
    return HOLIDAYS_2025.includes(dateStr);
}

// Проверка, является ли день рабочим (включая рабочие субботы)
function isWorkingDay(date) {
    const dayOfWeek = date.getDay();
    
    // Воскресенье всегда выходной
    if (dayOfWeek === 0) return false;
    
    // Суббота - проверяем, не является ли она рабочим днем
    if (dayOfWeek === 6) {
        const dateStr = formatDateForInput(date);
        return WORKING_SATURDAYS_2025.includes(dateStr);
    }
    
    // Понедельник-пятница - проверяем, не является ли праздничным днем
    return !isHoliday(date);
}

// Получение номера недели (I, II, III, ...)
function getWeekNumber(date) {
    const startDate = new Date(2025, 8, 1); // 1 сентября 2025
    const diffTime = date - startDate;
    const diffWeeks = Math.floor(diffTime / (7 * 24 * 60 * 60 * 1000));
    
    if (diffWeeks < 0) return 'I';
    
    // Недели чередуются I-II-I-II и т.д.
    return (diffWeeks % 2 === 0) ? 'I' : 'II';
}

// Обновление расписания
function updateSchedule() {
    if (!selectedTeacher) {
        clearSchedule();
        // Скрываем недельное расписание если нет выбранного преподавателя
        const weekSchedule = document.getElementById('weekSchedule');
        if (weekSchedule && weekSchedule.style.display !== 'none') {
            weekSchedule.style.display = 'none';
            const weekBtn = document.getElementById('weekBtn');
            if (weekBtn) {
                weekBtn.innerHTML = '<i class="fas fa-calendar-week"></i> Неделя';
            }
        }
        return;
    }
    
    // Проверяем, является ли выбранная дата рабочим днем
    if (!isWorkingDay(selectedDate)) {
        clearSchedule();
        showHolidayMessage();
        return;
    }
    
    const dayOfWeek = DAYS_OF_WEEK[getDayOfWeekAbbr(selectedDate)];
    if (!dayOfWeek) {
        clearSchedule();
        return;
    }
    
    const weekNumber = getWeekNumber(selectedDate);
    const todayLessons = getLessonsForDay(selectedTeacher, dayOfWeek, weekNumber);
    
    displaySchedule(todayLessons);
    highlightCurrentLesson();
    
    // Обновляем недельное расписание если оно открыто
    const weekSchedule = document.getElementById('weekSchedule');
    if (weekSchedule && weekSchedule.style.display !== 'none') {
        showWeekSchedule();
    }
}

// Проверка, должно ли занятие отображаться в указанную дату
function isLessonActiveOnDate(record, date) {
    // Парсим дату окончания из записи
    const endDateStr = record.endDate;
    if (!endDateStr) return true;
    
    // Парсим дату в формате "дд.мм"
    const [day, month] = endDateStr.split('.');
    if (!day || !month) return true;
    
    // Создаем дату окончания для текущего года
    const endDate = new Date(2025, parseInt(month) - 1, parseInt(day));
    
    // Для группы ОП-20 занятия заканчиваются 31.10
    if (record.group === 'ОП-20') {
        return date <= endDate;
    }
    
    // Для остальных групп занятия заканчиваются 12.12
    return date <= endDate;
}

// Проверка, должно ли занятие отображаться с указанной даты
function isLessonStartedOnDate(record, date) {
    // Парсим дату начала из записи
    const startDateStr = record.startDate;
    if (!startDateStr) return true;
    
    // Парсим дату в формате "дд.мм"
    const [day, month] = startDateStr.split('.');
    if (!day || !month) return true;
    
    // Создаем дату начала для текущего года
    const startDate = new Date(2025, parseInt(month) - 1, parseInt(day));
    
    return date >= startDate;
}

// Получение занятий на день
function getLessonsForDay(teacher, dayOfWeek, weekNumber, date = selectedDate) {
    // Проверяем, является ли день рабочим
    if (!isWorkingDay(date)) {
        return [];
    }
    
    return scheduleData.filter(record => {
        if (record.teacher !== teacher) return false;
        if (DAYS_OF_WEEK[record.dayOfWeek.toLowerCase()] !== dayOfWeek) return false;
        
        // Проверяем дату начала занятий
        if (!isLessonStartedOnDate(record, date)) return false;
        
        // Проверяем дату окончания занятий
        if (!isLessonActiveOnDate(record, date)) return false;
        
        // Проверяем неделю
        const discipline = record.discipline.toLowerCase();
        if (discipline.startsWith('i ') && weekNumber !== 'I') return false;
        if (discipline.startsWith('ii ') && weekNumber !== 'II') return false;
        // Если нет префикса I или II, занятие проводится каждую неделю
        
        return true;
    });
}

// Отображение расписания
function displaySchedule(lessons) {
    // Очищаем все ячейки
    clearSchedule();
    
    lessons.forEach(lesson => {
        const startHour = parseInt(lesson.startHour);
        const lessonTime = LESSON_TIMES[startHour];
        
        if (lessonTime) {
            const lessonCell = document.querySelector(`[data-lesson="${lessonTime.number}"]`);
            if (lessonCell) {
                const content = lessonCell.querySelector('.lesson-content');
                
                // Название предмета (убираем префикс недели)
                let subject = lesson.discipline;
                if (subject.toLowerCase().startsWith('i ') || 
                    subject.toLowerCase().startsWith('ii ')) {
                    subject = subject.substring(subject.indexOf(' ') + 1);
                }
                
                content.querySelector('.lesson-subject').textContent = subject;
                
                // Вид занятия и детали на одной строке с разными цветами
                let typeAndDetails = lesson.lessonType;
                let details = lesson.group;
                if (lesson.groupNumber && lesson.groupNumber.trim()) {
                    details += `, подгр. ${lesson.groupNumber}`;
                }
                details += `, ${lesson.room}, ${lesson.building}`;
                
                content.querySelector('.lesson-type').innerHTML = 
                    `<span class="lesson-type-name">${typeAndDetails}</span> • <span class="lesson-details-text">${details}</span>`;
                content.querySelector('.lesson-details').textContent = '';
            }
        }
    });
}

// Очистка расписания
function clearSchedule() {
    const lessonCells = document.querySelectorAll('.lesson-cell');
    lessonCells.forEach(cell => {
        const content = cell.querySelector('.lesson-content');
        content.querySelector('.lesson-subject').textContent = '—';
        content.querySelector('.lesson-type').textContent = '';
        content.querySelector('.lesson-details').textContent = '';
        cell.classList.remove('current', 'next', 'holiday-cell');
    });
}

// Показать сообщение о выходном дне
function showHolidayMessage() {
    const lessonCells = document.querySelectorAll('.lesson-cell');
    lessonCells.forEach(cell => {
        const content = cell.querySelector('.lesson-content');
        content.querySelector('.lesson-subject').textContent = 'Выходной день';
        content.querySelector('.lesson-type').textContent = 'Занятий нет';
        content.querySelector('.lesson-details').textContent = '';
        cell.classList.remove('current', 'next');
        cell.classList.add('holiday-cell');
    });
}

// Подсветка текущего занятия
function highlightCurrentLesson() {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    // Убираем предыдущие подсветки
    document.querySelectorAll('.lesson-cell').forEach(cell => {
        cell.classList.remove('current', 'next');
    });
    
    // Если выбранная дата не сегодня, не подсвечиваем
    if (!isSameDay(now, selectedDate)) {
        return;
    }
    
    let currentLesson = null;
    let nextLesson = null;
    
    // Находим текущее и следующее занятие
    Object.values(LESSON_TIMES).forEach(lessonTime => {
        const startTime = timeToMinutes(lessonTime.start);
        const endTime = timeToMinutes(lessonTime.end);
        
        if (currentTime >= startTime && currentTime <= endTime) {
            currentLesson = lessonTime.number;
        } else if (currentTime < startTime && !nextLesson) {
            nextLesson = lessonTime.number;
        }
    });
    
    // Подсвечиваем текущее занятие
    if (currentLesson) {
        const cell = document.querySelector(`[data-lesson="${currentLesson}"]`);
        if (cell && cell.querySelector('.lesson-subject').textContent !== '—') {
            cell.classList.add('current');
        }
    }
    // Если нет текущего занятия, подсвечиваем следующее
    else if (nextLesson) {
        const cell = document.querySelector(`[data-lesson="${nextLesson}"]`);
        if (cell && cell.querySelector('.lesson-subject').textContent !== '—') {
            cell.classList.add('next');
        }
    }
}

// Переключение отображения недельного расписания
function toggleWeekSchedule() {
    const weekSchedule = document.getElementById('weekSchedule');
    const weekBtn = document.getElementById('weekBtn');
    
    if (weekSchedule.style.display === 'none') {
        showWeekSchedule();
        weekBtn.innerHTML = '<i class="fas fa-calendar-day"></i> День';
    } else {
        weekSchedule.style.display = 'none';
        weekBtn.innerHTML = '<i class="fas fa-calendar-week"></i> Неделя';
    }
}

// Показать недельное расписание
function showWeekSchedule() {
    if (!selectedTeacher) {
        showError('Выберите преподавателя');
        return;
    }
    
    const weekSchedule = document.getElementById('weekSchedule');
    const weekDays = document.getElementById('weekDays');
    
    weekDays.innerHTML = '';
    
    // Получаем начало недели (понедельник)
    const startOfWeek = getStartOfWeek(selectedDate);
    
    // Создаем расписание для каждого дня недели
    for (let i = 0; i < 7; i++) { // Пн-Вс
        const dayDate = new Date(startOfWeek);
        dayDate.setDate(startOfWeek.getDate() + i);
        
        const dayOfWeek = i + 1;
        const weekNumber = getWeekNumber(dayDate);
        
        // Проверяем, является ли день рабочим
        if (isWorkingDay(dayDate)) {
            const dayLessons = getLessonsForDay(selectedTeacher, dayOfWeek, weekNumber, dayDate);
            const dayElement = createDayElement(dayDate, dayLessons);
            weekDays.appendChild(dayElement);
        } else {
            // Создаем элемент для выходного дня
            const dayElement = createHolidayDayElement(dayDate);
            weekDays.appendChild(dayElement);
        }
    }
    
    weekSchedule.style.display = 'block';
}

// Создание элемента дня для недельного расписания
function createDayElement(date, lessons) {
    const dayElement = document.createElement('div');
    dayElement.className = 'day-schedule';
    
    const dayHeader = document.createElement('div');
    dayHeader.className = 'day-header';
    dayHeader.innerHTML = `
        <div class="day-name">${DAY_NAMES[date.getDay()]}</div>
        <div class="day-date">${formatDate(date)}</div>
    `;
    
    const dayLessons = document.createElement('div');
    dayLessons.className = 'day-lessons';
    
    if (lessons.length === 0) {
        dayLessons.innerHTML = '<div class="empty-state">Нет занятий</div>';
    } else {
        lessons.forEach(lesson => {
            const startHour = parseInt(lesson.startHour);
            const lessonTime = LESSON_TIMES[startHour];
            
            if (lessonTime) {
                const lessonElement = document.createElement('div');
                lessonElement.className = 'day-lesson';
                
                let subject = lesson.discipline;
                if (subject.toLowerCase().startsWith('i ') || 
                    subject.toLowerCase().startsWith('ii ')) {
                    subject = subject.substring(subject.indexOf(' ') + 1);
                }
                
                let details = lesson.group;
                if (lesson.groupNumber && lesson.groupNumber.trim()) {
                    details += `, подгр. ${lesson.groupNumber}`;
                }
                details += `, ${lesson.room}, ${lesson.building}`;
                
                lessonElement.innerHTML = `
                    <div class="day-lesson-time">${lessonTime.start} - ${lessonTime.end}</div>
                    <div class="day-lesson-subject">${subject}</div>
                    <div class="day-lesson-details"><span class="lesson-type-name">${lesson.lessonType}</span> • <span class="lesson-details-text">${details}</span></div>
                `;
                
                dayLessons.appendChild(lessonElement);
            }
        });
    }
    
    dayElement.appendChild(dayHeader);
    dayElement.appendChild(dayLessons);
    
    return dayElement;
}

// Создание элемента выходного дня для недельного расписания
function createHolidayDayElement(date) {
    const dayElement = document.createElement('div');
    dayElement.className = 'day-schedule holiday-day';
    
    const dayHeader = document.createElement('div');
    dayHeader.className = 'day-header';
    dayHeader.innerHTML = `
        <div class="day-name">${DAY_NAMES[date.getDay()]}</div>
        <div class="day-date">${formatDate(date)}</div>
    `;
    
    const dayLessons = document.createElement('div');
    dayLessons.className = 'day-lessons';
    dayLessons.innerHTML = '<div class="empty-state holiday-message">Выходной день</div>';
    
    dayElement.appendChild(dayHeader);
    dayElement.appendChild(dayLessons);
    
    return dayElement;
}

// Вспомогательные функции
function getDayOfWeekAbbr(date) {
    const dayNames = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
    return dayNames[date.getDay()];
}

function getStartOfWeek(date) {
    const start = new Date(date);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Понедельник
    start.setDate(diff);
    return start;
}

function isSameDay(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
}

function timeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
}

function formatDate(date) {
    const day = date.getDate();
    const month = date.getMonth();
    const year = date.getFullYear();
    
    const monthNames = [
        'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
        'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
    ];
    
    return `${day} ${monthNames[month]} ${year}`;
}

function formatTime(date) {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
}

function formatDateForInput(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${day}.${month}.${year}`;
}

function showError(message) {
    alert(message);
}

// Парсинг даты из текстового поля (дд.мм.гггг)
function parseDateFromInput(dateString) {
    if (!dateString || dateString.length !== 10) return null;
    
    const parts = dateString.split('.');
    if (parts.length !== 3) return null;
    
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // Месяц в JS начинается с 0
    const year = parseInt(parts[2], 10);
    
    // Проверяем валидность даты
    if (day < 1 || day > 31 || month < 0 || month > 11 || year < 1900 || year > 2100) {
        return null;
    }
    
    const date = new Date(year, month, day);
    
    // Проверяем, что дата корректная (например, 31.02 не существует)
    if (date.getDate() !== day || date.getMonth() !== month || date.getFullYear() !== year) {
        return null;
    }
    
    return date;
}

// Настройка формата поля даты
function setupDateInputFormat() {
    const dateInput = document.getElementById('dateInput');
    
    // Добавляем обработчик для автоматического форматирования при вводе
    dateInput.addEventListener('input', function(e) {
        let value = this.value;
        let cursorPos = this.selectionStart;
        
        // Убираем все нецифровые символы
        let digitsOnly = value.replace(/\D/g, '');
        
        // Ограничиваем длину до 8 цифр (ддммгггг)
        if (digitsOnly.length > 8) {
            digitsOnly = digitsOnly.substring(0, 8);
        }
        
        // Форматируем дату
        let formattedValue = '';
        if (digitsOnly.length >= 2) {
            formattedValue = digitsOnly.substring(0, 2) + '.';
            if (digitsOnly.length >= 4) {
                formattedValue += digitsOnly.substring(2, 4) + '.';
                if (digitsOnly.length >= 8) {
                    formattedValue += digitsOnly.substring(4, 8);
                } else {
                    formattedValue += digitsOnly.substring(4);
                }
            } else {
                formattedValue += digitsOnly.substring(2);
            }
        } else {
            formattedValue = digitsOnly;
        }
        
        this.value = formattedValue;
        
        // Восстанавливаем позицию курсора
        if (cursorPos <= 2) {
            this.setSelectionRange(cursorPos, cursorPos);
        } else if (cursorPos <= 5) {
            this.setSelectionRange(cursorPos + 1, cursorPos + 1);
        } else {
            this.setSelectionRange(cursorPos + 2, cursorPos + 2);
        }
        
        // Обновляем расписание если дата полная
        if (formattedValue.length === 10) {
            const date = parseDateFromInput(formattedValue);
            if (date && !isNaN(date.getTime())) {
                selectedDate = date;
                updateScheduleInfo();
                updateSchedule();
            }
        }
    });
    
    // Добавляем обработчик для валидации при потере фокуса
    dateInput.addEventListener('blur', function() {
        if (this.value && this.value.length === 10) {
            const date = parseDateFromInput(this.value);
            if (date && !isNaN(date.getTime())) {
                this.value = formatDateForInput(date);
            } else {
                // Если дата неверная, показываем ошибку
                this.style.borderColor = '#ef4444';
                setTimeout(() => {
                    this.style.borderColor = '#e1e5e9';
                }, 2000);
            }
        }
    });
    
    // Добавляем обработчик для сброса стиля при фокусе
    dateInput.addEventListener('focus', function() {
        this.style.borderColor = '#e1e5e9';
    });
    
    // Разрешаем вставку и другие операции
    dateInput.addEventListener('paste', function(e) {
        e.preventDefault();
        let pastedText = (e.clipboardData || window.clipboardData).getData('text');
        let digitsOnly = pastedText.replace(/\D/g, '');
        if (digitsOnly.length <= 8) {
            this.value = digitsOnly;
            this.dispatchEvent(new Event('input'));
        }
    });
}

// Показать календарь для выбора даты
function showDatePicker() {
    const field = document.getElementById('dateInput');
    hiddenDatePicker = document.getElementById('hiddenDatePicker');
    if (!field || !hiddenDatePicker) return;

    // Установим текущее значение в скрытый date-пикер
    let dateForPicker = selectedDate;
    if (!dateForPicker && field.value && field.value.length === 10) {
        const parsed = parseDateFromInput(field.value);
        if (parsed) dateForPicker = parsed;
    }
    const base = dateForPicker || new Date();
    const yyyy = base.getFullYear();
    const mm = (base.getMonth() + 1).toString().padStart(2, '0');
    const dd = base.getDate().toString().padStart(2, '0');
    hiddenDatePicker.value = `${yyyy}-${mm}-${dd}`;

    // Навесим обработчик разово
    const handler = () => {
        if (hiddenDatePicker.value) {
            const d = new Date(hiddenDatePicker.value);
            if (!isNaN(d.getTime())) {
                selectedDate = d;
                field.value = formatDateForInput(d);
            updateScheduleInfo();
            updateSchedule();
        }
        }
    };
    hiddenDatePicker.addEventListener('change', handler, { once: true });

    // Фокусируем для WebKit/Edge
    try { hiddenDatePicker.focus({ preventScroll: true }); } catch (_) {}

    const tryOpen = () => {
        try {
            if (typeof hiddenDatePicker.showPicker === 'function') {
                hiddenDatePicker.showPicker();
                return true;
            }
        } catch (_) {}
        try { hiddenDatePicker.click(); return true; } catch (_) {}
        return false;
    };

    // Первая попытка
    if (!tryOpen()) {
        // Ретрай через микро-таймаут
        setTimeout(() => {
            if (!tryOpen()) {
                // Второй ретрай с установкой фокуса на кнопку
                const btn = document.getElementById('datePickerBtn');
                try { btn && btn.focus({ preventScroll: true }); } catch (_) {}
                setTimeout(() => { tryOpen(); }, 0);
        }
    }, 0);
    }
}

// Открытие календаря по Enter на текстовом поле
document.addEventListener('DOMContentLoaded', function() {
    const field = document.getElementById('dateInput');
    if (field) {
        field.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                showDatePicker();
            }
        });
    }
});

// Переключение темы
function toggleTheme() {
    const body = document.body;
    const themeToggle = document.getElementById('themeToggle');
    const icon = themeToggle.querySelector('i');
    
    const currentTheme = body.getAttribute('data-theme');
    
    if (currentTheme === 'dark') {
        body.removeAttribute('data-theme');
        icon.className = 'fas fa-moon';
        localStorage.setItem('theme', 'light');
    } else {
        body.setAttribute('data-theme', 'dark');
        icon.className = 'fas fa-sun';
        localStorage.setItem('theme', 'dark');
    }
}

// Инициализация темы при загрузке
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme');
    const themeToggle = document.getElementById('themeToggle');
    const icon = themeToggle.querySelector('i');
    
    if (savedTheme === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
        icon.className = 'fas fa-sun';
    } else {
        icon.className = 'fas fa-moon';
    }
}

// Удалены функции модалки файлов
