# iOS Setup

iOS builds require macOS with Xcode installed. They cannot be built from Windows or Linux.

## Prerequisites

- macOS with the current Xcode and Xcode command line tools
- Node.js and pnpm
- Rust with rustup
- CocoaPods

Install CocoaPods with Homebrew or RubyGems:

```bash
brew install cocoapods
# or
sudo gem install cocoapods
```

## Rust Targets

```bash
rustup target add aarch64-apple-ios aarch64-apple-ios-sim x86_64-apple-ios
```

## First Tauri iOS Commands

```bash
pnpm install --frozen-lockfile
pnpm tauri ios init
pnpm tauri ios dev
pnpm tauri ios build
```

Run `pnpm tauri ios init` once before starting simulator or device builds.

## Scope

The first iOS pass should validate launch, browse, reader, library, and progress persistence. Store submission, background audio, and native SwiftUI shell work remain outside the first Android-first internal pass.
