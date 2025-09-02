@echo off
echo Обновление файлов на GitHub (ветка main)...
echo.

echo 1. Переключение на ветку main...
git checkout main 2>nul || git checkout -b main

echo.
echo 2. Добавление изменений...
git add .

echo.
echo 3. Создание коммита...
set /p commit_msg="Введите описание изменений: "
git commit -m "%commit_msg%"

echo.
echo 4. Загрузка на GitHub...
git push -u origin main

echo.
echo Готово! Файлы обновлены в ветке main на GitHub.
pause
