# Reading

A Windows desktop app for browsing and reading manga and web novels from MangaDex, NovelFire, ComicK, and best-effort pasted URLs.

Current status: **Phase 2 is shipped**. The app supports catalog browsing, title detail pages, a saved library, a Continue Reading carousel, manual manga and novel readers, keyboard shortcuts, reader settings, source tabs, and hardened source fetching. Audio narration is the next major phase.

See [docs/ROADMAP.md](docs/ROADMAP.md) for the current roadmap and phase status.

## Develop

Prereqs: Node 22 LTS, pnpm 10+, Rust 1.79+, Visual Studio Build Tools 2022 with the C++ workload, Windows 10/11.
Rust is required for Tauri development and for the backend test suite.

```powershell
pnpm install
pnpm run dev:tauri
```

## Tests

```powershell
# Frontend
pnpm test
pnpm run typecheck
pnpm run build

# Rust
cd src-tauri ; cargo test ; cd ..
```

Run the full frontend gate with:

```powershell
pnpm run check
```

## Build

```powershell
pnpm run build:tauri
```

Output is at `src-tauri/target/release/bundle/`.

## Project layout

See [`docs/superpowers/specs/2026-05-09-manga-novel-reader-design.md`](docs/superpowers/specs/2026-05-09-manga-novel-reader-design.md) for the full product design. The Phase 1 and Phase 2 plan files under [`docs/superpowers/plans`](docs/superpowers/plans) are historical implementation recipes with checked tasks marking shipped work; use [`docs/ROADMAP.md`](docs/ROADMAP.md) as the live status page.
