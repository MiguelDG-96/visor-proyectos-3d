@echo off
title Visor 3D Inmobiliario - Chavez Pata
echo ========================================================
echo   Iniciando Visor 3D - Lotizacion Chavez Pata
echo   Moyobamba, San Martin (WGS-84 / UTM Zona 18S)
echo ========================================================
echo.
start http://localhost:5174
node serve.js
pause

