# Reading Cross-Platform Mobile And Linux Design

> Status: Approved direction. Internal-first, Android-first, Option 3: Tauri mobile now, shared Rust core for future native apps.

## Goal

Make Reading viable beyond Windows without derailing the existing desktop reader work.

The first target is an internal Android build using Tauri mobile and the current React/Rust app. Linux desktop support is a parallel desktop compatibility track. iOS and custom native iOS/Android apps remain planned, but they should be built after the shared Rust core boundary is stable and after the Android Tauri spike proves the current product flows on real mobile hardware.

## Decisions

- **Distribution posture:** personal/internal testing first.
- **First mobile target:** Android.
- **Mobile approach now:** Tauri mobile with shared React UI and Rust backend.
- **Mobile approach later:** SwiftUI iOS and Jetpack Compose Android shells over a shared Rust core if the Tauri mobile experience or future audio/model needs justify native UI.
- **Linux approach:** make the existing Tauri desktop app build, package, and smoke-test on Linux.
- **Public stores:** deferred. App Store and Play Store policy work comes after internal builds prove the product.

## Why This Shape

Android can be started from the current Windows machine with Android Studio, Android SDK/NDK, and Rust Android targets. iOS requires macOS and Xcode, so it needs a later Mac or macOS CI lane.

Tauri mobile is the fastest way to validate the current app on phones because it keeps the React routes, Zustand stores, Tauri IPC wrappers, and Rust source/library/cache code intact. The current codebase is already close to that model: Rust owns durable logic, while TypeScript owns presentation.

Native apps are still the long-term escape hatch. Reading is a reader and future audio app, so native gestures, background audio, media controls, accessibility, storage, and on-device model integration may eventually matter more than single-UI velocity.

## Current Architecture To Preserve

The existing useful boundary is:

- `src-tauri/src/sources/mod.rs`: `Source` trait and content DTOs.
- `src-tauri/src/commands.rs`: Tauri IPC command surface.
- `src-tauri/src/db.rs`, `src-tauri/src/library.rs`, `src-tauri/src/cache.rs`, `src-tauri/src/http.rs`: local persistence, cache, and source-safe HTTP behavior.
- `src/types.ts`: frontend mirror of IPC payloads.
- `src/ipc/*.ts`: thin frontend command wrappers.

The cross-platform work should strengthen this boundary instead of spreading platform conditionals through feature code.

## Track 1: Linux Desktop

Linux should remain the same product as Windows: Tauri desktop, React frontend, Rust backend, SQLite library, cover cache, custom reader UI.

Required work:

- Add Linux setup docs to `README.md`.
- Add Linux CI for `pnpm check`, `cargo test`, and `cargo clippy`.
- Add Linux package validation for Tauri bundles.
- Install Tauri Linux dependencies in CI, including WebKitGTK, app indicator, librsvg, and packaging tools.
- Smoke-test startup, source browsing, cover cache asset loading, SQLite persistence, external URL opener behavior, and custom titlebar controls.

Risks:

- Linux uses WebKitGTK, not WebView2.
- `decorations: false` plus custom titlebar must be checked under GNOME/KDE and X11/Wayland.
- `tauri-plugin-opener` behavior depends on desktop opener integration.
- `bundle.targets = "all"` may surface AppImage/deb/rpm-specific packaging requirements.

## Track 2: Android-First Tauri Mobile

The Android spike should prove that the current manual reading app works on a real phone before the project commits to native mobile rewrites.

Required work:

- Move the Tauri builder into a shared `run()` function in `src-tauri/src/lib.rs`.
- Mark the shared runner with `#[cfg_attr(mobile, tauri::mobile_entry_point)]`.
- Keep desktop `src-tauri/src/main.rs` as a small call into `reading_lib::run()`.
- Initialize Android with the Tauri CLI.
- Configure Vite for mobile development with `TAURI_DEV_HOST`.
- Add Android-specific Tauri config where needed.
- Validate `tauri-plugin-opener` for external chapter URLs.
- Validate `rusqlite` with bundled SQLite on Android targets.
- Verify app data paths, cover cache paths, asset protocol scope, and progress writes on Android suspend/resume.

UI changes:

- Hide desktop titlebar/window controls on mobile.
- Replace the left rail with bottom navigation.
- Add safe-area padding.
- Convert hover/keyboard-only behaviors into touch controls.
- Add tap zones and swipe gestures in manga reader.
- Keep visible reader chrome for touch users instead of relying on mouse movement.
- Reduce wide desktop spacing in novel reader and settings.

Known constraints:

- Manual browsing and reading are the first target.
- Real audio, OCR, Kokoro, Florence, `ort`, and large model files are separate feasibility work.
- NovelFire/generic scraping may be blocked more often on mobile networks and may create future store-review risk.

