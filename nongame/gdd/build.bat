@echo off
setlocal
cd /d "%~dp0"
node "%~dp0build\build.js"
if errorlevel 1 (
  echo Build falhou.
  exit /b 1
)
echo.
echo Abrindo GDD.html...
start "" "%~dp0GDD.html"
