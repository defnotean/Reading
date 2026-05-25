# Linux Desktop Builds

Reading uses the same Tauri desktop app on Linux as it does on Windows.

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
  libgtk-3-dev \
  libfuse2 \
  patchelf
```

## Build And Test

```bash
pnpm install --frozen-lockfile
pnpm run check
cargo test --manifest-path src-tauri/Cargo.toml --locked
cargo clippy --manifest-path src-tauri/Cargo.toml --locked -- -D warnings
pnpm run build:tauri
```

## Smoke

- Launch the generated Linux bundle.
- Confirm the custom titlebar can drag, minimize, maximize, and close.
- Browse MangaDex, ComicK, and NovelFire.
- Open a title detail page.
- Open manga and novel reader routes.
- Confirm cover images load through the asset protocol.
- Star a title and restart the app.
- Confirm Continue Reading persists after restart.
- Open an external URL through the opener plugin when one is available.
