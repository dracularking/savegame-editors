@echo off
setlocal

set "PROJECT_DIR=%~dp0"
for %%I in ("%PROJECT_DIR%..") do set "ROOT_DIR=%%~fI"
set "PORT=5500"
set "URL=http://127.0.0.1:%PORT%/zelda-botw/"
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
  echo Install Python and try again.
  pause
  exit /b 1
)

cd /d "%ROOT_DIR%"
start "" "%URL%"
echo Serving BOTW editor at %URL%
echo Root: %ROOT_DIR%
echo Press Ctrl+C to stop the server.

%PY_CMD% -m http.server %PORT%
