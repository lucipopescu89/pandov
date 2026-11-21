@echo off
title Pandov - original si dark, unul langa altul
cd /d "%~dp0"
rem TEST (2026-11-20): deschide site-ul in doua taburi ca sa compari.
rem   http://localhost:3000  = site-ul asa cum e
rem   http://127.0.0.1:3000  = varianta de test pe #202020
rem Daca site-ul nu e pornit, il porneste (porneste-site.bat) si asteapta.
curl -s -o nul http://localhost:3000 || (echo Pornesc site-ul... & start "Pandov - localhost:3000" "%~dp0porneste-site.bat")
:astept
curl -s -o nul http://localhost:3000 || (timeout /t 2 >NUL & goto astept)
start "" http://localhost:3000
start "" http://127.0.0.1:3000
