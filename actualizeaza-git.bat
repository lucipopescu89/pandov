@echo off
title Pandov - actualizare Git
cd /d "%~dp0"
where git >nul 2>nul || (echo Git nu e instalat pe acest calculator. & pause & exit /b)
echo Iau ultima versiune de pe GitHub...
git fetch origin || (echo Nu am putut lua versiunea de pe GitHub. Verifica internetul. & pause & exit /b)
echo.
echo Pun istoria la zi. Fisierele site-ului NU se schimba.
git reset --mixed origin/main
echo.
echo Gata. Ce mai difera intre calculator si GitHub (daca e gol, totul e la zi):
git status --short
echo.
pause
