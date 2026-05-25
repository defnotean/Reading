# Cross-Platform Mobile And Linux Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. The checkboxes below preserve the original implementation recipe; use **Implementation Status** for current progress.

**Goal:** Make Reading build and behave correctly on Linux desktop and produce an internal Android-first Tauri mobile build, while documenting the path to native iOS and Android apps over a shared Rust core.

**Architecture:** Keep the current Tauri 2 + React + Rust boundary intact for the first mobile pass. Add platform-aware shell/layout behavior in React, move the Tauri runtime into a mobile-compatible shared runner, harden source capability metadata, and document the native app path without starting a SwiftUI or Jetpack Compose rewrite before the Android spike proves the product.

**Tech Stack:** Tauri 2, React 19, Vite 7, TypeScript, Vitest, Rust 2021, rusqlite bundled SQLite, GitHub Actions, Android Studio/SDK/NDK for internal Android builds, Linux WebKitGTK for desktop builds.

---

## Implementation Status

Last updated: 2026-05-25

- Tasks 1-6 are implemented in current reachable history (`f74c65a`, `92ac62a`, `eb73af0`, `1bf5ddd`, `0e82efa`, `f893d4d`): CI, platform setup docs, mobile Vite config, Tauri mobile entrypoint, mobile shell, reader touch support, source capability metadata, and committed generated Android project files.
- Task 7 is implemented for internal Windows emulator packaging: Android SDK/NDK and Rust Android targets are installed, `pnpm.cmd run android:init` succeeds, Windows Developer Mode is enabled locally, and the official `pnpm.cmd tauri android build --ci --apk` path now completes through Tauri's symlink step. `pnpm.cmd run android:build:windows-copy` remains available as a guarded fallback for Windows machines without symlink rights.
- Task 8 docs are implemented and updated: `docs/MOBILE_QA.md`, `docs/NATIVE_APPS.md`, `docs/ANDROID.md`, and the roadmap cross-platform status now include Android tablet/landscape chrome behavior, reader touch wake behavior, and the Windows copy fallback.
- Task 9 verification passed for this final patch set: focused mobile/config Vitest tests, `pnpm.cmd run check`, `cargo test --manifest-path src-tauri\Cargo.toml --locked`, `cargo clippy --manifest-path src-tauri\Cargo.toml --locked -- -D warnings`, `git diff --check`, guarded `pnpm.cmd run android:build:windows-copy`, and Android emulator smoke all completed successfully. The smoke used the `medium_phone` AVD: install succeeded, launch focused `com.defnotean.reading/.MainActivity`, MangaDex browse loaded, a reader route opened, and bottom-nav taps reached Settings and Library.
- Task 10 final review found no blocking issues. The remaining step is pushing the commit that contains this status update.

## Current Facts

- Repo root: `C:\Users\Eating\Desktop\Reading`
- GitHub remote: `https://github.com/defnotean/Reading.git`
- Branch: `main`
- Desktop shell uses `src/components/Titlebar.tsx`, `src/components/LeftRail.tsx`, and `src/components/Shell.tsx`.
- Tauri builder now lives in the shared `reading_lib::run()` entrypoint in `src-tauri/src/lib.rs`; `src-tauri/src/main.rs` delegates to it for desktop.
- Vite now honors `TAURI_DEV_HOST`, uses HMR port `1421`, and ignores `src-tauri` in the dev watcher.
- `.github/workflows/ci.yml` now runs Windows and Linux quality gates plus a manual/tag Linux bundle job.
- `src-tauri/Cargo.toml` already uses `rusqlite` with the `bundled` feature, which is the right starting point for Android.
- Tauri capability file already allows window controls and `opener:default`.

## Official References Checked

- Tauri prerequisites: `https://v2.tauri.app/start/prerequisites/`
- Tauri Vite frontend setup: `https://v2.tauri.app/start/frontend/vite/`
- Tauri platform-specific config: `https://v2.tauri.app/reference/config/`
- Tauri opener plugin: `https://v2.tauri.app/plugin/opener/`
- Tauri GitHub Actions pipeline guide: `https://v2.tauri.app/distribute/pipelines/github/`

## Commit Format For This Project

Every commit in this plan must include a detailed body. Use this format:

```bash
git commit -m "scope: short summary" -m "Context:
- why this change exists

Changes:
- exact files/features changed

Tests:
- commands run and result

Notes:
- limitations, blocked environment checks, or follow-up work"
```

## File Map

Create:

- `.github/workflows/ci.yml` - Windows and Linux quality gates plus a manual/tag Linux Tauri bundle job.
- `docs/ANDROID.md` - internal Android setup, build, and smoke checklist.
- `docs/LINUX.md` - Linux dependency, build, package, and smoke checklist.
- `docs/IOS.md` - iOS prerequisites and explicit macOS/Xcode dependency.
- `docs/MOBILE_QA.md` - manual QA script for phone/emulator testing.
- `docs/NATIVE_APPS.md` - shared Rust core and native shell direction.
- `tests/mobile-config.test.ts` - repo contract tests for Android scripts, Vite mobile host config, and mobile docs.
- `tests/tauri-mobile-entrypoint.test.ts` - repo contract tests for Tauri mobile entrypoint shape.
- `tests/mobile-shell.test.tsx` - React tests for mobile bottom navigation and desktop rail behavior.
- `src/components/BottomNav.tsx` - mobile primary navigation.
- `src-tauri/tests/source_capabilities_tests.rs` - Rust tests for source capability metadata.

Modify:

- `index.html` - add `viewport-fit=cover` so safe-area CSS environment variables work on cutout devices.
- `package.json` - add Android scripts.
- `vite.config.ts` - add `TAURI_DEV_HOST`, HMR host, and `src-tauri` watch ignore behavior.
- `src-tauri/src/main.rs` - shrink to the desktop process entrypoint.
- `src-tauri/src/lib.rs` - own the shared Tauri runner and mobile entrypoint attribute.
- `src-tauri/src/commands.rs` - expose `source_capabilities`.
- `src-tauri/src/sources/mod.rs` - define `SourceCapabilities`.
- `src-tauri/tauri.conf.json` - only change if Android dev HMR or platform config validation proves a config change is needed.
- `src-tauri/capabilities/default.json` - only change if opener capability tests prove a missing permission.
- `src/components/Shell.tsx` - render mobile bottom navigation and hide desktop chrome below the `md` breakpoint.
- `src/components/LeftRail.tsx` - label as desktop navigation and hide on mobile.
- `src/components/reader/MangaReader.tsx` - add swipe support and touch-friendly affordances.
- `src/components/reader/NovelReader.tsx` - make reader padding responsive.
- `src/ipc/sources.ts` - add `sourceCapabilities`.
- `src/types.ts` - mirror `SourceCapabilities`.
- `docs/ROADMAP.md` - add the cross-platform track and mark plan status.

## Parallel Worker Strategy

Use subagent-driven execution unless the user asks for inline execution.

- Worker A: Linux CI/docs. Owns `.github/workflows/ci.yml`, `docs/LINUX.md`, and Linux README/roadmap entries.
- Worker B: Tauri mobile bootstrap. Owns `src-tauri/src/main.rs`, `src-tauri/src/lib.rs`, `vite.config.ts`, package Android scripts, and Android docs.
- Worker C: Mobile UI. Owns `BottomNav`, `Shell`, `LeftRail`, manga touch behavior, and novel reader spacing.
- Worker D: Source/native boundary. Owns `SourceCapabilities`, IPC wrapper, native app docs, and roadmap updates.
- Review worker: after each task group, read the diff for regressions, missing tests, platform assumptions, and accidental desktop behavior changes.

