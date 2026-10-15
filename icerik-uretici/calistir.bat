@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Egitici Yazi JSON Uretici
python uygulama.py
if errorlevel 1 (
  echo.
  echo Python bulunamadi veya hata olustu. Python 3 kurulu mu?
  pause
)
