@echo off
title Sync Dashboard → Azure
color 0A
echo.
echo  ============================================
echo   SINCRONIZADOR DASHBOARD TV → AZURE
echo  ============================================
echo.
echo  Monitoreando Excel y enviando datos a Azure...
echo  Cierra esta ventana para detener la sincronizacion.
echo.
cd /d "%~dp0"
node sync-local.js
pause
