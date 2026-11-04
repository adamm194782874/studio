@echo off
rem Double click to start Homebase. The first run takes a few minutes to set up.
cd /d "%~dp0"

if not exist settings.env (
  echo.
  echo  settings.env is missing. Copy example.env to settings.env and fill it in first.
  echo.
  pause
  exit /b 1
)

if not exist .venv\Scripts\python.exe (
  echo Setting up Homebase for the first time...
  py -3 -m venv .venv 2>nul || python -m venv .venv
  if not exist .venv\Scripts\python.exe (
    echo.
    echo  Could not find Python. Install Python 3.12 from python.org
    echo  and tick "Add python.exe to PATH" during install.
    echo.
    pause
    exit /b 1
  )
)

.venv\Scripts\python -m pip install -q --disable-pip-version-check -r requirements.txt
.venv\Scripts\python run.py
pause
