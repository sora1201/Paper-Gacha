@echo off
setlocal

set "APP_ROOT=%~dp0"
set "VENV_PATH=%APP_ROOT%.venv"

if not exist "%VENV_PATH%\Scripts\python.exe" (
  py -3.13 -m venv "%VENV_PATH%"
  if errorlevel 1 (
    echo Python 3.13 64-bit is required. Install it from https://www.python.org/downloads/
    exit /b 1
  )
)

"%VENV_PATH%\Scripts\python.exe" -m pip install -r "%APP_ROOT%requirements.txt"
if errorlevel 1 exit /b 1

"%VENV_PATH%\Scripts\python.exe" "%APP_ROOT%desktop_app.py"
