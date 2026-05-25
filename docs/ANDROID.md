# Android Internal Builds

Reading uses Tauri 2 mobile tooling for Android-first internal builds.

## Prerequisites

- Node.js and pnpm
- Rust with rustup
- Android Studio
- Android SDK Platform
- Android SDK Platform-Tools
- Android SDK Build-Tools
- Android SDK Command-line Tools
- Android NDK (Side by side)
- Java from Android Studio's bundled JBR
- An Android emulator or physical device

## Windows Environment Variables

Set these variables to match your local Android Studio installation:

```powershell
[System.Environment]::SetEnvironmentVariable("JAVA_HOME", "C:\Program Files\Android\Android Studio\jbr", "User")
[System.Environment]::SetEnvironmentVariable("ANDROID_HOME", "$env:LOCALAPPDATA\Android\Sdk", "User")
[System.Environment]::SetEnvironmentVariable("ANDROID_SDK_ROOT", "$env:LOCALAPPDATA\Android\Sdk", "User")
$VERSION = Get-ChildItem -Name "$env:LOCALAPPDATA\Android\Sdk\ndk" | Select-Object -Last 1
[System.Environment]::SetEnvironmentVariable("NDK_HOME", "$env:LOCALAPPDATA\Android\Sdk\ndk\$VERSION", "User")
```

Add these directories to your user `Path`:

```text
%ANDROID_HOME%\platform-tools
%ANDROID_HOME%\emulator
```

Open a new terminal after changing environment variables.

## Rust Targets

```powershell
rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android
```

## Commands

```powershell
pnpm.cmd install
pnpm.cmd run android:init
pnpm.cmd run android:dev
pnpm.cmd run android:build
```

Run `android:init` once before the first Android dev or build command. Keep an emulator running or a device connected for `android:dev`.

## Windows Symlink Requirement

`pnpm.cmd run android:build` links the compiled Rust shared library into the generated Android project. On Windows, that final packaging step requires permission to create symbolic links.

If the build fails with `Creation symbolic link is not allowed for this system`, enable Windows Developer Mode or grant symlink creation rights, open a new terminal, and rerun:

```powershell
pnpm.cmd run android:build
```

## Internal Smoke

- Launch app on emulator or physical device.
- Browse MangaDex.
- Open a title.
- Open a manga chapter.
- Swipe and tap through pages.
- Browse NovelFire or paste a generic URL when available.
- Star a title.
- Confirm Continue Reading updates.
- Rotate the device.
- Background the app, resume it, and confirm progress remains.
- Open an external chapter URL if the source exposes one.
