@echo off
setlocal
title Pandov - publica site-ul
cd /d "%~dp0"
where git >nul 2>nul || (echo Git nu e instalat pe acest calculator. & pause & exit /b)

rem Facut de Claude pe 2026-11-19. Se poate rula oricand, cand site-ul arata bine
rem pe calculator: urca pe GitHub tot ce s-a schimbat in folderul site-ului, iar
rem Vercel il publica de acolo.
rem  - Nu sterge niciodata fisiere de pe GitHub: doar adauga si actualizeaza.
rem  - Se opreste singur, fara sa schimbe nimic, daca pe GitHub sunt modificari
rem    facute in alta parte care nu sunt si pe acest calculator: un fisier pe care
rem    GitHub l-a schimbat, iar calculatorul il are inca in forma de dinainte.

rem Fisiere care stau pe calculator dar nu merg pe site: exporturile din Figma,
rem poza veche si copiile de siguranta facute de Claude in scripts.
if not exist ".git\info" mkdir ".git\info"
call :exclude "/public/images/home/Making.svg"
call :exclude "/public/images/home/Making - Mobile.svg"
call :exclude "/public/images/home/Selected.svg"
call :exclude "/public/images/home/old photo making.png"
call :exclude "/scripts/*.inainte*"

echo Verific ce e pe GitHub...
git fetch origin || (echo Nu am putut ajunge la GitHub. Verifica internetul. & pause & exit /b)

set "OLD="
for /f %%h in ('git rev-parse HEAD') do set "OLD=%%h"
set "BASE="
for /f %%h in ('git merge-base HEAD origin/main') do set "BASE=%%h"
if not defined BASE (
  echo Istoria de pe calculator nu se leaga de cea de pe GitHub, asa ca nu public nimic.
  echo Spune-i lui Claude.
  pause
  exit /b
)

echo Pregatesc fisierele...
git reset -q --mixed origin/main
git -c core.safecrlf=false add --ignore-removal -- . || (git reset -q --mixed %OLD% & echo Nu am putut pregati fisierele, nu public nimic. & pause & exit /b)

rem Ce s-a schimbat pe GitHub de la ultima publicare de pe acest calculator: daca
rem vreunul din fisierele acelea e pe calculator exact ca inainte, publicarea l-ar
rem intoarce la forma veche. Atunci nu public nimic si pun totul la loc.
set "MISSING="
for /f "delims=" %%f in ('git diff --name-only --no-renames %BASE% origin/main') do (
  git diff --cached --quiet origin/main -- "%%f" || (
    git diff --cached --quiet %BASE% -- "%%f" && (
      if not defined MISSING (
        echo.
        echo Pe GitHub sunt modificari facute in alta parte, care nu sunt pe acest calculator:
      )
      set "MISSING=1"
      echo    %%f
    )
  )
)
if defined MISSING (
  git reset -q --mixed %OLD%
  echo.
  echo Ca sa nu le sterg, nu public nimic. Spune-i lui Claude.
  echo.
  pause
  exit /b
)

git diff --cached --quiet && (echo. & echo Nu e nimic nou de publicat: site-ul de pe web e deja ca cel de pe calculator. & echo. & pause & exit /b)

echo.
echo Gata de publicat:
git diff --cached --shortstat
echo.
echo Apasa orice tasta ca sa public, sau inchide fereastra ca sa renunti.
pause >nul

set "MSG=%TEMP%\pandov-publica.txt"
>"%MSG%" echo Pandov: site-ul actualizat %date% %time:~0,5%
git commit -q -F "%MSG%" || (echo Nu am putut pregati urcarea. & pause & exit /b)

echo Urc pe GitHub...
git push origin HEAD:main || (echo Urcarea nu a mers. Daca s-a deschis o fereastra de logare GitHub, logheaza-te si porneste din nou fisierul. & pause & exit /b)

echo.
echo Gata! Vercel publica site-ul in 1-2 minute.
echo.
pause
exit /b

:exclude
findstr /x /l /c:"%~1" ".git\info\exclude" >nul 2>nul || >>".git\info\exclude" echo %~1
exit /b