Worker rules:

- Do not run Android init and UI rewrites in parallel in the same worktree. Android init generates many files.
- UI work and source capability work can run in parallel if they do not touch the same files.
- CI/docs work can run in parallel with code tasks.
- Each worker must run the focused tests named in its task before returning.

---

### Task 0: Baseline And Environment Preflight

**Files:**
- Read only: repo root, `package.json`, `src-tauri/Cargo.toml`

- [ ] **Step 1: Confirm the branch is clean**

Run:

```powershell
git status --short --branch
```

Expected:

```text
## main...origin/main
```

- [ ] **Step 2: Confirm frontend quality gate before platform edits**

Run:

```powershell
pnpm.cmd run check
```

Expected:

```text
> reading@0.1.0 check
> pnpm run typecheck && pnpm test && pnpm run build
```

and the command exits with code `0`.

- [ ] **Step 3: Confirm Rust tests before platform edits**

Run:

```powershell
$env:PATH="$env:USERPROFILE\.cargo\bin;$env:PATH"
cargo test --manifest-path src-tauri/Cargo.toml --locked
```

Expected: all Rust tests pass.

- [ ] **Step 4: Capture Android tooling status without blocking code work**

Run:

```powershell
java -version
$env:JAVA_HOME
$env:ANDROID_HOME
$env:NDK_HOME
$env:PATH="$env:USERPROFILE\.cargo\bin;$env:PATH"
rustup target list --installed | Select-String "android"
pnpm.cmd tauri info
```

Expected:

- Java prints a JDK version.
- `JAVA_HOME`, `ANDROID_HOME`, and `NDK_HOME` print non-empty paths after Android Studio setup.
- Rust lists `aarch64-linux-android`, `armv7-linux-androideabi`, `i686-linux-android`, and `x86_64-linux-android` once installed.
- `pnpm.cmd tauri info` exits with code `0`.

If any Android prerequisite is missing, continue with code/docs tasks and record the exact missing prerequisite in the final verification notes.

---

### Task 1: Windows And Linux CI

**Files:**
- Create: `.github/workflows/ci.yml`
- Modify: `docs/ROADMAP.md`

- [ ] **Step 1: Create the CI workflow**

Create `.github/workflows/ci.yml` with this content:

```yaml
name: ci

on:
  push:
    branches:
      - main
    tags:
      - "v*"
      - "app-v*"
  pull_request:
  workflow_dispatch:

jobs:
  quality:
    name: quality (${{ matrix.os }})
    runs-on: ${{ matrix.os }}
    strategy:
      fail-fast: false
      matrix:
        os:
          - windows-latest
          - ubuntu-22.04

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Install Linux Tauri dependencies
        if: runner.os == 'Linux'
        run: |
          sudo apt-get update
          sudo apt-get install -y \
            libwebkit2gtk-4.1-dev \
            build-essential \
            curl \
            wget \
            file \
            libxdo-dev \
            libssl-dev \
            libayatana-appindicator3-dev \
            librsvg2-dev \
            libgtk-3-dev \
            libfuse2 \
            patchelf

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 10.33.4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: lts/*
          cache: pnpm

      - name: Setup Rust
        uses: dtolnay/rust-toolchain@stable
        with:
          components: clippy

      - name: Cache Rust
        uses: swatinem/rust-cache@v2
        with:
          workspaces: src-tauri -> target

      - name: Install frontend dependencies
        run: pnpm install --frozen-lockfile

      - name: Frontend check
        run: pnpm run check

      - name: Rust tests
        run: cargo test --manifest-path src-tauri/Cargo.toml --locked

      - name: Rust clippy
        run: cargo clippy --manifest-path src-tauri/Cargo.toml --locked -- -D warnings

  linux-tauri-bundle:
    name: linux tauri bundle
    runs-on: ubuntu-22.04
    if: github.event_name == 'workflow_dispatch' || startsWith(github.ref, 'refs/tags/')

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Install Linux Tauri dependencies
        run: |
          sudo apt-get update
          sudo apt-get install -y \
            libwebkit2gtk-4.1-dev \
            build-essential \
            curl \
            wget \
            file \
            libxdo-dev \
            libssl-dev \
            libayatana-appindicator3-dev \
            librsvg2-dev \
            libgtk-3-dev \
            libfuse2 \
            patchelf

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 10.33.4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: lts/*
          cache: pnpm

      - name: Setup Rust
        uses: dtolnay/rust-toolchain@stable

      - name: Cache Rust
        uses: swatinem/rust-cache@v2
        with:
          workspaces: src-tauri -> target

      - name: Install frontend dependencies
        run: pnpm install --frozen-lockfile

      - name: Build Linux Tauri bundle
        run: pnpm run build:tauri

      - name: Assert Linux bundle artifacts exist
        shell: bash
        run: |
          test -d src-tauri/target/release/bundle
          find src-tauri/target/release/bundle -type f \( -name '*.deb' -o -name '*.AppImage' -o -name '*.rpm' \) | tee /tmp/reading-linux-artifacts.txt
          test -s /tmp/reading-linux-artifacts.txt

      - name: Upload Linux bundle artifacts
        uses: actions/upload-artifact@v4
        with:
          name: reading-linux-bundles
          path: |
            src-tauri/target/release/bundle/**/*.deb
            src-tauri/target/release/bundle/**/*.AppImage
            src-tauri/target/release/bundle/**/*.rpm
          if-no-files-found: error
```

- [ ] **Step 2: Update roadmap Next section**

In `docs/ROADMAP.md`, change the first Next item from "GitHub Actions CI" to:

```markdown
1. **GitHub Actions CI** - Windows and Linux quality gates are planned in `docs/superpowers/plans/2026-05-25-cross-platform-mobile-linux.md`; the workflow should run `pnpm check`, `cargo test`, and `cargo clippy`, with a manual/tag Linux Tauri bundle job that asserts and uploads generated `.deb`, `.AppImage`, or `.rpm` artifacts.
```

- [ ] **Step 3: Validate workflow syntax and formatting locally**

Run:

```powershell
git diff --check -- .github/workflows/ci.yml docs/ROADMAP.md
```

Expected: no output and exit code `0`.

- [ ] **Step 4: Run quality gates after adding CI**

Run:

```powershell
pnpm.cmd run check
$env:PATH="$env:USERPROFILE\.cargo\bin;$env:PATH"
cargo test --manifest-path src-tauri/Cargo.toml --locked
```

Expected: both commands exit with code `0`.

- [ ] **Step 5: Commit CI work**

Run:

```powershell
git add .github/workflows/ci.yml docs/ROADMAP.md
git commit -m "ci: add windows and linux quality gates" -m "Context:
- Reading needs regression coverage before Android and Linux compatibility work grows.
- The workflow directory existed but did not contain a runnable pipeline.

Changes:
- Added a Windows and Ubuntu quality matrix for frontend typecheck/tests/build and Rust tests/clippy.
- Added a manual/tag Ubuntu Tauri bundle job so Linux package generation can be validated separately from every push.
- Updated the roadmap to point at the cross-platform implementation plan.

Tests:
- git diff --check -- .github/workflows/ci.yml docs/ROADMAP.md
- pnpm.cmd run check
- cargo test --manifest-path src-tauri/Cargo.toml --locked

Notes:
- Android CI is intentionally not included until the local Android bootstrap succeeds and generated project files are committed."
```

---

### Task 2: Mobile Tooling Config And Docs

