@echo off
title Servidor Tablero TV
echo ===========================================
echo   Iniciando Tablero de Control para TV...
echo ===========================================
echo.

:: 1. Ir a la carpeta del proyecto
cd /d "%~dp0"

:: 2. Abrir la página apuntando directamente a tv.html
start http://localhost:3000/tv.html

:: 3. Ejecutar el servidor Node.js
node server.js