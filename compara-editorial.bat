@echo off
title Pandov - Making asa cum e si varianta editoriala, unul langa altul
cd /d "%~dp0"
rem TEST (2026-11-21): deschide pagina Making in doua taburi ca sa compari.
rem   http://localhost:3000/making  = pagina asa cum e
rem   http://127.0.0.1:3000/making  = varianta editoriala de test
rem Daca site-ul nu e pornit, il porneste (porneste-site.bat) si asteapta.
curl -s -o nul http://localhost:3000 || (echo Pornesc site-ul... & start "Pandov - localhost:3000" "%~dp0porneste-site.bat")
:astept
curl -s -o nul http://localhost:3000 || (timeout /t 2 >NUL & goto astept)
start "" http://localhost:3000/making
start "" http://127.0.0.1:3000/making
