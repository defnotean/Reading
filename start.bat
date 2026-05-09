@echo off
REM Reading - quick launcher.
REM Double-click this file or run `start.bat` from a terminal to launch the app.
REM If the binary hasn't been built yet, this runs `pnpm tauri build --debug` first.

setlocal
cd /d "%~dp0"

set "EXE=src-tauri\target\debug\reading.exe"

if not exist "%EXE%" (
    echo [reading] No debug binary yet -- building. This may take 5-10 minutes the first time...
    call pnpm tauri build --debug
    if errorlevel 1 (
        echo [reading] Build failed. See errors above.
        pause
        exit /b 1
    )
)

if not exist "%EXE%" (
    echo [reading] Expected binary not found at %EXE% even after build. Aborting.
    pause
    exit /b 1
)

echo [reading] Launching...
start "" "%EXE%"
endlocal