**Files:**
- Create: `tests/mobile-config.test.ts`
- Create: `docs/ANDROID.md`
- Create: `docs/LINUX.md`
- Create: `docs/IOS.md`
- Modify: `package.json`
- Modify: `vite.config.ts`

- [ ] **Step 1: Write failing mobile config contract tests**

Create `tests/mobile-config.test.ts`:

```ts
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("mobile tooling contract", () => {
  test("package exposes Android Tauri scripts", () => {
    const pkg = JSON.parse(read("package.json"));

    expect(pkg.scripts["android:init"]).toBe("tauri android init --ci");
    expect(pkg.scripts["android:dev"]).toBe("tauri android dev");
    expect(pkg.scripts["android:build"]).toBe("tauri android build --ci");
  });

  test("Vite dev server follows Tauri mobile host conventions", () => {
    const config = read("vite.config.ts");

    expect(config).toContain("process.env.TAURI_DEV_HOST");
    expect(config).toContain("host: host || false");
    expect(config).toContain("protocol: \"ws\"");
    expect(config).toContain("port: 1421");
    expect(config).toContain("ignored: [\"**/src-tauri/**\"]");
    expect(config).toContain("process.env.TAURI_ENV_DEBUG");
    expect(config).toContain("envPrefix: [\"VITE_\", \"TAURI_ENV_\"]");
  });

  test("platform setup docs exist", () => {
    expect(existsSync(resolve(root, "docs/ANDROID.md"))).toBe(true);
    expect(existsSync(resolve(root, "docs/LINUX.md"))).toBe(true);
    expect(existsSync(resolve(root, "docs/IOS.md"))).toBe(true);
  });
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```powershell
pnpm.cmd test -- tests/mobile-config.test.ts
```

Expected: FAIL because Android scripts, Vite mobile host config, and docs are not all present yet.

- [ ] **Step 3: Add Android scripts**

In `package.json`, keep existing scripts and add:

```json
"android:init": "tauri android init --ci",
"android:dev": "tauri android dev",
"android:build": "tauri android build --ci"
```

The scripts block should include these lines after `"build:tauri": "tauri build"`:

```json
"dev:tauri": "tauri dev",
"build:tauri": "tauri build",
"android:init": "tauri android init --ci",
"android:dev": "tauri android dev",
"android:build": "tauri android build --ci",
"preview": "vite preview",
"tauri": "tauri"
```

- [ ] **Step 4: Update Vite for mobile dev host**

Replace `vite.config.ts` with:

```ts
/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
  envPrefix: ["VITE_", "TAURI_ENV_"],
  build: {
    target: "es2021",
    minify: !process.env.TAURI_ENV_DEBUG ? "esbuild" : false,
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
  },
});
```

- [ ] **Step 5: Add Android docs**

Create `docs/ANDROID.md`:

````markdown
# Android Internal Builds

Reading targets Android through Tauri mobile first. This is for personal/internal testing before any public store work.

## Prerequisites

- Android Studio
- Android SDK Platform
- Android SDK Platform-Tools
- Android SDK Build-Tools
- Android SDK Command-line Tools
- NDK (Side by side)
- Java from Android Studio's bundled JBR
- Rust Android targets:

```powershell
rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android
```

## Windows Environment Variables

```powershell
[System.Environment]::SetEnvironmentVariable("JAVA_HOME", "C:\Program Files\Android\Android Studio\jbr", "User")
[System.Environment]::SetEnvironmentVariable("ANDROID_HOME", "$env:LocalAppData\Android\Sdk", "User")
$VERSION = Get-ChildItem -Name "$env:LocalAppData\Android\Sdk\ndk" | Select-Object -Last 1
[System.Environment]::SetEnvironmentVariable("NDK_HOME", "$env:LocalAppData\Android\Sdk\ndk\$VERSION", "User")
```

Refresh the current PowerShell session after changing user environment variables:

```powershell
[System.Environment]::GetEnvironmentVariables("User").GetEnumerator() | % { Set-Item -Path "Env:\$($_.key)" -Value $_.value }
```

## Commands

```powershell
pnpm.cmd install
pnpm.cmd run android:init
pnpm.cmd run android:dev
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
````

- [ ] **Step 6: Add Linux docs**

Create `docs/LINUX.md`:

````markdown
# Linux Desktop Builds

Reading targets Linux through the same Tauri desktop app used on Windows.

## Ubuntu Dependencies

```bash
sudo apt-get update
sudo apt-get install -y \
  libwebkit2gtk-4.1-dev \
  build-essential \
  curl \
  wget \
  file \
  libxdo-dev \
  libssl-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev \
  patchelf
```

## Commands

```bash
pnpm install --frozen-lockfile
pnpm run check
cargo test --manifest-path src-tauri/Cargo.toml --locked
cargo clippy --manifest-path src-tauri/Cargo.toml --locked -- -D warnings
pnpm run build:tauri
```

## Smoke

- Launch the app from the generated Linux bundle.
- Confirm the custom titlebar drag, minimize, maximize, and close controls.
- Browse MangaDex, ComicK, and NovelFire.
- Open a title detail page.
- Open manga and novel reader routes.
- Confirm cover images load through the asset protocol.
- Star a title and restart the app.
- Confirm Continue Reading persists after restart.
- Open an external URL through the opener plugin when one is available.
````

- [ ] **Step 7: Add iOS docs**

Create `docs/IOS.md`:

````markdown
# iOS Internal Builds

iOS is part of the cross-platform direction, but it requires macOS and Xcode. This Windows workstation can prepare the shared code and documentation, but it cannot build or run iOS locally.

## Prerequisites On macOS

- Xcode, not only Xcode Command Line Tools
- Rust iOS targets:

```bash
rustup target add aarch64-apple-ios x86_64-apple-ios aarch64-apple-ios-sim
```

- CocoaPods:

```bash
brew install cocoapods
```

## Expected First Commands On A Mac

```bash
pnpm install --frozen-lockfile
pnpm tauri ios init
pnpm tauri ios dev
pnpm tauri ios build
```

## Scope

The first iOS pass should validate launch, browse, reader, library, and progress persistence. Store submission, background audio, and native SwiftUI shell work remain outside the first Android-first internal pass.
````

- [ ] **Step 8: Run the focused test and verify it passes**

Run:

```powershell
pnpm.cmd test -- tests/mobile-config.test.ts
```

Expected: PASS.

- [ ] **Step 9: Run frontend quality gate**

Run:

```powershell
pnpm.cmd run check
```

Expected: PASS.

- [ ] **Step 10: Commit mobile tooling config**

Run:

```powershell
git add package.json vite.config.ts tests/mobile-config.test.ts docs/ANDROID.md docs/LINUX.md docs/IOS.md
git commit -m "build: add mobile tooling configuration" -m "Context:
- Android-first internal builds need explicit scripts, Vite host handling, and setup docs before generated mobile project files are added.
- Tauri mobile expects the dev server to honor TAURI_DEV_HOST and a fixed HMR port.

Changes:
- Added non-interactive Android init/build scripts and an Android dev script.
- Updated Vite to use TAURI_DEV_HOST, fixed HMR port 1421, ignore src-tauri file watching, and expose only VITE_ plus TAURI_ENV_ variables.
- Added Android, Linux, and iOS setup documents.
- Added repo contract tests for mobile tooling assumptions.

Tests:
- pnpm.cmd test -- tests/mobile-config.test.ts
- pnpm.cmd run check

Notes:
- Android init/build commands use Tauri's --ci flag so agent-driven execution does not hang on prompts.
- Android commands should only be run after Android Studio, SDK, NDK, Java, and Rust Android targets are installed."
```

---

### Task 3: Tauri Mobile Entrypoint

