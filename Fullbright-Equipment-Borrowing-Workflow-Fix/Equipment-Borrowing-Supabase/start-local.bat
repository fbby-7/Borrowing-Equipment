@echo off
setlocal
cd /d "%~dp0"
echo Starting Fullbright College Equipment Borrowing System...
echo.
where py >nul 2>nul
if %errorlevel%==0 (
  start "" http://127.0.0.1:5500
  py -m http.server 5500
  goto :end
)
where python >nul 2>nul
if %errorlevel%==0 (
  start "" http://127.0.0.1:5500
  python -m http.server 5500
  goto :end
)
echo Python was not found.
echo Install Python from https://www.python.org/downloads/ or use VS Code Live Server.
echo In VS Code, right-click index.html and choose "Open with Live Server".
pause
:end
endlocal
