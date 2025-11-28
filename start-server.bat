@echo off
echo Starting server on http://localhost:3000
echo.
cd /d "%~dp0"
npx serve . -p 3000
pause



