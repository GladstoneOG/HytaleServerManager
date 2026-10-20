@echo off
cd /d "%~dp0"
if exist "node_modules\electron\dist\electron.exe" (
    start "" "node_modules\electron\dist\electron.exe" . %*
    exit /b 0
)
start "" npx electron . %*
exit /b 0
