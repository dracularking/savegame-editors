@echo off
setlocal

cd /d "%~dp0"
set "PY_CMD="

where python >nul 2>nul
if %errorlevel%==0 (
  set "PY_CMD=python"
) else (
  where py >nul 2>nul
  if %errorlevel%==0 set "PY_CMD=py"
)

if "%PY_CMD%"=="" (
  echo [ERROR] Python was not found in PATH.
  echo Install Python 3.10+ and try again.
  pause
  exit /b 1
)

echo [1/3] Install build dependencies...
%PY_CMD% -m pip install --upgrade pip
%PY_CMD% -m pip install pywebview pyinstaller

echo [2/3] Build EXE...
%PY_CMD% -m PyInstaller --noconfirm --clean --onefile --windowed --name BOTWSaveEditor ^
  --add-data "..\savegame-editor.js;." ^
  --add-data "..\savegame-editor.css;." ^
  --add-data "index.html;." ^
  --add-data "zelda-botw.css;." ^
  --add-data "favicon.png;." ^
  --add-data "thumb.jpg;." ^
  --add-data "assets;assets" ^
  --add-data "javascript;javascript" ^
  desktop_app.py

echo [3/3] Done.
echo Output: dist\BOTWSaveEditor.exe
pause