## Track 3: Shared Rust Core For Native Apps

The future native architecture should extract reusable app logic without changing behavior.

Target shape:

```text
Reading/
  crates/
    reading-core/        # sources, HTTP, cache, db, library, DTOs, future fake/audio pipeline
    reading-ffi/         # later UniFFI or C ABI bindings for Swift/Kotlin
  src-tauri/             # desktop/mobile Tauri shell using reading-core
  src/                   # React UI for desktop and Tauri mobile
  apps/
    ios/                 # future SwiftUI shell
    android/             # future Jetpack Compose shell
```

The first extraction should be behavioral-preserving:

- No UI rewrite.
- No API redesign unless tests prove the existing boundary is leaky.
- Keep Tauri command DTOs versioned and mirrored in TypeScript.
- Add source capability flags so mobile/native clients can decide which features to show.

Native shells become worth building when one of these is true:

- Tauri mobile reader performance or touch UX is not good enough.
- Background audio/media controls require native behavior.
- Model loading or mobile AI needs native platform integration.
- Public store requirements force a more native presentation and source policy.

## Source And Policy Posture

Internal builds can validate the current sources, but the public-store version needs a stricter content posture.

Safer public direction later:

- Prefer API-backed and permitted sources.
- Treat user-pasted URLs as user-provided content.
- Avoid long-term redistribution of third-party chapter bodies/images unless rights are clear.
- Keep cache controls visible.
- Avoid public-store screenshots that show questionable copyrighted pages.
- Document source limitations and user responsibility clearly.

For now, public App Store and Google Play submission are out of scope.

## Build And Environment Notes

Official Tauri prerequisites say Android needs Android Studio, SDK platform/tools, NDK, build tools, command-line tools, `ANDROID_HOME`, `NDK_HOME`, `JAVA_HOME`, and Rust Android targets. iOS requires macOS with Xcode plus iOS Rust targets and CocoaPods.

Useful references:

- Tauri prerequisites: https://v2.tauri.app/start/prerequisites/
- Tauri CLI: https://v2.tauri.app/reference/cli/
- Tauri config: https://v2.tauri.app/reference/config/
- Tauri opener plugin: https://v2.tauri.app/plugin/opener/

## Testing Strategy

Linux:

- `pnpm check`
- `cargo test`
- `cargo clippy`
- `pnpm run build:tauri`
- Runtime smoke on Ubuntu with the built app.

Android internal:

- `pnpm check`
- Rust unit tests for shared backend code.
- Android build through Tauri CLI.
- Real-device smoke:
  - launch app
  - browse MangaDex
  - open title
  - open manga chapter
  - open NovelFire or generic URL when available
  - star title
  - resume Continue Reading
  - clear cache
  - rotate device
  - background and resume

iOS later:

- macOS runner or Mac development machine.
- iOS Tauri init/build.
- Simulator smoke first, physical device after signing is configured.

Native later:

- Shared Rust core tests must pass independently of Tauri.
- FFI tests prove Swift/Kotlin can call source/library/progress APIs.
- Native UI tests cover reader navigation and persistence.

## Rollout Plan

1. **Spec and roadmap update**
   Add this cross-platform track to project status.

2. **Linux baseline**
   Add Linux docs and CI before mobile churn grows.

3. **Android bootstrap**
   Add mobile entrypoint, Vite mobile host config, Android init, and a minimal internal APK build.

4. **Mobile UI adaptation**
   Bottom navigation, safe areas, touch reader controls, mobile settings layout.

5. **Android persistence/source validation**
   Verify SQLite, cache, source fetches, external opener, and suspend/resume.

6. **Shared core preparation**
   Extract or prepare `reading-core` only after the current IPC contract is stable and tested.

7. **iOS bootstrap**
   Use macOS/Xcode to initialize and build iOS after Android lessons are incorporated.

8. **Native app decision**
   Decide whether Tauri mobile is good enough or whether to start SwiftUI/Compose shells over `reading-core`.

## Non-Goals For The First Mobile Pass

- Public App Store or Google Play release.
- Account sync.
- Real Kokoro/Florence/distilbert mobile model packaging.
- Background audio playback.
- Native SwiftUI/Compose production apps.
- Replacing the current desktop UI.
- Rewriting source adapters.

## Acceptance Criteria

- Linux CI runs and Linux package build is documented.
- Android internal build can be produced from the repo.
- Android build launches on a device or emulator.
- Core browse/title/reader/library flows work on Android.
- Mobile UI is touch-first and does not expose desktop window controls.
- The codebase has a documented path toward `reading-core` and native apps.
- iOS requirements are documented with an explicit macOS/Xcode dependency.

