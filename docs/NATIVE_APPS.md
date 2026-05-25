# Native iOS And Android Direction

Reading is starting with Tauri mobile because it reuses the existing React UI and Rust backend. Native SwiftUI and Jetpack Compose shells remain a deliberate future path if native UI, background audio, media controls, accessibility, or model loading need platform-specific treatment.

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
- future audio, OCR, and model orchestration

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
4. Build a SwiftUI proof of concept for browse, title, and reader on macOS/Xcode.
5. Build a Jetpack Compose proof of concept for browse, title, and reader on Android Studio.
