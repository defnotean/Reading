# Reading

A Windows desktop app that browses MangaDex (and soon NovelFire) and reads chapters aloud with on-device AI.

This is **Phase 1**: browse + library only. Audio comes in Phase 3.

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

See [`docs/superpowers/specs/2026-05-09-manga-novel-reader-design.md`](docs/superpowers/specs/2026-05-09-manga-novel-reader-design.md) for the full design and [`docs/superpowers/plans/2026-05-09-phase-1-foundation.md`](docs/superpowers/plans/2026-05-09-phase-1-foundation.md) for the Phase 1 implementation plan.
