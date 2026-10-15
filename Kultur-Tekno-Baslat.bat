@echo off
chcp 65001 >nul
title Kultur Tekno - Baslatici
cd /d "%~dp0"

echo ============================================
echo   KULTUR TEKNO baslatiliyor...
echo ============================================
echo.

REM API sunucusu (PostgreSQL + Express) - ayri pencerede
start "Kultur Tekno - API (4000)" cmd /k "cd /d "%~dp0server" ^&^& npm start"

REM Arayuz (React / Vite) - ayri pencerede
start "Kultur Tekno - Arayuz (5173)" cmd /k "cd /d "%~dp0client" ^&^& npm run dev"

echo Arayuzun hazir olmasi bekleniyor...
powershell -NoProfile -Command "for($i=0;$i -lt 40;$i++){try{Invoke-WebRequest -UseBasicParsing http://localhost:5173 -TimeoutSec 1 ^| Out-Null; exit 0}catch{Start-Sleep -Milliseconds 700}}"

start "" "http://localhost:5173/"

echo.
echo Tarayicida acildi: http://localhost:5173/
echo (Panel: http://localhost:5173/panel)
echo.
echo Sunucular ayri pencerelerde calisiyor. Durdurmak icin o pencerelerde Ctrl+C.
echo Bu pencere 4 saniye sonra kapanacak.
timeout /t 4 >nul
