@echo off
title Pandov - localhost:3000
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js nu e instalat. Instaleaza-l de pe https://nodejs.org si incearca din nou. & pause & exit /b)
set PNPM=pnpm
where pnpm >nul 2>nul || set PNPM=npx -y pnpm@10
if not exist node_modules (echo Instalez pachetele... & call %PNPM% install)
echo Pornesc site-ul pe http://localhost:3000 ...
call %PNPM% dev
pause
