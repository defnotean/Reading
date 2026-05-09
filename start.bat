@echo off
REM Reading - quick launcher.
REM Double-click this file or run `start.bat` from a terminal to launch the app.
REM Auto-rebuilds if any source file is newer than the binary.

setlocal EnableDelayedExpansion
cd /d "%~dp0"

set "EXE=src-tauri\target\debug\reading.exe"
set "REBUILD=0"

REM Build if binary doesn't exist
if not exist "%EXE%" (
    set "REBUILD=1"
    echo [reading] No debug binary yet.
)

REM Build if any Rust / TS / config source is newer than the binary
if exist "%EXE%" (
    for /r "src-tauri\src" %%F in (*.rs) do (
        if "%%~tF" gtr "!EXE_TIME!" set "REBUILD=1"
    )
    for /r src %%F in (*.tsx *.ts *.css) do (
        if "%%~tF" gtr "!EXE_TIME!" set "REBUILD=1"
    )
    REM Simpler heuristic: just compare a couple of key files via a powershell one-liner
    for /f "delims=" %%T in ('powershell -NoProfile -Command "$exe = (Get-Item '%EXE%').LastWriteTime; $newer = Get-ChildItem -Recurse -Path src-tauri\src,src,package.json,src-tauri\Cargo.toml,src-tauri\tauri.conf.json -Include *.rs,*.tsx,*.ts,*.css,*.toml,*.json,package.json -ErrorAction SilentlyContinue ^| Where-Object { $_.LastWriteTime -gt $exe } ^| Select-Object -First 1; if ($newer) { 'YES' } else { 'NO' }"') do set "NEWER=%%T"
    if /I "!NEWER!"=="YES" (
        set "REBUILD=1"
        echo [reading] Source files are newer than the binary -- rebuilding.
    )
)

if "%REBUILD%"=="1" (
    echo [reading] Building. This may take a few minutes the first time...
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