**Files:**
- Create: `tests/tauri-mobile-entrypoint.test.ts`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/src/main.rs`

- [ ] **Step 1: Write failing entrypoint contract tests**

Create `tests/tauri-mobile-entrypoint.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("Tauri mobile entrypoint contract", () => {
  test("Cargo library keeps mobile-compatible crate types", () => {
    const cargo = read("src-tauri/Cargo.toml");

    expect(cargo).toContain("crate-type = [\"staticlib\", \"cdylib\", \"rlib\"]");
  });

  test("shared library exposes a mobile entrypoint runner", () => {
    const lib = read("src-tauri/src/lib.rs");

    expect(lib).toContain("#[cfg_attr(mobile, tauri::mobile_entry_point)]");
    expect(lib).toContain("pub fn run()");
    expect(lib).toContain("tauri::Builder::default()");
    expect(lib).toContain("tauri_plugin_opener::init()");
    expect(lib).toContain("commands::browse");
    expect(lib).toContain("commands::from_url");
  });

  test("desktop binary delegates to the shared runner", () => {
    const main = read("src-tauri/src/main.rs");

    expect(main).toContain("reading_lib::run();");
    expect(main).not.toContain("tauri::Builder::default()");
  });
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```powershell
pnpm.cmd test -- tests/tauri-mobile-entrypoint.test.ts
```

Expected: FAIL because the shared runner does not exist yet.

- [ ] **Step 3: Replace `src-tauri/src/lib.rs` with the shared runner**

Use this full file:

```rust
pub mod cache;
pub mod commands;
pub mod db;
pub mod error;
pub mod http;
pub mod library;
pub mod sources;

use tauri::Manager;

pub use error::{AppError, AppResult};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .init();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let state = commands::AppState::new(app.handle()).expect("AppState init");
            app.manage(state);
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                tracing::info!("close requested for {}", window.label());
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::browse,
            commands::search,
            commands::get_title,
            commands::get_chapter,
            commands::library_list,
            commands::library_set_starred,
            commands::library_is_starred,
            commands::continue_reading,
            commands::record_progress,
            commands::from_url,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 4: Replace `src-tauri/src/main.rs` with a desktop-only delegate**

Use this full file:

```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    reading_lib::run();
}
```

- [ ] **Step 5: Run focused tests and Rust tests**

Run:

```powershell
pnpm.cmd test -- tests/tauri-mobile-entrypoint.test.ts
$env:PATH="$env:USERPROFILE\.cargo\bin;$env:PATH"
cargo test --manifest-path src-tauri/Cargo.toml --locked
```

Expected: both commands pass.

- [ ] **Step 6: Commit Tauri entrypoint work**

Run:

```powershell
git add src-tauri/src/lib.rs src-tauri/src/main.rs tests/tauri-mobile-entrypoint.test.ts
git commit -m "feat: prepare tauri runner for mobile" -m "Context:
- Tauri mobile expects the application runner to live in the library crate and be marked with the mobile entrypoint attribute.
- The current desktop binary owned the full builder, which blocked Android initialization from reusing the same app wiring.

Changes:
- Moved the Tauri builder, plugins, managed state, window event hook, and command registration into reading_lib::run.
- Marked the shared runner with cfg_attr(mobile, tauri::mobile_entry_point).
- Reduced the desktop binary to a small call into reading_lib::run.
- Added contract tests that lock the mobile entrypoint shape.

Tests:
- pnpm.cmd test -- tests/tauri-mobile-entrypoint.test.ts
- cargo test --manifest-path src-tauri/Cargo.toml --locked

Notes:
- Behavior should remain identical on desktop because the builder configuration was moved without changing command registration."
```

---

### Task 4: Mobile Shell Navigation

**Files:**
- Create: `src/components/BottomNav.tsx`
- Create: `tests/mobile-shell.test.tsx`
- Modify: `index.html`
- Modify: `src/components/Shell.tsx`
- Modify: `src/components/LeftRail.tsx`
- Modify: `tests/shell.test.tsx`

- [ ] **Step 1: Write failing mobile shell tests**

Create `tests/mobile-shell.test.tsx`:

```tsx
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { BottomNav } from "../src/components/BottomNav";
import { LeftRail } from "../src/components/LeftRail";
import { Shell } from "../src/components/Shell";

function LocationProbe() {
  const location = useLocation();
  return <p data-testid="path">{location.pathname}</p>;
}

test("BottomNav renders touch primary destinations", () => {
  render(
    <MemoryRouter initialEntries={["/"]}>
      <BottomNav />
    </MemoryRouter>
  );

  expect(screen.getByLabelText(/mobile primary/i)).toHaveClass("md:hidden");
  expect(screen.getByLabelText(/browse/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/library/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/settings/i)).toBeInTheDocument();
});

test("BottomNav links navigate between primary app tabs", () => {
  render(
    <MemoryRouter initialEntries={["/"]}>
      <BottomNav />
      <Routes>
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>
  );

  fireEvent.click(screen.getByLabelText(/library/i));
  expect(screen.getByTestId("path")).toHaveTextContent("/library");

  fireEvent.click(screen.getByLabelText(/settings/i));
  expect(screen.getByTestId("path")).toHaveTextContent("/settings");

  fireEvent.click(screen.getByLabelText(/browse/i));
  expect(screen.getByTestId("path")).toHaveTextContent("/");
});

test("LeftRail is labelled and hidden on mobile widths", () => {
  render(
    <MemoryRouter initialEntries={["/"]}>
      <LeftRail />
    </MemoryRouter>
  );

  expect(screen.getByLabelText(/desktop primary/i)).toHaveClass("hidden", "md:flex");
});

test("Shell mounts mobile navigation, desktop chrome wrapper, and safe-area content padding", () => {
  render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={<Shell />}>
          <Route index element={<p>Browse content</p>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );

  const mobileNav = screen.getByLabelText(/mobile primary/i);
  const desktopNav = screen.getByLabelText(/desktop primary/i);
  const titlebarWrapper = screen.getByTestId("desktop-titlebar-wrapper");
  const contentFrame = screen.getByTestId("shell-content-frame");

  expect(within(mobileNav).getByLabelText(/browse/i)).toBeInTheDocument();
  expect(desktopNav).toHaveClass("hidden", "md:flex");
  expect(titlebarWrapper).toHaveClass("hidden", "md:block");
  expect(contentFrame).toHaveClass("pb-[calc(4.25rem+env(safe-area-inset-bottom))]", "md:pb-0");
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```powershell
pnpm.cmd test -- tests/mobile-shell.test.tsx
```

Expected: FAIL because `BottomNav` does not exist and `LeftRail` does not have the desktop/mobile classes yet.

- [ ] **Step 3: Enable viewport safe-area support**

In `index.html`, change:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
```

to:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
```

- [ ] **Step 4: Add `BottomNav`**

Create `src/components/BottomNav.tsx`:

```tsx
import { NavLink } from "react-router-dom";
import { Compass, Library, Settings } from "lucide-react";
import clsx from "clsx";

const items = [
  { to: "/", label: "Browse", Icon: Compass },
  { to: "/library", label: "Library", Icon: Library },
  { to: "/settings", label: "Settings", Icon: Settings },
] as const;

export function BottomNav() {
  return (
    <nav
      aria-label="Mobile primary"
      className="fixed inset-x-0 bottom-0 z-50 md:hidden border-t border-ink-700/70 bg-ink-950/95 backdrop-blur-xl px-2 pt-1 pb-[calc(0.5rem+env(safe-area-inset-bottom))]"
    >
      <div className="grid grid-cols-3 gap-1">
        {items.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            aria-label={label}
            className={({ isActive }) =>
              clsx(
                "min-h-14 rounded-lg flex flex-col items-center justify-center gap-1 focus-ring transition-colors touch-manipulation",
                "text-ink-300 active:bg-ink-700/70",
                isActive && "text-accent-soft bg-accent/15"
              )
            }
          >
            <Icon size={22} strokeWidth={2} aria-hidden="true" />
            <span className="text-[11px] font-medium">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
```

- [ ] **Step 5: Hide desktop rail on mobile**

In `src/components/LeftRail.tsx`, change the `motion.nav` aria label and class:

```tsx
<motion.nav
  aria-label="Desktop primary"
  initial={{ x: -8, opacity: 0 }}
  animate={{ x: 0, opacity: 1 }}
  transition={{ type: "spring", stiffness: 220, damping: 24 }}
  className="hidden md:flex w-20 h-full glass border-r border-ink-700/60 flex-col py-3 gap-1 flex-shrink-0"
>
```

- [ ] **Step 6: Render mobile bottom nav from the shell**

Replace `src/components/Shell.tsx` with:

```tsx
import { Outlet } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { LeftRail } from "./LeftRail";
import { Toaster } from "./Toast";
import { Titlebar } from "./Titlebar";

export function Shell() {
  return (
    <div className="h-full w-full flex flex-col bg-ink-950 text-ink-100">
      <div data-testid="desktop-titlebar-wrapper" className="hidden md:block">
        <Titlebar />
      </div>
      <div data-testid="shell-content-frame" className="flex flex-1 overflow-hidden pb-[calc(4.25rem+env(safe-area-inset-bottom))] md:pb-0">
        <LeftRail />
        <main className="flex-1 overflow-hidden relative">
          <Outlet />
        </main>
      </div>
      <BottomNav />
      <Toaster />
    </div>
  );
}
```

- [ ] **Step 7: Update existing shell test aria expectations**

In `tests/shell.test.tsx`, change only the first test name to:

```ts
test("LeftRail renders three labelled desktop destinations", () => {
```

Keep the existing destination assertions. The labels `Browse`, `Library`, and `Settings` remain unchanged.

- [ ] **Step 8: Run focused and full frontend tests**

Run:

```powershell
pnpm.cmd test -- tests/mobile-shell.test.tsx tests/shell.test.tsx
pnpm.cmd run check
```

Expected: both commands pass.

- [ ] **Step 9: Commit mobile shell work**

Run:

```powershell
git add index.html src/components/BottomNav.tsx src/components/Shell.tsx src/components/LeftRail.tsx tests/mobile-shell.test.tsx tests/shell.test.tsx
git commit -m "feat: add mobile shell navigation" -m "Context:
- The desktop titlebar and left rail do not fit Android phone screens.
- Mobile users need touch-sized primary navigation and safe-area padding without losing the existing desktop shell.

Changes:
- Added a bottom navigation component for Browse, Library, and Settings.
- Hid the desktop titlebar and rail below the md breakpoint.
- Added bottom safe-area padding so content does not sit under phone system navigation.
- Enabled viewport-fit=cover so safe-area CSS environment variables work on cutout devices.
- Labelled the desktop rail separately from mobile navigation.
- Added React tests for mobile navigation, desktop rail behavior, and Shell integration.

Tests:
- pnpm.cmd test -- tests/mobile-shell.test.tsx tests/shell.test.tsx
- pnpm.cmd run check

Notes:
- This is viewport-responsive mobile behavior; device-specific native APIs are not needed for the first pass."
```

---

### Task 5: Mobile Reader Touch Pass

**Files:**
- Modify: `src/components/reader/MangaReader.tsx`
- Modify: `src/components/reader/NovelReader.tsx`
- Modify: `tests/manga-reader.test.tsx`
- Modify: `tests/novel-reader.test.tsx`

- [ ] **Step 1: Add failing manga swipe test**

Append to `tests/manga-reader.test.tsx`:

```tsx
test("MangaReader advances pages on a left swipe", () => {
  render(<MangaReader source="mangadex" titleId="t" chapterId="c" pages={pages} mode="paginated" />);

  const nextZone = screen.getByLabelText(/next page/i);
  fireEvent.pointerDown(nextZone, { clientX: 240, clientY: 200 });
  fireEvent.pointerUp(nextZone, { clientX: 100, clientY: 210 });

  expect(screen.getByText(/page 2 of 3/i)).toBeInTheDocument();
});

test("MangaReader ignores mostly vertical swipes", () => {
  render(<MangaReader source="mangadex" titleId="t" chapterId="c" pages={pages} mode="paginated" />);

  const nextZone = screen.getByLabelText(/next page/i);
  fireEvent.pointerDown(nextZone, { clientX: 240, clientY: 100 });
  fireEvent.pointerUp(nextZone, { clientX: 160, clientY: 220 });

  expect(screen.getByText(/page 1 of 3/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Add failing novel responsive spacing test**

Append to `tests/novel-reader.test.tsx`:

```tsx
test("NovelReader uses mobile-first horizontal padding", () => {
  render(<NovelReader source="nf" titleId="t" chapterId="c" paragraphs={paragraphs} plain={paragraphs.join("\n\n")} mode="paginated" />);

  expect(screen.getByTestId("novel-page-scroll")).toHaveClass("px-5", "sm:px-12");
});

test("NovelReader continuous mode uses mobile-first horizontal padding", () => {
  render(<NovelReader source="nf" titleId="t" chapterId="c" paragraphs={paragraphs} plain={paragraphs.join("\n\n")} mode="continuous" />);

  expect(screen.getByTestId("novel-continuous-prose")).toHaveClass("px-5", "sm:px-12");
});
```

- [ ] **Step 3: Run focused tests and verify they fail**

Run:

```powershell
pnpm.cmd test -- tests/manga-reader.test.tsx tests/novel-reader.test.tsx
```

Expected: FAIL because `manga-page-stage`, swipe handling, mostly-vertical swipe rejection, `novel-page-scroll`, and `novel-continuous-prose` are not present yet.

- [ ] **Step 4: Add swipe state to `MangaPaginated`**

Inside `MangaPaginated`, after `const lastDirRef = useRef<"forward" | "backward">("forward");`, add:

```tsx
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
```

After `const arrowRight = direction === "rtl" ? prev : next;`, add:

```tsx
  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    swipeStartRef.current = { x: event.clientX, y: event.clientY };
  }

  function onPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (swipeStartRef.current === null) {
      return;
    }

    const deltaX = event.clientX - swipeStartRef.current.x;
    const deltaY = event.clientY - swipeStartRef.current.y;
    swipeStartRef.current = null;

    if (Math.abs(deltaX) < 48 || Math.abs(deltaX) <= Math.abs(deltaY)) {
      return;
    }

    if (deltaX < 0) {
      arrowRight();
    } else {
      arrowLeft();
    }
  }

  function onPointerCancel() {
    swipeStartRef.current = null;
  }
```

- [ ] **Step 5: Add swipe handlers and touch classes to the manga stage**

Change the `containerClass` definition to include `touch-pan-y`:

```tsx
  const containerClass = fit === "width"
    ? "relative h-full w-full bg-ink-950 overflow-hidden touch-pan-y"
    : "relative h-full w-full bg-ink-950 overflow-auto touch-pan-y";
```

Change the top-level return container from:

```tsx
<div className={containerClass}>
```

to:

```tsx
<div
  data-testid="manga-page-stage"
  onPointerDown={onPointerDown}
  onPointerUp={onPointerUp}
  onPointerCancel={onPointerCancel}
  className={containerClass}
>
```

Keep the image `motion.div` as the animation surface:

```tsx
        <motion.div
          key={`${chapterId}_${index}`}
          initial={{ x: enterX, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: exitX, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="absolute inset-0 flex items-center justify-center"
          style={fit !== "width" ? { position: "relative", minHeight: "100%" } : undefined}
        >
```

Change both paginated click-zone button classes from:

```tsx
className="absolute left-0 top-0 h-full w-1/3 focus-ring group z-10 disabled:pointer-events-none"
```

and:

```tsx
className="absolute right-0 top-0 h-full w-1/3 focus-ring group z-10 disabled:pointer-events-none"
```

to include `touch-manipulation`:

```tsx
className="absolute left-0 top-0 h-full w-1/3 focus-ring group z-10 disabled:pointer-events-none touch-manipulation"
```

```tsx
className="absolute right-0 top-0 h-full w-1/3 focus-ring group z-10 disabled:pointer-events-none touch-manipulation"
```

- [ ] **Step 6: Make novel reader padding mobile-first**

In `NovelPaginated`, change:

```tsx
<div className="absolute inset-0 overflow-y-auto px-12 py-8">
```

to:

```tsx
<div data-testid="novel-page-scroll" className="absolute inset-0 overflow-y-auto px-5 sm:px-12 py-6 sm:py-8">
```

In `NovelContinuous`, change:

```tsx
<article className={`${prose} px-12 py-10`}>
```

to:

```tsx
<article data-testid="novel-continuous-prose" className={`${prose} px-5 sm:px-12 py-7 sm:py-10`}>
```

- [ ] **Step 7: Replace mojibake separator comments while touching reader files**

In `MangaReader.tsx` and `NovelReader.tsx`, replace garbled separator comments with ASCII comments:

```tsx
// Paginated
```

and:

```tsx
// Continuous
```

Do not change behavior while doing this cleanup.

- [ ] **Step 8: Run focused and full frontend tests**

Run:

```powershell
pnpm.cmd test -- tests/manga-reader.test.tsx tests/novel-reader.test.tsx
pnpm.cmd run check
```

Expected: both commands pass.

- [ ] **Step 9: Commit mobile reader work**

Run:

```powershell
git add src/components/reader/MangaReader.tsx src/components/reader/NovelReader.tsx tests/manga-reader.test.tsx tests/novel-reader.test.tsx
git commit -m "feat: improve reader touch behavior" -m "Context:
- Android users need touch gestures and mobile spacing, not only keyboard and desktop click controls.
- The current readers work on desktop but use wide padding and have no swipe path.

Changes:
- Added swipe navigation to the paginated manga reader, including horizontal-intent checks so vertical scrolling does not flip pages.
- Added touch manipulation classes to page zones.
- Made novel reader padding mobile-first with larger spacing restored at the sm breakpoint.
- Cleaned garbled separator comments in touched reader files.
- Added tests for swipe navigation, vertical swipe rejection, and responsive novel reader spacing in paginated and continuous modes.

Tests:
- pnpm.cmd test -- tests/manga-reader.test.tsx tests/novel-reader.test.tsx
- pnpm.cmd run check

Notes:
- Swipe support is intentionally limited to horizontal page changes in paginated manga mode."
```

---

### Task 6: Source Capability Contract

**Files:**
- Create: `src-tauri/tests/source_capabilities_tests.rs`
- Modify: `src-tauri/src/sources/mod.rs`
- Modify: `src-tauri/src/commands.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src/types.ts`
- Modify: `src/ipc/sources.ts`

- [ ] **Step 1: Write failing Rust capability tests**

Create `src-tauri/tests/source_capabilities_tests.rs`:

```rust
use reading_lib::sources::source_capabilities;

#[test]
fn source_capabilities_include_all_registered_sources() {
    let caps = source_capabilities();
    let ids: Vec<_> = caps.iter().map(|cap| cap.source.as_str()).collect();

    assert_eq!(ids, vec!["comick", "generic", "mangadex", "novelfire"]);
}

#[test]
fn source_capabilities_describe_mobile_visible_features() {
    let caps = source_capabilities();
    let mangadex = caps.iter().find(|cap| cap.source == "mangadex").unwrap();
    let generic = caps.iter().find(|cap| cap.source == "generic").unwrap();
    let novelfire = caps.iter().find(|cap| cap.source == "novelfire").unwrap();

    assert_eq!(mangadex.content_kind, "manga");
    assert!(mangadex.browse);
    assert!(mangadex.search);
    assert!(mangadex.external_chapters);
    assert_eq!(generic.content_kind, "manga_or_novel");
    assert!(!generic.browse);
    assert!(!generic.search);
    assert_eq!(novelfire.content_kind, "novel");
}
```

- [ ] **Step 2: Run the Rust test and verify it fails**

Run:

```powershell
$env:PATH="$env:USERPROFILE\.cargo\bin;$env:PATH"
cargo test --manifest-path src-tauri/Cargo.toml --locked --test source_capabilities_tests
```

Expected: FAIL because `source_capabilities` is not defined.

- [ ] **Step 3: Add source capability types**

In `src-tauri/src/sources/mod.rs`, after `ChapterContent`, add:

```rust
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct SourceCapabilities {
    pub source: String,
    pub content_kind: String,
    pub browse: bool,
    pub search: bool,
    pub title_detail: bool,
    pub chapter_content: bool,
    pub external_chapters: bool,
    pub public_store_safe: bool,
}

pub fn source_capabilities() -> Vec<SourceCapabilities> {
    vec![
        SourceCapabilities {
            source: "comick".into(),
            content_kind: "manga".into(),
            browse: true,
            search: true,
            title_detail: true,
            chapter_content: true,
            external_chapters: false,
            public_store_safe: false,
        },
        SourceCapabilities {
            source: "generic".into(),
            content_kind: "manga_or_novel".into(),
            browse: false,
            search: false,
            title_detail: true,
            chapter_content: true,
            external_chapters: false,
            public_store_safe: false,
        },
        SourceCapabilities {
            source: "mangadex".into(),
            content_kind: "manga".into(),
            browse: true,
            search: true,
            title_detail: true,
            chapter_content: true,
            external_chapters: true,
            public_store_safe: false,
        },
        SourceCapabilities {
            source: "novelfire".into(),
            content_kind: "novel".into(),
            browse: true,
            search: true,
            title_detail: true,
            chapter_content: true,
            external_chapters: false,
            public_store_safe: false,
        },
    ]
}
```

- [ ] **Step 4: Add IPC command**

In `src-tauri/src/commands.rs`, change the `use crate::sources` import to include `SourceCapabilities`:

```rust
use crate::sources::{
    mangadex::MangaDex, BrowseList, ChapterContent, Source, SourceCapabilities, TitleDetail,
    TitleSummary,
};
```

Add this command after `pick_source`:

```rust
#[tauri::command]
pub fn source_capabilities() -> Vec<SourceCapabilities> {
    crate::sources::source_capabilities()
}
```

In `src-tauri/src/lib.rs`, add the command to `tauri::generate_handler!`:

```rust
            commands::source_capabilities,
```

Place it before `commands::browse`.

- [ ] **Step 5: Add TypeScript mirror and IPC wrapper**

In `src/types.ts`, after `ChapterContent`, add:

```ts
export interface SourceCapabilities {
  source: string;
  content_kind: "manga" | "novel" | "manga_or_novel";
  browse: boolean;
  search: boolean;
  title_detail: boolean;
  chapter_content: boolean;
  external_chapters: boolean;
  public_store_safe: boolean;
}
```

In `src/ipc/sources.ts`, include `SourceCapabilities` in the type import:

```ts
  BrowseList, ChapterContent, SourceCapabilities, TitleDetail, TitleSummary,
```

Add this wrapper before `browse`:

```ts
export async function sourceCapabilities(): Promise<SourceCapabilities[]> {
  return invoke("source_capabilities");
}
```

- [ ] **Step 6: Run Rust and frontend checks**

Run:

```powershell
$env:PATH="$env:USERPROFILE\.cargo\bin;$env:PATH"
cargo test --manifest-path src-tauri/Cargo.toml --locked --test source_capabilities_tests
cargo test --manifest-path src-tauri/Cargo.toml --locked
pnpm.cmd run check
```

Expected: all commands pass.

- [ ] **Step 7: Commit source capability work**

Run:

```powershell
git add src-tauri/src/sources/mod.rs src-tauri/src/commands.rs src-tauri/src/lib.rs src-tauri/tests/source_capabilities_tests.rs src/types.ts src/ipc/sources.ts
git commit -m "feat: expose source capabilities" -m "Context:
- Mobile and future native clients need to know which sources support browsing, search, chapters, and external links without hard-coding UI assumptions.
- The existing Source trait is behavior-oriented but does not expose client capability metadata.

Changes:
- Added SourceCapabilities metadata for ComicK, generic URLs, MangaDex, and NovelFire.
- Exposed the metadata through a source_capabilities Tauri command.
- Mirrored the DTO and IPC wrapper in TypeScript.
- Added Rust tests that lock registered source order and mobile-visible capability flags.

Tests:
- cargo test --manifest-path src-tauri/Cargo.toml --locked --test source_capabilities_tests
- cargo test --manifest-path src-tauri/Cargo.toml --locked
- pnpm.cmd run check

Notes:
- public_store_safe is false for all current sources because the app is still personal/internal and store policy review is out of scope."
```

---

### Task 7: Android Init And Generated Project

**Files:**
- Generated by Tauri: `src-tauri/gen/android/**`
- Modify if generated tooling changes it: `src-tauri/Cargo.toml`

- [ ] **Step 1: Re-run Android environment check**

Run:

```powershell
java -version
$env:JAVA_HOME
$env:ANDROID_HOME
$env:NDK_HOME
$env:PATH="$env:USERPROFILE\.cargo\bin;$env:PATH"
rustup target list --installed | Select-String "android"
```

Expected:

- Java is available.
- `JAVA_HOME`, `ANDROID_HOME`, and `NDK_HOME` are non-empty.
- Rust Android targets include `aarch64-linux-android`, `armv7-linux-androideabi`, `i686-linux-android`, and `x86_64-linux-android`.

If any expected item is missing, stop this task, leave previous commits intact, and record the missing prerequisite in final notes.

- [ ] **Step 2: Initialize Android project**

Run:

```powershell
pnpm.cmd run android:init
```

Expected:

- Tauri creates Android project files under `src-tauri/gen/android/`.
- The command exits with code `0`.

- [ ] **Step 3: Inspect generated files**

Run:

```powershell
git status --short
Get-ChildItem -Path src-tauri\gen\android -Recurse | Select-Object -First 40 FullName
```

Expected:

- `src-tauri/gen/android/` appears as new files.
- No unrelated files outside the Android generation scope appear.

- [ ] **Step 4: Do not add no-op Android config overrides**

Run:

```powershell
git status --short
```

Expected: only generated Android files and necessary generated metadata appear.

Do not create `src-tauri/tauri.android.conf.json` just to set `bundle.android.minSdkVersion` to `24`; that is Tauri's default and does not address desktop window sizing. If Android build validation reports a specific config error, stop and fix the exact reported setting in a separate reviewed change with a focused test or documented command output.

- [ ] **Step 5: Build Android package**

Run:

```powershell
pnpm.cmd run android:build
```

Expected:

- The command exits with code `0`.
- Generated Android build output includes an APK or AAB path printed by Tauri/Gradle.

- [ ] **Step 6: Run the full non-Android quality gate**

Run:

```powershell
pnpm.cmd run check
$env:PATH="$env:USERPROFILE\.cargo\bin;$env:PATH"
cargo test --manifest-path src-tauri/Cargo.toml --locked
```

Expected: both commands pass.

- [ ] **Step 7: Commit Android generated project**

Run:

```powershell
git add src-tauri/gen/android src-tauri/Cargo.toml
git commit -m "build: initialize android tauri project" -m "Context:
- The app needs an internal Android build path after the shared Tauri runner and mobile Vite config are in place.
- Android project files are generated by the Tauri CLI and should be committed so future builds are reproducible.

Changes:
- Initialized the Tauri Android project under src-tauri/gen/android.
- Preserved the existing React/Rust application boundary.

Tests:
- pnpm.cmd run android:init
- pnpm.cmd run android:build
- pnpm.cmd run check
- cargo test --manifest-path src-tauri/Cargo.toml --locked

Notes:
- If Android tooling is missing on this workstation, this commit should not be created; record the missing tooling instead."
```

---

### Task 8: Mobile And Native App Documentation

**Files:**
- Create: `docs/MOBILE_QA.md`
- Create: `docs/NATIVE_APPS.md`
- Modify: `docs/ROADMAP.md`

- [ ] **Step 1: Create mobile QA checklist**

Create `docs/MOBILE_QA.md`:

````markdown
# Mobile QA

Use this checklist for every internal Android build and for the first iOS build when macOS/Xcode is available.

## Device Matrix

- Android emulator, phone-size profile
- Android physical phone when available
- Android tablet when available
- iOS simulator on macOS when available
- iPhone physical device when signing is available

## Launch

- App opens without a blank screen.
- Bottom navigation is visible.
- Desktop titlebar controls are not visible.
- Safe-area padding keeps controls above system navigation.

## Browse And Search

- MangaDex trending loads.
- ComicK trending loads.
- NovelFire trending loads.
- Search returns results for a known title.
- Generic URL paste returns a reader route for a supported page.

## Reader

- Manga paginated reader advances by tap.
- Manga paginated reader advances by swipe.
- Manga continuous reader scrolls smoothly.
- Novel paginated reader fits text without horizontal overflow.
- Novel continuous reader keeps readable margins.
- Reader settings remain reachable and do not overflow.

## Library And Persistence

- Star a title.
- Restart the app.
- Starred title remains in Library.
- Open a chapter and change progress.
- Restart the app.
- Continue Reading points at the last opened title.

## Platform Behavior

- External URL opener launches the default browser when an external chapter URL is available.
- Rotate portrait to landscape and back.
- Background the app, wait ten seconds, resume it.
- Clear cache in Settings and confirm app remains responsive.
````

- [ ] **Step 2: Create native app architecture note**

Create `docs/NATIVE_APPS.md`:

````markdown
# Native iOS And Android Direction

Reading is starting with Tauri mobile because it reuses the existing React UI and Rust backend. Native SwiftUI and Jetpack Compose shells remain a deliberate path if the Android spike proves that native UI, background audio, media controls, accessibility, or model loading need platform-specific treatment.

## Target Shape

```text
Reading/
  crates/
    reading-core/
    reading-ffi/
  src-tauri/
  src/
  apps/
    ios/
    android/
```

## Shared Core Boundary

The shared Rust core should eventually own:

- source adapters
- source capability metadata
- HTTP safety rules
- cover cache rules
- SQLite metadata and progress
- fake audio state machine
- future audio/OCR/model orchestration

The UI shells should own:

- navigation
- reader gestures
- platform media controls
- platform storage permissions
- accessibility presentation
- signing and distribution

## Extraction Rule

Do not extract `reading-core` before the Android Tauri build proves launch, browse, reader, library, and progress persistence on a device or emulator. The first extraction should move behavior without changing source DTO names or reader-visible behavior.

## First Native Milestones

1. Extract `crates/reading-core` with Rust tests passing outside Tauri.
2. Keep Tauri commands as thin wrappers around `reading-core`.
3. Add `crates/reading-ffi` using UniFFI or a small C ABI after the Rust API stabilizes.
4. Build a SwiftUI proof of concept for browse/title/reader on macOS/Xcode.
5. Build a Jetpack Compose proof of concept for browse/title/reader on Android Studio.
````

- [ ] **Step 3: Update roadmap cross-platform status**

In `docs/ROADMAP.md`, add this section after "Beyond-plan additions":

```markdown
### Cross-platform track
Approved direction: internal-first, Android-first, Tauri mobile now, Linux desktop compatibility in parallel, and native SwiftUI/Jetpack Compose shells over a shared Rust core only after the Android spike proves the main flows.

See [`docs/superpowers/specs/2026-05-25-cross-platform-mobile-linux-design.md`](superpowers/specs/2026-05-25-cross-platform-mobile-linux-design.md) and [`docs/superpowers/plans/2026-05-25-cross-platform-mobile-linux.md`](superpowers/plans/2026-05-25-cross-platform-mobile-linux.md).
```

- [ ] **Step 4: Validate docs formatting**

Run:

```powershell
git diff --check -- docs/MOBILE_QA.md docs/NATIVE_APPS.md docs/ROADMAP.md
```

Expected: no output and exit code `0`.

- [ ] **Step 5: Commit docs**

Run:

```powershell
git add docs/MOBILE_QA.md docs/NATIVE_APPS.md docs/ROADMAP.md
git commit -m "docs: document mobile qa and native app path" -m "Context:
- Android internal builds need a repeatable manual QA path.
- The project also needs a clear explanation of when native iOS and Android shells become worth building.

Changes:
- Added a mobile QA checklist covering launch, browse, reader, library, persistence, and platform behavior.
- Added the native app direction and shared Rust core extraction rule.
- Updated the roadmap with the approved cross-platform track and plan links.

Tests:
- git diff --check -- docs/MOBILE_QA.md docs/NATIVE_APPS.md docs/ROADMAP.md

Notes:
- Native SwiftUI and Jetpack Compose work remains gated on the Android Tauri spike."
```

---

### Task 9: Manual Desktop And Mobile Smoke

**Files:**
- Read only unless smoke finds defects.

- [ ] **Step 1: Run full automated checks**

Run:

```powershell
pnpm.cmd run check
$env:PATH="$env:USERPROFILE\.cargo\bin;$env:PATH"
cargo test --manifest-path src-tauri/Cargo.toml --locked
cargo clippy --manifest-path src-tauri/Cargo.toml --locked -- -D warnings
```

Expected: all commands pass.

- [ ] **Step 2: Run desktop app locally**

Run:

```powershell
pnpm.cmd run dev:tauri
```

Expected:

- App launches.
- Desktop titlebar controls are visible on desktop width.
- Left rail is visible on desktop width.
- Browse, Library, and Settings routes navigate.
- Manga and novel reader routes still load.

- [ ] **Step 3: Run Android app when tooling is present**

Run:

```powershell
pnpm.cmd run android:dev
```

Expected:

- App launches in emulator or connected device.
- Bottom navigation is visible.
- Desktop titlebar and desktop rail are hidden.
- Browse/title/reader/library flows pass the checks in `docs/MOBILE_QA.md`.

If Android tooling is not present, do not mark this smoke complete; record the missing prerequisite from Task 0/Task 7.

- [ ] **Step 4: Fix defects using the same TDD pattern**

For each defect:

1. Add a focused test that fails.
2. Run the focused test and confirm the failure.
3. Make the smallest code change that fixes the defect.
4. Run the focused test.
5. Run `pnpm.cmd run check` and Rust tests if Rust changed.
6. Commit with a detailed body.

Use the commit template from the top of this plan.

---

### Task 10: Final Review And Push

**Files:**
- Read only unless review finds a real issue.

- [ ] **Step 1: Dispatch review agents**

Ask three reviewers to inspect the final branch:

- Linux reviewer: workflow dependencies, Linux package path, WebKitGTK risk, titlebar behavior.
- Android/Tauri reviewer: mobile entrypoint, Vite host config, generated Android files, Android docs.
- UI reviewer: mobile shell, safe-area padding, touch controls, desktop regression risk.

Each reviewer should report:

- blockers
- correctness risks
- missing tests
- docs gaps
- commands they recommend before push

- [ ] **Step 2: Apply validated review fixes**

For each accepted finding:

1. Add or update a focused test when the finding is behavior-related.
2. Make the code/doc change.
3. Run the focused check.
4. Run the relevant full check.
5. Commit with a detailed commit body.

- [ ] **Step 3: Run final local verification**

Run:

```powershell
git status --short --branch
git log --oneline -5
git diff --check
pnpm.cmd run check
$env:PATH="$env:USERPROFILE\.cargo\bin;$env:PATH"
cargo test --manifest-path src-tauri/Cargo.toml --locked
cargo clippy --manifest-path src-tauri/Cargo.toml --locked -- -D warnings
```

Expected:

- `git diff --check` has no output.
- Frontend checks pass.
- Rust tests pass.
- Clippy passes.
- `git status --short --branch` shows committed local changes only when commits have not yet been pushed.

- [ ] **Step 4: Push to GitHub main**

Run:

```powershell
git push origin main
```

Expected: push succeeds.

- [ ] **Step 5: Inspect GitHub Actions result**

Run:

```powershell
git status --short --branch
git rev-parse --short HEAD
```

Expected:

- Local branch is aligned with `origin/main`.
- Final SHA is available for the user.

If the GitHub connector or `gh` is available during execution, inspect the latest workflow run. If neither is available, tell the user that local verification passed and remote CI should be checked on GitHub.

---

## Acceptance Criteria

- Windows and Linux CI workflow exists.
- Linux dependency and smoke docs exist.
- Manual/tag Linux bundle job asserts generated `.deb`, `.AppImage`, or `.rpm` files and uploads them as GitHub Actions artifacts.
- Vite honors `TAURI_DEV_HOST` and fixed HMR port `1421`.
- Android scripts exist in `package.json`.
- Tauri builder lives in `reading_lib::run()` and has `#[cfg_attr(mobile, tauri::mobile_entry_point)]`.
- Desktop binary delegates to `reading_lib::run()`.
- Mobile shell has bottom navigation.
- Desktop titlebar and left rail are hidden on mobile widths.
- Manga reader supports tap and swipe navigation in paginated mode.
- Novel reader uses mobile-first horizontal padding.
- Source capabilities are exposed in Rust and TypeScript.
- Android init/build is completed when local Android tooling exists, or the exact missing tooling is documented.
- Mobile QA and native app architecture docs exist.
- Full frontend and Rust checks pass before push.

## Self-Review Notes

- Spec coverage: Linux desktop, Android-first Tauri mobile, iOS prerequisite docs, native shared core path, source capability flags, and internal-first distribution are covered.
- Placeholder scan: no task relies on unspecified work; each behavior change names files, snippets, commands, and expected results.
- Type consistency: Rust `SourceCapabilities` mirrors TypeScript `SourceCapabilities`; IPC command name is `source_capabilities` and wrapper is `sourceCapabilities`.
