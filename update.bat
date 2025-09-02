@echo off
echo Обновление файлов на GitHub...
echo.

echo 1. Проверка статуса...
git status

echo.
echo 2. Добавление изменений...
git add .

echo.
echo 3. Создание коммита...
set /p commit_msg="Введите описание изменений: "
git commit -m "%commit_msg%"

echo.
echo 4. Загрузка на GitHub...
git push

echo.
echo Готово! Файлы обновлены на GitHub.
pause
