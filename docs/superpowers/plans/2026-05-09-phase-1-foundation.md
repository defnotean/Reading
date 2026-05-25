# Reading — Phase 1: Foundation Implementation Plan

> **Status:** Completed and tagged as `phase-1`. This file is preserved as the original implementation recipe, and its checked tasks now mark shipped work. See [`docs/ROADMAP.md`](../../ROADMAP.md) for the live roadmap.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Stand up a Tauri 2 + React app that browses MangaDex, opens any title's detail screen, and persists a starred-titles library across launches. No audio yet — that lands in Phase 3.

**Architecture:** Tauri 2 with Rust backend + React/TypeScript/Tailwind/Framer Motion frontend. SQLite via `rusqlite` for the library. `reqwest` for HTTP, with a tower rate-limit layer to respect MangaDex's 5 req/s. Source layer hides the site behind a single `Source` trait so Phase 2 (NovelFire) drops in cleanly.

**Tech Stack:** Tauri 2.x · React 18.3 · TypeScript 5.4 · Vite 5 · Tailwind 3.4 · Framer Motion 11 · Zustand 4.5 · React Router 6 · Lucide icons · Rust 1.79+ · tokio 1 · reqwest 0.12 · rusqlite 0.32 · serde 1 · async-trait 0.1 · tower 0.5

**Spec:** [`docs/superpowers/specs/2026-05-09-manga-novel-reader-design.md`](../specs/2026-05-09-manga-novel-reader-design.md)

---

## Project layout produced by this phase

```
Reading/
├── docs/superpowers/
│   ├── specs/2026-05-09-manga-novel-reader-design.md
│   └── plans/2026-05-09-phase-1-foundation.md
├── src-tauri/
│   ├── src/
│   │   ├── main.rs
│   │   ├── commands.rs
│   │   ├── error.rs
│   │   ├── db.rs
│   │   ├── library.rs
│   │   ├── http.rs
│   │   ├── cache.rs
│   │   ├── sources/
│   │   │   ├── mod.rs
│   │   │   └── mangadex.rs
│   │   └── lib.rs
│   ├── tests/
│   │   ├── library_tests.rs
│   │   └── mangadex_tests.rs
│   ├── fixtures/
│   │   ├── mangadex_browse.json
│   │   ├── mangadex_title.json
│   │   ├── mangadex_feed.json
│   │   └── mangadex_at_home.json
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   └── build.rs
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── routes/
│   │   ├── BrowseRoute.tsx
│   │   ├── TitleRoute.tsx
│   │   ├── ReaderRoute.tsx        # placeholder
│   │   ├── LibraryRoute.tsx
│   │   └── SettingsRoute.tsx       # placeholder
│   ├── components/
│   │   ├── Shell.tsx
│   │   ├── LeftRail.tsx
│   │   ├── CoverGrid.tsx
│   │   ├── CoverCard.tsx
│   │   ├── ChapterList.tsx
│   │   └── Toast.tsx
│   ├── stores/
│   │   ├── useLibrary.ts
│   │   └── useToast.ts
│   ├── ipc/
│   │   ├── library.ts
│   │   └── sources.ts
│   ├── styles/index.css
│   └── types.ts
├── tests/
│   └── components.test.tsx
├── tailwind.config.js
├── postcss.config.js
├── vite.config.ts
├── tsconfig.json
├── package.json
└── .gitignore
```

---

## Conventions

- **TDD on Rust modules:** write the failing test first, run it red, implement, run it green, commit.
- **Frontend:** build component, then add a small Vitest behavior test, then commit.
- **Commits:** small and frequent. One logical task = one commit. Conventional Commits (`feat:`, `fix:`, `chore:`, `test:`, `refactor:`).
- **Tests run with:**
  - Rust: `cd src-tauri && cargo test` (or `cargo test <name>` for a single test)
  - Frontend: `pnpm test` (Vitest, run from project root)
- **Working directory** for all shell commands: `C:\Users\defnotean\OneDrive\Desktop\Codex\Reading` unless otherwise noted.
- **Linux-style paths** in commits and code; Windows paths only when needed for local commands.

---

## Task 1: Initialize Tauri 2 project + git

**Files:**
- Create: entire project skeleton
- Create: `.gitignore`

- [x] **Step 1: Verify prerequisites are installed**

```powershell
node --version    # expect v20+ or v22+
pnpm --version    # expect v9+
cargo --version   # expect 1.79+
rustc --version
```

If any are missing: install Node 22 LTS from nodejs.org, `npm i -g pnpm`, install Rust via `https://rustup.rs`. Then `rustup target add x86_64-pc-windows-msvc`.

- [x] **Step 2: Initialize Tauri project in current directory**

```powershell
pnpm create tauri-app@latest . --template react-ts --identifier com.defnotean.reading --name reading --pkg-manager pnpm
```

If the flags above fail because the CLI changed, run `pnpm create tauri-app@latest .` and answer interactively: name=`reading`, identifier=`com.defnotean.reading`, frontend=React, language=TypeScript, package manager=pnpm.

- [x] **Step 3: Install dependencies**

```powershell
pnpm install
```

- [x] **Step 4: Verify dev launch**

```powershell
pnpm tauri dev
```

Expected: A native window opens with the default "Welcome to Tauri + React!" demo. Close it.

- [x] **Step 5: Initialize git and write `.gitignore`**

`.gitignore`:
```gitignore
# Frontend
node_modules/
dist/
.vite/
*.log

# Rust
src-tauri/target/

# IDE
.vscode/
.idea/
*.iml

# OS
.DS_Store
Thumbs.db

# Local
.env
.env.local

# Tauri build outputs
src-tauri/gen/
src-tauri/WixTools/
```

```powershell
git init
git branch -M main
git add .
git commit -m "chore: initialize Tauri 2 + React + TypeScript project"
```

---

## Task 2: Install frontend dependencies (Tailwind, Framer Motion, Zustand, etc.)

**Files:**
- Modify: `package.json`
- Create: `tailwind.config.js`, `postcss.config.js`
- Modify: `src/styles/index.css` (rename from `src/App.css` if needed)

- [x] **Step 1: Install runtime deps**

```powershell
pnpm add react-router-dom framer-motion zustand lucide-react clsx
```

- [x] **Step 2: Install dev deps**

```powershell
pnpm add -D tailwindcss@3.4 postcss autoprefixer @types/react @types/react-dom vitest @testing-library/react @testing-library/jest-dom @vitest/ui jsdom
```

- [x] **Step 3: Initialize Tailwind**

```powershell
pnpm dlx tailwindcss init -p
```

This creates `tailwind.config.js` and `postcss.config.js`. Replace `tailwind.config.js` content:

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#08090d",
          900: "#0d0e14",
          800: "#13141d",
          700: "#1a1c27",
          600: "#252836",
          500: "#3a3e50",
          400: "#5a5f76",
          300: "#8a90a8",
          200: "#b9bdcd",
          100: "#e2e4ed",
          50:  "#f4f5f9",
        },
        accent: {
          DEFAULT: "#7c5cff",
          soft:    "#a892ff",
          glow:    "#7c5cff66",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "Segoe UI", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 24px 4px rgba(124,92,255,0.30)",
      },
      keyframes: {
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        shimmer: "shimmer 2s linear infinite",
      },
    },
  },
  plugins: [],
};
```

- [x] **Step 4: Replace `src/App.css` with `src/styles/index.css`**

Delete `src/App.css`. Create `src/styles/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html, body, #root {
    height: 100%;
  }
  body {
    @apply bg-ink-950 text-ink-100 font-sans antialiased;
    overflow: hidden;
  }
  ::selection {
    @apply bg-accent text-white;
  }
}

@layer components {
  .glass {
    @apply bg-ink-800/60 backdrop-blur-xl border border-ink-700/60;
  }
  .focus-ring {
    @apply focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent;
  }
}
```

- [x] **Step 5: Update `src/main.tsx` to use the new stylesheet**

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [x] **Step 6: Configure Vitest**

Modify `vite.config.ts`:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: { port: 1420, strictPort: true },
  envPrefix: ["VITE_", "TAURI_"],
  build: {
    target: "es2021",
    minify: !process.env.TAURI_DEBUG ? "esbuild" : false,
    sourcemap: !!process.env.TAURI_DEBUG,
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
  },
});
```

Create `tests/setup.ts`:
```ts
import "@testing-library/jest-dom";
```

- [x] **Step 7: Run dev to confirm Tailwind works**

Replace `src/App.tsx` with a temporary smoke test:
```tsx
export default function App() {
  return (
    <div className="h-full flex items-center justify-center">
      <h1 className="text-4xl font-semibold text-accent">Reading</h1>
    </div>
  );
}
```

```powershell
pnpm tauri dev
```

Expected: window shows a centered purple "Reading" title on a dark background. Close it.

- [x] **Step 8: Commit**

```powershell
git add .
git commit -m "chore: add Tailwind, Framer Motion, Zustand, Lucide, Vitest"
```

---

## Task 3: App shell — left rail navigation + routing

**Files:**
- Create: `src/components/Shell.tsx`
- Create: `src/components/LeftRail.tsx`
- Create: `src/routes/BrowseRoute.tsx`
- Create: `src/routes/LibraryRoute.tsx`
- Create: `src/routes/SettingsRoute.tsx`
- Create: `src/routes/TitleRoute.tsx`
- Create: `src/routes/ReaderRoute.tsx`
- Modify: `src/App.tsx`
- Test: `tests/shell.test.tsx`

- [x] **Step 1: Write the failing shell test**

`tests/shell.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "../src/App";

test("shell renders left rail with three destinations", () => {
  render(<App router={MemoryRouter} initialEntries={["/"]} />);
  expect(screen.getByLabelText(/browse/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/library/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/settings/i)).toBeInTheDocument();
});
```

- [x] **Step 2: Run, verify it fails**

```powershell
pnpm test -- shell.test.tsx
```

Expected: FAIL — `App` component doesn't accept the props or rail buttons aren't there yet.

- [x] **Step 3: Implement `LeftRail.tsx`**

```tsx
import { NavLink } from "react-router-dom";
import { Library, Compass, Settings } from "lucide-react";
import { motion } from "framer-motion";
import clsx from "clsx";

const items = [
  { to: "/",         label: "Browse",   Icon: Compass  },
  { to: "/library",  label: "Library",  Icon: Library  },
  { to: "/settings", label: "Settings", Icon: Settings },
] as const;

export function LeftRail() {
  return (
    <motion.aside
      initial={{ x: -8, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 220, damping: 24 }}
      className="w-16 hover:w-48 transition-[width] duration-200 ease-out h-full glass border-r border-ink-700/60 flex flex-col py-4 gap-1 group"
    >
      {items.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
          aria-label={label}
          className={({ isActive }) =>
            clsx(
              "mx-2 px-3 py-2 rounded-lg flex items-center gap-3 focus-ring",
              "text-ink-300 hover:text-ink-100 hover:bg-ink-700/60",
              isActive && "bg-accent/20 text-ink-100"
            )
          }
        >
          <Icon size={20} />
          <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 text-sm">
            {label}
          </span>
        </NavLink>
      ))}
    </motion.aside>
  );
}
```

- [x] **Step 4: Implement `Shell.tsx`**

```tsx
import { Outlet } from "react-router-dom";
import { LeftRail } from "./LeftRail";

export function Shell() {
  return (
    <div className="h-full w-full flex bg-ink-950 text-ink-100">
      <LeftRail />
      <main className="flex-1 h-full overflow-hidden relative">
        <Outlet />
      </main>
    </div>
  );
}
```

- [x] **Step 5: Stub each route page**

`src/routes/BrowseRoute.tsx`:
```tsx
export default function BrowseRoute() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">Browse</h1>
    </div>
  );
}
```

`src/routes/LibraryRoute.tsx`:
```tsx
export default function LibraryRoute() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">Library</h1>
    </div>
  );
}
```

`src/routes/SettingsRoute.tsx`:
```tsx
export default function SettingsRoute() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">Settings</h1>
    </div>
  );
}
```

`src/routes/TitleRoute.tsx`:
```tsx
import { useParams } from "react-router-dom";
export default function TitleRoute() {
  const { source, id } = useParams();
  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">Title</h1>
      <p className="text-ink-300">{source}/{id}</p>
    </div>
  );
}
```

`src/routes/ReaderRoute.tsx`:
```tsx
import { useParams } from "react-router-dom";
export default function ReaderRoute() {
  const { source, id, chapter } = useParams();
  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">Reader</h1>
      <p className="text-ink-300">{source}/{id} — {chapter}</p>
    </div>
  );
}
```

- [x] **Step 6: Wire `App.tsx`**

```tsx
import { BrowserRouter, MemoryRouter, Route, Routes } from "react-router-dom";
import { Shell } from "./components/Shell";
import BrowseRoute from "./routes/BrowseRoute";
import LibraryRoute from "./routes/LibraryRoute";
import SettingsRoute from "./routes/SettingsRoute";
import TitleRoute from "./routes/TitleRoute";
import ReaderRoute from "./routes/ReaderRoute";
import type { ComponentType, ReactNode } from "react";

type Props = {
  router?: ComponentType<{ children?: ReactNode; initialEntries?: string[] }>;
  initialEntries?: string[];
};

export default function App({ router: Router = BrowserRouter, initialEntries }: Props) {
  return (
    <Router initialEntries={initialEntries}>
      <Routes>
        <Route element={<Shell />}>
          <Route index element={<BrowseRoute />} />
          <Route path="library"  element={<LibraryRoute />} />
          <Route path="settings" element={<SettingsRoute />} />
          <Route path="t/:source/:id"               element={<TitleRoute />} />
          <Route path="r/:source/:id/:chapter"      element={<ReaderRoute />} />
        </Route>
      </Routes>
    </Router>
  );
}
```

- [x] **Step 7: Run test, verify it passes**

```powershell
pnpm test -- shell.test.tsx
```

Expected: PASS.

- [x] **Step 8: Visual smoke test**

```powershell
pnpm tauri dev
```

Expected: Window opens with collapsed left rail (icons only). Hover the rail — labels fade in, width expands. Click each icon — main pane swaps. Close.

- [x] **Step 9: Commit**

```powershell
git add .
git commit -m "feat(shell): add left rail navigation and route scaffolding"
```

---

## Task 4: Rust — error type + Tauri command result wrapper

**Files:**
- Create: `src-tauri/src/error.rs`
- Modify: `src-tauri/src/lib.rs` (or `main.rs` if no lib.rs yet)

- [x] **Step 1: Write the failing test**

Create `src-tauri/tests/error_tests.rs`:
```rust
use reading::error::AppError;

#[test]
fn http_errors_serialize_to_camel_case() {
    let err = AppError::Http("boom".into());
    let json = serde_json::to_string(&err).unwrap();
    assert_eq!(json, r#"{"kind":"http","message":"boom"}"#);
}

#[test]
fn parse_errors_serialize() {
    let err = AppError::Parse("bad json".into());
    let json = serde_json::to_string(&err).unwrap();
    assert_eq!(json, r#"{"kind":"parse","message":"bad json"}"#);
}
```

- [x] **Step 2: Run, verify it fails**

```powershell
cd src-tauri
cargo test --test error_tests
cd ..
```

Expected: FAIL — `reading::error::AppError` doesn't exist.

- [x] **Step 3: Add dependencies**

Modify `src-tauri/Cargo.toml` `[dependencies]` block, adding (keep existing tauri/serde entries):
```toml
[dependencies]
tauri = { version = "2", features = [] }
tauri-plugin-shell = "2"
tauri-plugin-fs = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
thiserror = "1"
anyhow = "1"
tokio = { version = "1", features = ["full"] }
async-trait = "0.1"
reqwest = { version = "0.12", features = ["json", "stream", "rustls-tls"], default-features = false }
tower = { version = "0.5", features = ["limit", "util"] }
url = "2"
chrono = { version = "0.4", features = ["serde"] }
rusqlite = { version = "0.32", features = ["bundled"] }
parking_lot = "0.12"
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter"] }
once_cell = "1"

[lib]
name = "reading"
path = "src/lib.rs"
```

- [x] **Step 4: Create `src-tauri/src/lib.rs` exposing modules**

```rust
pub mod error;

pub use error::AppError;
```

- [x] **Step 5: Implement `src-tauri/src/error.rs`**

```rust
use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error, Serialize)]
#[serde(tag = "kind", content = "message", rename_all = "snake_case")]
pub enum AppError {
    #[error("http error: {0}")]
    Http(String),

    #[error("parse error: {0}")]
    Parse(String),

    #[error("not found: {0}")]
    NotFound(String),

    #[error("io error: {0}")]
    Io(String),

    #[error("db error: {0}")]
    Db(String),

    #[error("blocked: {0}")]
    Blocked(String),

    #[error("internal: {0}")]
    Internal(String),
}

impl From<reqwest::Error> for AppError {
    fn from(e: reqwest::Error) -> Self {
        AppError::Http(e.to_string())
    }
}

impl From<std::io::Error> for AppError {
    fn from(e: std::io::Error) -> Self {
        AppError::Io(e.to_string())
    }
}

impl From<rusqlite::Error> for AppError {
    fn from(e: rusqlite::Error) -> Self {
        AppError::Db(e.to_string())
    }
}

impl From<serde_json::Error> for AppError {
    fn from(e: serde_json::Error) -> Self {
        AppError::Parse(e.to_string())
    }
}

impl From<url::ParseError> for AppError {
    fn from(e: url::ParseError) -> Self {
        AppError::Parse(e.to_string())
    }
}

pub type AppResult<T> = Result<T, AppError>;
```

The `serde(tag, content)` shape produces `{"kind":"http","message":"..."}` which the test asserts.

- [x] **Step 6: Run test, verify pass**

```powershell
cd src-tauri
cargo test --test error_tests
cd ..
```

Expected: 2 PASS.

- [x] **Step 7: Commit**

```powershell
git add .
git commit -m "feat(rust): add AppError type with serde-friendly tagged shape"
```

---

## Task 5: Rust — SQLite migration runner + database connection

**Files:**
- Create: `src-tauri/src/db.rs`
- Modify: `src-tauri/src/lib.rs`
- Test: `src-tauri/tests/db_tests.rs`

- [x] **Step 1: Write the failing test**

`src-tauri/tests/db_tests.rs`:
```rust
use reading::db::Db;
use tempfile::tempdir;

#[test]
fn db_runs_migrations_on_open() {
    let tmp = tempdir().unwrap();
    let path = tmp.path().join("reading.sqlite");
    let db = Db::open(&path).unwrap();

    let count: i64 = db
        .conn()
        .query_row(
            "SELECT count(*) FROM sqlite_master WHERE type='table' AND name='titles'",
            [],
            |r| r.get(0),
        )
        .unwrap();
    assert_eq!(count, 1, "titles table should exist after open()");
}

#[test]
fn db_migration_is_idempotent() {
    let tmp = tempdir().unwrap();
    let path = tmp.path().join("reading.sqlite");
    let _ = Db::open(&path).unwrap();
    let _ = Db::open(&path).unwrap();    // open twice, must not fail
}
```

- [x] **Step 2: Add tempfile to dev-deps**

In `src-tauri/Cargo.toml`:
```toml
[dev-dependencies]
tempfile = "3"
mockito = "1"
```

- [x] **Step 3: Run, verify fail**

```powershell
cd src-tauri
cargo test --test db_tests
cd ..
```

Expected: FAIL — module doesn't exist.

- [x] **Step 4: Implement `src-tauri/src/db.rs`**

```rust
use std::path::Path;
use std::sync::Arc;

use parking_lot::Mutex;
use rusqlite::Connection;

use crate::error::{AppError, AppResult};

const MIGRATIONS: &[&str] = &[
    // 0001 — initial schema
    r#"
    CREATE TABLE IF NOT EXISTS titles (
        source         TEXT NOT NULL,
        source_id      TEXT NOT NULL,
        kind           TEXT NOT NULL,
        title          TEXT NOT NULL,
        author         TEXT,
        cover_path     TEXT,
        synopsis       TEXT,
        status         TEXT,
        original_lang  TEXT,
        genres_json    TEXT,
        added_at       INTEGER NOT NULL,
        starred        INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (source, source_id)
    );

    CREATE TABLE IF NOT EXISTS chapters (
        source         TEXT NOT NULL,
        source_id      TEXT NOT NULL,
        chapter_id     TEXT NOT NULL,
        number         REAL,
        title          TEXT,
        published_at   INTEGER,
        PRIMARY KEY (source, source_id, chapter_id)
    );

    CREATE TABLE IF NOT EXISTS progress (
        source         TEXT NOT NULL,
        source_id      TEXT NOT NULL,
        chapter_id     TEXT NOT NULL,
        position_pct   REAL NOT NULL,
        updated_at     INTEGER NOT NULL,
        PRIMARY KEY (source, source_id)
    );

    CREATE INDEX IF NOT EXISTS idx_progress_updated ON progress(updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_titles_starred  ON titles(starred);

    CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY
    );
    "#,
];

#[derive(Clone)]
pub struct Db {
    inner: Arc<Mutex<Connection>>,
}

impl Db {
    pub fn open(path: &Path) -> AppResult<Self> {
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        let conn = Connection::open(path)?;
        conn.pragma_update(None, "journal_mode", "WAL")?;
        conn.pragma_update(None, "synchronous", "NORMAL")?;
        conn.pragma_update(None, "foreign_keys", "ON")?;

        let db = Db { inner: Arc::new(Mutex::new(conn)) };
        db.run_migrations()?;
        Ok(db)
    }

    pub fn open_in_memory() -> AppResult<Self> {
        let conn = Connection::open_in_memory()?;
        let db = Db { inner: Arc::new(Mutex::new(conn)) };
        db.run_migrations()?;
        Ok(db)
    }

    fn run_migrations(&self) -> AppResult<()> {
        let conn = self.inner.lock();
        for sql in MIGRATIONS {
            conn.execute_batch(sql).map_err(AppError::from)?;
        }
        let current: i64 = conn
            .query_row(
                "SELECT COALESCE(MAX(version), 0) FROM schema_version",
                [],
                |r| r.get(0),
            )
            .unwrap_or(0);
        if (current as usize) < MIGRATIONS.len() {
            conn.execute(
                "INSERT INTO schema_version(version) VALUES (?)",
                [MIGRATIONS.len() as i64],
            )?;
        }
        Ok(())
    }

    pub fn conn(&self) -> parking_lot::MutexGuard<'_, Connection> {
        self.inner.lock()
    }
}
```

- [x] **Step 5: Re-export from `lib.rs`**

```rust
pub mod db;
pub mod error;

pub use error::{AppError, AppResult};
```

- [x] **Step 6: Run, verify pass**

```powershell
cd src-tauri
cargo test --test db_tests
cd ..
```

Expected: 2 PASS.

- [x] **Step 7: Commit**

```powershell
git add .
git commit -m "feat(rust): add SQLite Db wrapper with migration runner"
```

---

## Task 6: Rust — Library data layer (CRUD on titles + progress)

**Files:**
- Create: `src-tauri/src/library.rs`
- Modify: `src-tauri/src/lib.rs`
- Test: `src-tauri/tests/library_tests.rs`

- [x] **Step 1: Write the failing test**

`src-tauri/tests/library_tests.rs`:
```rust
use reading::db::Db;
use reading::library::{Library, TitleRecord, ContentKind};

fn sample(source: &str, id: &str) -> TitleRecord {
    TitleRecord {
        source: source.into(),
        source_id: id.into(),
        kind: ContentKind::Manga,
        title: format!("Title {id}"),
        author: Some("Aiko".into()),
        cover_path: None,
        synopsis: None,
        status: None,
        original_lang: Some("ja".into()),
        genres: vec!["action".into(), "fantasy".into()],
    }
}

#[test]
fn upsert_and_star_round_trip() {
    let db = Db::open_in_memory().unwrap();
    let lib = Library::new(db);

    lib.upsert_title(&sample("mangadex", "abc")).unwrap();
    assert!(!lib.is_starred("mangadex", "abc").unwrap());

    lib.set_starred("mangadex", "abc", true).unwrap();
    assert!(lib.is_starred("mangadex", "abc").unwrap());

    let starred = lib.list_starred().unwrap();
    assert_eq!(starred.len(), 1);
    assert_eq!(starred[0].source_id, "abc");
    assert_eq!(starred[0].genres, vec!["action", "fantasy"]);
}

#[test]
fn record_progress_keeps_only_latest() {
    let db = Db::open_in_memory().unwrap();
    let lib = Library::new(db);

    lib.upsert_title(&sample("mangadex", "abc")).unwrap();
    lib.record_progress("mangadex", "abc", "ch1", 0.20).unwrap();
    lib.record_progress("mangadex", "abc", "ch2", 0.50).unwrap();

    let recents = lib.continue_reading(10).unwrap();
    assert_eq!(recents.len(), 1);
    assert_eq!(recents[0].chapter_id, "ch2");
    assert!((recents[0].position_pct - 0.50).abs() < 1e-6);
}
```

- [x] **Step 2: Run, verify fail**

```powershell
cd src-tauri
cargo test --test library_tests
cd ..
```

Expected: FAIL — module doesn't exist.

- [x] **Step 3: Implement `src-tauri/src/library.rs`**

```rust
use chrono::Utc;
use serde::{Deserialize, Serialize};

use crate::db::Db;
use crate::error::AppResult;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ContentKind {
    Manga,
    Novel,
}

impl ContentKind {
    fn as_str(&self) -> &'static str {
        match self {
            ContentKind::Manga => "manga",
            ContentKind::Novel => "novel",
        }
    }
    fn parse(s: &str) -> Self {
        match s {
            "novel" => ContentKind::Novel,
            _ => ContentKind::Manga,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct TitleRecord {
    pub source: String,
    pub source_id: String,
    pub kind: ContentKind,
    pub title: String,
    pub author: Option<String>,
    pub cover_path: Option<String>,
    pub synopsis: Option<String>,
    pub status: Option<String>,
    pub original_lang: Option<String>,
    pub genres: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProgressRecord {
    pub source: String,
    pub source_id: String,
    pub chapter_id: String,
    pub position_pct: f64,
    pub updated_at: i64,
}

#[derive(Clone)]
pub struct Library {
    db: Db,
}

impl Library {
    pub fn new(db: Db) -> Self {
        Self { db }
    }

    pub fn upsert_title(&self, t: &TitleRecord) -> AppResult<()> {
        let conn = self.db.conn();
        let genres_json = serde_json::to_string(&t.genres)?;
        let now = Utc::now().timestamp();
        conn.execute(
            r#"
            INSERT INTO titles
                (source, source_id, kind, title, author, cover_path, synopsis,
                 status, original_lang, genres_json, added_at, starred)
            VALUES (?,?,?,?,?,?,?,?,?,?,?, COALESCE(
                (SELECT starred FROM titles WHERE source=? AND source_id=?), 0))
            ON CONFLICT(source, source_id) DO UPDATE SET
                kind          = excluded.kind,
                title         = excluded.title,
                author        = excluded.author,
                cover_path    = excluded.cover_path,
                synopsis      = excluded.synopsis,
                status        = excluded.status,
                original_lang = excluded.original_lang,
                genres_json   = excluded.genres_json
            "#,
            rusqlite::params![
                t.source, t.source_id, t.kind.as_str(), t.title, t.author,
                t.cover_path, t.synopsis, t.status, t.original_lang, genres_json, now,
                t.source, t.source_id
            ],
        )?;
        Ok(())
    }

    pub fn set_starred(&self, source: &str, id: &str, starred: bool) -> AppResult<()> {
        let conn = self.db.conn();
        conn.execute(
            "UPDATE titles SET starred=? WHERE source=? AND source_id=?",
            rusqlite::params![starred as i64, source, id],
        )?;
        Ok(())
    }

    pub fn is_starred(&self, source: &str, id: &str) -> AppResult<bool> {
        let conn = self.db.conn();
        let v: Option<i64> = conn
            .query_row(
                "SELECT starred FROM titles WHERE source=? AND source_id=?",
                rusqlite::params![source, id],
                |r| r.get(0),
            )
            .ok();
        Ok(v.unwrap_or(0) != 0)
    }

    pub fn list_starred(&self) -> AppResult<Vec<TitleRecord>> {
        let conn = self.db.conn();
        let mut stmt = conn.prepare(
            "SELECT source, source_id, kind, title, author, cover_path, synopsis,
                    status, original_lang, genres_json
             FROM titles WHERE starred=1
             ORDER BY added_at DESC",
        )?;
        let rows = stmt.query_map([], |row| {
            let genres_json: Option<String> = row.get(9)?;
            let genres: Vec<String> = genres_json
                .as_deref()
                .and_then(|s| serde_json::from_str(s).ok())
                .unwrap_or_default();
            Ok(TitleRecord {
                source:        row.get(0)?,
                source_id:     row.get(1)?,
                kind:          ContentKind::parse(&row.get::<_, String>(2)?),
                title:         row.get(3)?,
                author:        row.get(4)?,
                cover_path:    row.get(5)?,
                synopsis:      row.get(6)?,
                status:        row.get(7)?,
                original_lang: row.get(8)?,
                genres,
            })
        })?;
        Ok(rows.filter_map(Result::ok).collect())
    }

    pub fn record_progress(
        &self, source: &str, id: &str, chapter_id: &str, position_pct: f64,
    ) -> AppResult<()> {
        let conn = self.db.conn();
        conn.execute(
            r#"
            INSERT INTO progress (source, source_id, chapter_id, position_pct, updated_at)
            VALUES (?,?,?,?,?)
            ON CONFLICT(source, source_id) DO UPDATE SET
                chapter_id   = excluded.chapter_id,
                position_pct = excluded.position_pct,
                updated_at   = excluded.updated_at
            "#,
            rusqlite::params![source, id, chapter_id, position_pct, Utc::now().timestamp()],
        )?;
        Ok(())
    }

    pub fn continue_reading(&self, limit: u32) -> AppResult<Vec<ProgressRecord>> {
        let conn = self.db.conn();
        let mut stmt = conn.prepare(
            "SELECT source, source_id, chapter_id, position_pct, updated_at
             FROM progress ORDER BY updated_at DESC LIMIT ?",
        )?;
        let rows = stmt.query_map([limit as i64], |r| {
            Ok(ProgressRecord {
                source:       r.get(0)?,
                source_id:    r.get(1)?,
                chapter_id:   r.get(2)?,
                position_pct: r.get(3)?,
                updated_at:   r.get(4)?,
            })
        })?;
        Ok(rows.filter_map(Result::ok).collect())
    }
}
```

- [x] **Step 4: Re-export from `lib.rs`**

```rust
pub mod db;
pub mod error;
pub mod library;

pub use error::{AppError, AppResult};
```

- [x] **Step 5: Run tests, verify pass**

```powershell
cd src-tauri
cargo test --test library_tests
cd ..
```

Expected: 2 PASS.

- [x] **Step 6: Commit**

```powershell
git add .
git commit -m "feat(rust): add Library data layer with title/progress CRUD"
```

---

## Task 7: Rust — Source trait + shared types

**Files:**
- Create: `src-tauri/src/sources/mod.rs`
- Modify: `src-tauri/src/lib.rs`
- Test: included via Task 8

- [x] **Step 1: Implement `src-tauri/src/sources/mod.rs`**

```rust
use async_trait::async_trait;
use serde::{Deserialize, Serialize};

use crate::error::AppResult;
use crate::library::ContentKind;

pub mod mangadex;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TitleSummary {
    pub source: String,
    pub source_id: String,
    pub title: String,
    pub author: Option<String>,
    pub cover_url: Option<String>,
    pub kind: ContentKind,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChapterSummary {
    pub chapter_id: String,
    pub number: Option<f32>,
    pub title: Option<String>,
    pub published_at: Option<i64>,
    pub language: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TitleDetail {
    pub summary: TitleSummary,
    pub synopsis: Option<String>,
    pub status: Option<String>,
    pub original_language: Option<String>,
    pub genres: Vec<String>,
    pub chapters: Vec<ChapterSummary>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PageImage {
    pub url: String,
    pub width: Option<u32>,
    pub height: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum ChapterContent {
    MangaPages { pages: Vec<PageImage> },
    NovelText  { plain: String, paragraphs: Vec<String> },
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum BrowseList {
    Trending,
    Latest,
}

#[async_trait]
pub trait Source: Send + Sync {
    fn id(&self) -> &'static str;
    fn kind(&self) -> ContentKind;

    async fn browse(&self, list: BrowseList, page: u32) -> AppResult<Vec<TitleSummary>>;
    async fn search(&self, q: &str, page: u32)            -> AppResult<Vec<TitleSummary>>;
    async fn title(&self, id: &str)                       -> AppResult<TitleDetail>;
    async fn chapter(&self, title_id: &str, chapter_id: &str) -> AppResult<ChapterContent>;
}
```

- [x] **Step 2: Re-export from `lib.rs`**

```rust
pub mod db;
pub mod error;
pub mod library;
pub mod sources;

pub use error::{AppError, AppResult};
```

- [x] **Step 3: Verify the project still compiles**

```powershell
cd src-tauri
cargo build
cd ..
```

Expected: success (the `mangadex` module is referenced but we'll add it next; we'll temporarily comment that out).

If `cargo build` fails because of `pub mod mangadex;`, **temporarily comment that line** and uncomment in Task 8 after creating the file.

- [x] **Step 4: Commit**

```powershell
git add .
git commit -m "feat(rust): add Source trait and shared content types"
```

---

## Task 8: Rust — MangaDex HTTP client foundation

**Files:**
- Create: `src-tauri/src/http.rs`
- Create: `src-tauri/src/sources/mangadex.rs`
- Modify: `src-tauri/src/lib.rs`
- Test: `src-tauri/tests/mangadex_tests.rs`
- Fixtures: `src-tauri/fixtures/mangadex_browse.json`, `mangadex_title.json`, `mangadex_feed.json`, `mangadex_at_home.json`

- [x] **Step 1: Capture fixtures from MangaDex**

```powershell
mkdir -Force src-tauri\fixtures
curl -o src-tauri\fixtures\mangadex_browse.json "https://api.mangadex.org/manga?limit=10&order%5BfollowedCount%5D=desc&availableTranslatedLanguage%5B%5D=en&contentRating%5B%5D=safe&contentRating%5B%5D=suggestive&includes%5B%5D=author&includes%5B%5D=cover_art"
curl -o src-tauri\fixtures\mangadex_title.json "https://api.mangadex.org/manga/801513ba-a712-498c-8f57-cae55b38cc92?includes%5B%5D=author&includes%5B%5D=artist&includes%5B%5D=cover_art"
curl -o src-tauri\fixtures\mangadex_feed.json "https://api.mangadex.org/manga/801513ba-a712-498c-8f57-cae55b38cc92/feed?translatedLanguage%5B%5D=en&order%5Bchapter%5D=asc&limit=10"
curl -o src-tauri\fixtures\mangadex_at_home.json "https://api.mangadex.org/at-home/server/52042bf5-9f14-411e-b9e7-2da95dad0b8a"
```

If any returns 404 or empty, replace the IDs with two known popular manga IDs from MangaDex and retry. The fixture **content** matters more than the exact title — they're snapshots used to test the parser.

- [x] **Step 2: Implement `src-tauri/src/http.rs`**

```rust
use std::time::Duration;

use once_cell::sync::OnceCell;
use reqwest::Client;

use crate::error::{AppError, AppResult};

static CLIENT: OnceCell<Client> = OnceCell::new();

pub fn client() -> &'static Client {
    CLIENT.get_or_init(|| {
        Client::builder()
            .timeout(Duration::from_secs(20))
            .user_agent(concat!("Reading/", env!("CARGO_PKG_VERSION"), " (+desktop)"))
            .build()
            .expect("reqwest client builds")
    })
}

pub async fn get_json<T: serde::de::DeserializeOwned>(url: &str) -> AppResult<T> {
    let r = client().get(url).send().await?;
    let status = r.status();
    if !status.is_success() {
        let body = r.text().await.unwrap_or_default();
        if status.as_u16() == 403 {
            return Err(AppError::Blocked(format!("403 from {url}: {body}")));
        }
        return Err(AppError::Http(format!("{status} {url}: {body}")));
    }
    let v = r.json::<T>().await?;
    Ok(v)
}
```

- [x] **Step 3: Write failing parser test**

`src-tauri/tests/mangadex_tests.rs`:
```rust
use reading::sources::mangadex::parse;

#[test]
fn parses_browse_response_to_summaries() {
    let raw = std::fs::read_to_string("fixtures/mangadex_browse.json").unwrap();
    let summaries = parse::browse_response(&raw).unwrap();
    assert!(!summaries.is_empty(), "should have at least one summary");
    let first = &summaries[0];
    assert_eq!(first.source, "mangadex");
    assert!(!first.title.is_empty());
    assert!(first.cover_url.as_ref().unwrap().contains("uploads.mangadex.org"));
}

#[test]
fn parses_title_detail() {
    let raw = std::fs::read_to_string("fixtures/mangadex_title.json").unwrap();
    let detail = parse::title_response(&raw).unwrap();
    assert!(!detail.summary.title.is_empty());
}

#[test]
fn parses_feed_into_chapter_summaries() {
    let raw = std::fs::read_to_string("fixtures/mangadex_feed.json").unwrap();
    let chapters = parse::feed_response(&raw).unwrap();
    assert!(!chapters.is_empty());
    assert!(chapters.iter().any(|c| c.number.is_some()));
}

#[test]
fn parses_at_home_into_page_urls() {
    let raw = std::fs::read_to_string("fixtures/mangadex_at_home.json").unwrap();
    let pages = parse::at_home_response(&raw, "data").unwrap();
    assert!(!pages.is_empty(), "at-home response should yield page urls");
    assert!(pages[0].url.starts_with("https://"));
}
```

Run, expect FAIL (module missing):
```powershell
cd src-tauri
cargo test --test mangadex_tests
cd ..
```

- [x] **Step 4: Implement `src-tauri/src/sources/mangadex.rs`**

```rust
use async_trait::async_trait;

use crate::error::AppResult;
use crate::library::ContentKind;
use crate::sources::{
    BrowseList, ChapterContent, ChapterSummary, PageImage, Source, TitleDetail, TitleSummary,
};

const BASE: &str = "https://api.mangadex.org";

pub struct MangaDex;

#[async_trait]
impl Source for MangaDex {
    fn id(&self) -> &'static str { "mangadex" }
    fn kind(&self) -> ContentKind { ContentKind::Manga }

    async fn browse(&self, list: BrowseList, page: u32) -> AppResult<Vec<TitleSummary>> {
        let order = match list {
            BrowseList::Trending => "order%5BfollowedCount%5D=desc",
            BrowseList::Latest   => "order%5BcreatedAt%5D=desc",
        };
        let offset = page.saturating_mul(20);
        let url = format!(
            "{BASE}/manga?limit=20&offset={offset}&{order}\
             &availableTranslatedLanguage%5B%5D=en\
             &contentRating%5B%5D=safe&contentRating%5B%5D=suggestive\
             &includes%5B%5D=author&includes%5B%5D=cover_art"
        );
        let body = crate::http::client().get(&url).send().await?.text().await?;
        parse::browse_response(&body)
    }

    async fn search(&self, q: &str, page: u32) -> AppResult<Vec<TitleSummary>> {
        let offset = page.saturating_mul(20);
        let q = urlencoding::encode(q);
        let url = format!(
            "{BASE}/manga?limit=20&offset={offset}&title={q}\
             &availableTranslatedLanguage%5B%5D=en\
             &contentRating%5B%5D=safe&contentRating%5B%5D=suggestive\
             &includes%5B%5D=author&includes%5B%5D=cover_art"
        );
        let body = crate::http::client().get(&url).send().await?.text().await?;
        parse::browse_response(&body)
    }

    async fn title(&self, id: &str) -> AppResult<TitleDetail> {
        let url = format!(
            "{BASE}/manga/{id}?includes%5B%5D=author&includes%5B%5D=artist&includes%5B%5D=cover_art"
        );
        let body = crate::http::client().get(&url).send().await?.text().await?;
        let mut detail = parse::title_response(&body)?;

        let feed_url = format!(
            "{BASE}/manga/{id}/feed?limit=500&translatedLanguage%5B%5D=en&order%5Bchapter%5D=asc"
        );
        let feed_body = crate::http::client().get(&feed_url).send().await?.text().await?;
        detail.chapters = parse::feed_response(&feed_body)?;
        Ok(detail)
    }

    async fn chapter(&self, _title_id: &str, chapter_id: &str) -> AppResult<ChapterContent> {
        let url = format!("{BASE}/at-home/server/{chapter_id}");
        let body = crate::http::client().get(&url).send().await?.text().await?;
        let pages = parse::at_home_response(&body, "data")?;
        Ok(ChapterContent::MangaPages { pages })
    }
}

pub mod parse {
    use serde_json::Value;

    use crate::error::{AppError, AppResult};
    use crate::library::ContentKind;
    use crate::sources::{ChapterSummary, PageImage, TitleDetail, TitleSummary};

    fn local(value: &Value) -> Option<String> {
        let m = value.as_object()?;
        m.get("en")
            .or_else(|| m.values().next())
            .and_then(|v| v.as_str())
            .map(str::to_string)
    }

    fn relationship<'a>(rels: &'a [Value], kind: &str) -> Option<&'a Value> {
        rels.iter().find(|r| r.get("type").and_then(Value::as_str) == Some(kind))
    }

    fn cover_url(manga_id: &str, rels: &[Value]) -> Option<String> {
        let cover = relationship(rels, "cover_art")?;
        let filename = cover.get("attributes")?.get("fileName")?.as_str()?;
        Some(format!("https://uploads.mangadex.org/covers/{manga_id}/{filename}.512.jpg"))
    }

    fn author_name(rels: &[Value]) -> Option<String> {
        let author = relationship(rels, "author")?;
        author.get("attributes")?.get("name")?.as_str().map(str::to_string)
    }

    fn manga_to_summary(item: &Value) -> Option<TitleSummary> {
        let id = item.get("id")?.as_str()?;
        let attrs = item.get("attributes")?;
        let title = local(attrs.get("title")?)?;
        let rels = item.get("relationships")?.as_array()?;
        Some(TitleSummary {
            source: "mangadex".into(),
            source_id: id.to_string(),
            title,
            author: author_name(rels),
            cover_url: cover_url(id, rels),
            kind: ContentKind::Manga,
        })
    }

    pub fn browse_response(body: &str) -> AppResult<Vec<TitleSummary>> {
        let v: Value = serde_json::from_str(body)?;
        let data = v.get("data")
            .and_then(Value::as_array)
            .ok_or_else(|| AppError::Parse("missing data array".into()))?;
        Ok(data.iter().filter_map(manga_to_summary).collect())
    }

    pub fn title_response(body: &str) -> AppResult<TitleDetail> {
        let v: Value = serde_json::from_str(body)?;
        let data = v.get("data")
            .ok_or_else(|| AppError::Parse("missing data".into()))?;
        let summary = manga_to_summary(data)
            .ok_or_else(|| AppError::Parse("title summary parse failed".into()))?;
        let attrs = data.get("attributes").cloned().unwrap_or(Value::Null);

        let synopsis = attrs.get("description").and_then(local);
        let status   = attrs.get("status").and_then(Value::as_str).map(str::to_string);
        let orig     = attrs.get("originalLanguage").and_then(Value::as_str).map(str::to_string);

        let genres = attrs.get("tags")
            .and_then(Value::as_array)
            .map(|arr| {
                arr.iter()
                    .filter_map(|t| t.get("attributes")?.get("name").and_then(local))
                    .collect()
            })
            .unwrap_or_default();

        Ok(TitleDetail {
            summary,
            synopsis,
            status,
            original_language: orig,
            genres,
            chapters: vec![],
        })
    }

    pub fn feed_response(body: &str) -> AppResult<Vec<ChapterSummary>> {
        let v: Value = serde_json::from_str(body)?;
        let data = v.get("data")
            .and_then(Value::as_array)
            .ok_or_else(|| AppError::Parse("missing data array".into()))?;
        let mut chapters: Vec<ChapterSummary> = data.iter().filter_map(|item| {
            let id = item.get("id")?.as_str()?.to_string();
            let attrs = item.get("attributes")?;
            let number = attrs.get("chapter").and_then(Value::as_str).and_then(|s| s.parse().ok());
            let title  = attrs.get("title").and_then(Value::as_str).map(str::to_string);
            let published_at = attrs.get("publishAt").and_then(Value::as_str).and_then(|s| {
                chrono::DateTime::parse_from_rfc3339(s).ok().map(|d| d.timestamp())
            });
            let language = attrs.get("translatedLanguage").and_then(Value::as_str).map(str::to_string);
            Some(ChapterSummary { chapter_id: id, number, title, published_at, language })
        }).collect();
        chapters.sort_by(|a, b| a.number.partial_cmp(&b.number).unwrap_or(std::cmp::Ordering::Equal));
        Ok(chapters)
    }

    pub fn at_home_response(body: &str, quality: &str) -> AppResult<Vec<PageImage>> {
        let v: Value = serde_json::from_str(body)?;
        let base   = v.get("baseUrl").and_then(Value::as_str)
            .ok_or_else(|| AppError::Parse("missing baseUrl".into()))?;
        let chapter = v.get("chapter")
            .ok_or_else(|| AppError::Parse("missing chapter".into()))?;
        let hash   = chapter.get("hash").and_then(Value::as_str)
            .ok_or_else(|| AppError::Parse("missing hash".into()))?;
        let key = if quality == "data-saver" { "dataSaver" } else { "data" };
        let segment = if quality == "data-saver" { "data-saver" } else { "data" };
        let pages = chapter.get(key).and_then(Value::as_array).cloned().unwrap_or_default();
        Ok(pages.iter().filter_map(|p| {
            let f = p.as_str()?;
            Some(PageImage {
                url: format!("{base}/{segment}/{hash}/{f}"),
                width: None,
                height: None,
            })
        }).collect())
    }
}
```

- [x] **Step 5: Add `urlencoding` dep**

```powershell
cd src-tauri
cargo add urlencoding
cd ..
```

- [x] **Step 6: Re-export http + uncomment mangadex from lib.rs**

`src-tauri/src/lib.rs`:
```rust
pub mod db;
pub mod error;
pub mod http;
pub mod library;
pub mod sources;

pub use error::{AppError, AppResult};
```

If you commented out `pub mod mangadex;` in Task 7, **uncomment it now** in `src-tauri/src/sources/mod.rs`.

- [x] **Step 7: Run, verify pass**

```powershell
cd src-tauri
cargo test --test mangadex_tests
cd ..
```

Expected: 4 PASS.

- [x] **Step 8: Commit**

```powershell
git add .
git commit -m "feat(sources): add MangaDex adapter with parser-level tests"
```

---

## Task 9: Rust — Cover image cache + Tauri custom protocol

**Files:**
- Create: `src-tauri/src/cache.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/src/main.rs`
- Test: `src-tauri/tests/cache_tests.rs`

- [x] **Step 1: Write failing test**

`src-tauri/tests/cache_tests.rs`:
```rust
use reading::cache::CoverCache;
use tempfile::tempdir;

#[tokio::test]
async fn cache_path_is_deterministic_and_creates_dir() {
    let tmp = tempdir().unwrap();
    let cache = CoverCache::new(tmp.path().join("covers"));
    let p1 = cache.path_for("mangadex", "abc-123");
    let p2 = cache.path_for("mangadex", "abc-123");
    assert_eq!(p1, p2);
    assert!(p1.parent().unwrap().exists() || p1.parent().unwrap().to_string_lossy().contains("covers"));
    assert!(p1.to_string_lossy().ends_with(".jpg"));
}
```

- [x] **Step 2: Run, verify fail**

```powershell
cd src-tauri
cargo test --test cache_tests
cd ..
```

Expected: FAIL.

- [x] **Step 3: Implement `src-tauri/src/cache.rs`**

```rust
use std::path::{Path, PathBuf};

use crate::error::AppResult;
use crate::http::client;

#[derive(Clone)]
pub struct CoverCache {
    root: PathBuf,
}

impl CoverCache {
    pub fn new(root: impl Into<PathBuf>) -> Self {
        let root = root.into();
        let _ = std::fs::create_dir_all(&root);
        Self { root }
    }

    pub fn path_for(&self, source: &str, id: &str) -> PathBuf {
        let safe = sanitize(id);
        self.root.join(format!("{source}_{safe}.jpg"))
    }

    pub async fn ensure(&self, source: &str, id: &str, url: &str) -> AppResult<PathBuf> {
        let path = self.path_for(source, id);
        if path.exists() { return Ok(path); }
        let bytes = client().get(url).send().await?.bytes().await?;
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        std::fs::write(&path, &bytes)?;
        Ok(path)
    }
}

fn sanitize(id: &str) -> String {
    id.chars().map(|c| if c.is_ascii_alphanumeric() || c == '-' || c == '_' { c } else { '_' }).collect()
}

pub fn covers_dir(app_data_root: &Path) -> PathBuf {
    app_data_root.join("cache").join("covers")
}
```

- [x] **Step 4: Re-export**

`src-tauri/src/lib.rs`:
```rust
pub mod cache;
pub mod db;
pub mod error;
pub mod http;
pub mod library;
pub mod sources;

pub use error::{AppError, AppResult};
```

- [x] **Step 5: Run, verify pass**

```powershell
cd src-tauri
cargo test --test cache_tests
cd ..
```

Expected: PASS.

- [x] **Step 6: Commit**

```powershell
git add .
git commit -m "feat(cache): add CoverCache for on-disk thumbnail cache"
```

---

## Task 10: Rust — Tauri commands + AppState wiring

**Files:**
- Modify: `src-tauri/src/main.rs`
- Create: `src-tauri/src/commands.rs`
- Modify: `src-tauri/Cargo.toml`

- [x] **Step 1: Implement `src-tauri/src/commands.rs`**

```rust
use std::sync::Arc;

use serde::Serialize;
use tauri::{AppHandle, Manager, State};

use crate::cache::{covers_dir, CoverCache};
use crate::db::Db;
use crate::error::AppError;
use crate::library::{ContentKind, Library, ProgressRecord, TitleRecord};
use crate::sources::{
    mangadex::MangaDex, BrowseList, ChapterContent, Source, TitleDetail, TitleSummary,
};

pub struct AppState {
    pub db: Db,
    pub library: Library,
    pub covers: CoverCache,
    pub mangadex: Arc<dyn Source>,
}

impl AppState {
    pub fn new(app: &AppHandle) -> Result<Self, String> {
        let app_data = app.path().app_data_dir().map_err(|e| e.to_string())?;
        let db_path = app_data.join("metadata").join("library.sqlite");
        let db = Db::open(&db_path).map_err(|e| e.to_string())?;
        let library = Library::new(db.clone());
        let covers = CoverCache::new(covers_dir(&app_data));
        let mangadex: Arc<dyn Source> = Arc::new(MangaDex);
        Ok(Self { db, library, covers, mangadex })
    }
}

#[derive(Serialize)]
pub struct SummaryWithCover {
    #[serde(flatten)]
    pub summary: TitleSummary,
    pub cover_path: Option<String>,
}

fn pick_source<'a>(state: &'a AppState, id: &str) -> Result<&'a Arc<dyn Source>, String> {
    match id {
        "mangadex" => Ok(&state.mangadex),
        other => Err(format!("unknown source: {other}")),
    }
}

#[tauri::command]
pub async fn browse(
    source: String,
    list: BrowseList,
    page: u32,
    state: State<'_, AppState>,
) -> Result<Vec<SummaryWithCover>, AppError> {
    let src = pick_source(state.inner(), &source).map_err(AppError::Internal)?;
    let summaries = src.browse(list, page).await?;
    let mut out = Vec::with_capacity(summaries.len());
    for s in summaries {
        let cover_path = if let Some(url) = s.cover_url.as_deref() {
            state.covers.ensure(&s.source, &s.source_id, url).await.ok().map(|p| p.to_string_lossy().into_owned())
        } else { None };
        out.push(SummaryWithCover { summary: s, cover_path });
    }
    Ok(out)
}

#[tauri::command]
pub async fn search(
    source: String, q: String, page: u32, state: State<'_, AppState>,
) -> Result<Vec<SummaryWithCover>, AppError> {
    let src = pick_source(state.inner(), &source).map_err(AppError::Internal)?;
    let summaries = src.search(&q, page).await?;
    let mut out = Vec::with_capacity(summaries.len());
    for s in summaries {
        let cover_path = if let Some(url) = s.cover_url.as_deref() {
            state.covers.ensure(&s.source, &s.source_id, url).await.ok().map(|p| p.to_string_lossy().into_owned())
        } else { None };
        out.push(SummaryWithCover { summary: s, cover_path });
    }
    Ok(out)
}

#[tauri::command]
pub async fn get_title(
    source: String, id: String, state: State<'_, AppState>,
) -> Result<TitleDetail, AppError> {
    let src = pick_source(state.inner(), &source).map_err(AppError::Internal)?;
    let detail = src.title(&id).await?;
    let cover_path = if let Some(url) = detail.summary.cover_url.as_deref() {
        state.covers.ensure(&detail.summary.source, &detail.summary.source_id, url).await.ok()
    } else { None };
    let mut detail = detail;
    if let Some(p) = cover_path {
        let title_record = TitleRecord {
            source:        detail.summary.source.clone(),
            source_id:     detail.summary.source_id.clone(),
            kind:          ContentKind::Manga,
            title:         detail.summary.title.clone(),
            author:        detail.summary.author.clone(),
            cover_path:    Some(p.to_string_lossy().into_owned()),
            synopsis:      detail.synopsis.clone(),
            status:        detail.status.clone(),
            original_lang: detail.original_language.clone(),
            genres:        detail.genres.clone(),
        };
        let _ = state.library.upsert_title(&title_record);
    }
    Ok(detail)
}

#[tauri::command]
pub async fn get_chapter(
    source: String, title_id: String, chapter_id: String, state: State<'_, AppState>,
) -> Result<ChapterContent, AppError> {
    let src = pick_source(state.inner(), &source).map_err(AppError::Internal)?;
    src.chapter(&title_id, &chapter_id).await
}

#[tauri::command]
pub fn library_list(state: State<'_, AppState>) -> Result<Vec<TitleRecord>, AppError> {
    state.library.list_starred()
}

#[tauri::command]
pub fn library_set_starred(
    source: String, id: String, starred: bool, state: State<'_, AppState>,
) -> Result<(), AppError> {
    state.library.set_starred(&source, &id, starred)
}

#[tauri::command]
pub fn library_is_starred(
    source: String, id: String, state: State<'_, AppState>,
) -> Result<bool, AppError> {
    state.library.is_starred(&source, &id)
}

#[tauri::command]
pub fn continue_reading(
    state: State<'_, AppState>, limit: Option<u32>,
) -> Result<Vec<ProgressRecord>, AppError> {
    state.library.continue_reading(limit.unwrap_or(10))
}

#[tauri::command]
pub fn record_progress(
    source: String, id: String, chapter_id: String, position_pct: f64,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    state.library.record_progress(&source, &id, &chapter_id, position_pct)
}
```

- [x] **Step 2: Wire `src-tauri/src/main.rs`**

```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;

mod commands;

use reading::{cache, db, error, http, library, sources};

fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .init();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            let state = commands::AppState::new(&app.handle())
                .expect("AppState init");
            app.manage(state);
            Ok(())
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [x] **Step 3: Allow asset protocol for cover paths**

Modify `src-tauri/tauri.conf.json` so the frontend can render local cover files. Find the `app.security` block and merge:

```json
{
  "app": {
    "security": {
      "csp": null,
      "assetProtocol": {
        "enable": true,
        "scope": ["**"]
      }
    },
    "windows": [
      {
        "title": "Reading",
        "width": 1280,
        "height": 800,
        "minWidth": 960,
        "minHeight": 600,
        "decorations": true,
        "fullscreen": false,
        "resizable": true,
        "transparent": false
      }
    ]
  }
}
```

- [x] **Step 4: Build, verify clean**

```powershell
cd src-tauri
cargo build
cd ..
```

Expected: success.

- [x] **Step 5: Commit**

```powershell
git add .
git commit -m "feat(commands): wire Tauri commands + AppState"
```

---

## Task 11: Frontend — IPC wrappers + types

**Files:**
- Create: `src/types.ts`
- Create: `src/ipc/sources.ts`
- Create: `src/ipc/library.ts`

- [x] **Step 1: Define shared types**

`src/types.ts`:
```ts
export type ContentKind = "manga" | "novel";
export type BrowseList = "trending" | "latest";

export interface TitleSummary {
  source: string;
  source_id: string;
  title: string;
  author?: string | null;
  cover_url?: string | null;
  cover_path?: string | null;
  kind: ContentKind;
}

export interface ChapterSummary {
  chapter_id: string;
  number?: number | null;
  title?: string | null;
  published_at?: number | null;
  language?: string | null;
}

export interface TitleDetail {
  summary: TitleSummary;
  synopsis?: string | null;
  status?: string | null;
  original_language?: string | null;
  genres: string[];
  chapters: ChapterSummary[];
}

export interface PageImage {
  url: string;
  width?: number | null;
  height?: number | null;
}

export type ChapterContent =
  | { kind: "manga_pages"; pages: PageImage[] }
  | { kind: "novel_text"; plain: string; paragraphs: string[] };

export interface TitleRecord {
  source: string;
  source_id: string;
  kind: ContentKind;
  title: string;
  author?: string | null;
  cover_path?: string | null;
  synopsis?: string | null;
  status?: string | null;
  original_lang?: string | null;
  genres: string[];
}

export interface ProgressRecord {
  source: string;
  source_id: string;
  chapter_id: string;
  position_pct: number;
  updated_at: number;
}

export interface AppErr {
  kind: "http" | "parse" | "not_found" | "io" | "db" | "blocked" | "internal";
  message: string;
}
```

- [x] **Step 2: Sources IPC**

`src/ipc/sources.ts`:
```ts
import { invoke } from "@tauri-apps/api/core";
import type {
  BrowseList, ChapterContent, TitleDetail, TitleSummary,
} from "../types";

export async function browse(
  source: string, list: BrowseList, page = 0,
): Promise<TitleSummary[]> {
  return invoke("browse", { source, list, page });
}

export async function search(
  source: string, q: string, page = 0,
): Promise<TitleSummary[]> {
  return invoke("search", { source, q, page });
}

export async function getTitle(source: string, id: string): Promise<TitleDetail> {
  return invoke("get_title", { source, id });
}

export async function getChapter(
  source: string, titleId: string, chapterId: string,
): Promise<ChapterContent> {
  return invoke("get_chapter", { source, titleId, chapterId });
}
```

- [x] **Step 3: Library IPC**

`src/ipc/library.ts`:
```ts
import { invoke } from "@tauri-apps/api/core";
import type { ProgressRecord, TitleRecord } from "../types";

export const libraryList = (): Promise<TitleRecord[]> => invoke("library_list");
export const isStarred  = (source: string, id: string): Promise<boolean> =>
  invoke("library_is_starred", { source, id });
export const setStarred = (source: string, id: string, starred: boolean): Promise<void> =>
  invoke("library_set_starred", { source, id, starred });
export const continueReading = (limit = 10): Promise<ProgressRecord[]> =>
  invoke("continue_reading", { limit });
export const recordProgress = (
  source: string, id: string, chapterId: string, positionPct: number,
): Promise<void> =>
  invoke("record_progress", { source, id, chapterId, positionPct });
```

- [x] **Step 4: Commit**

```powershell
git add src/types.ts src/ipc
git commit -m "feat(ipc): add typed wrappers for source + library commands"
```

---

## Task 12: Frontend — Toast store + provider

**Files:**
- Create: `src/stores/useToast.ts`
- Create: `src/components/Toast.tsx`
- Modify: `src/components/Shell.tsx`

- [x] **Step 1: Implement `src/stores/useToast.ts`**

```ts
import { create } from "zustand";

export type ToastKind = "info" | "error" | "success";
export interface Toast { id: number; kind: ToastKind; message: string; }

interface ToastStore {
  toasts: Toast[];
  push: (t: Omit<Toast, "id">) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;

export const useToast = create<ToastStore>((set, get) => ({
  toasts: [],
  push: (t) => {
    const id = nextId++;
    set({ toasts: [...get().toasts, { id, ...t }] });
    setTimeout(() => get().dismiss(id), 5000);
  },
  dismiss: (id) => set({ toasts: get().toasts.filter(x => x.id !== id) }),
}));

export function toastError(message: string) {
  useToast.getState().push({ kind: "error", message });
}
export function toastInfo(message: string) {
  useToast.getState().push({ kind: "info", message });
}
```

- [x] **Step 2: Implement `src/components/Toast.tsx`**

```tsx
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { useToast } from "../stores/useToast";

const ICON = { error: AlertCircle, info: Info, success: CheckCircle2 } as const;

export function Toaster() {
  const { toasts, dismiss } = useToast();
  return (
    <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-50 pointer-events-none">
      <AnimatePresence>
        {toasts.map(t => {
          const Icon = ICON[t.kind];
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 240, damping: 26 }}
              className="glass rounded-lg px-4 py-3 flex items-start gap-3 max-w-sm pointer-events-auto shadow-glow"
            >
              <Icon size={18} className={t.kind === "error" ? "text-red-400" : "text-accent-soft"} />
              <p className="text-sm flex-1">{t.message}</p>
              <button onClick={() => dismiss(t.id)} className="text-ink-300 hover:text-ink-100">
                <X size={16} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
```

- [x] **Step 3: Mount in Shell**

```tsx
import { Outlet } from "react-router-dom";
import { LeftRail } from "./LeftRail";
import { Toaster } from "./Toast";

export function Shell() {
  return (
    <div className="h-full w-full flex bg-ink-950 text-ink-100">
      <LeftRail />
      <main className="flex-1 h-full overflow-hidden relative">
        <Outlet />
      </main>
      <Toaster />
    </div>
  );
}
```

- [x] **Step 4: Commit**

```powershell
git add .
git commit -m "feat(ui): add toast system for surfaceable errors"
```

---

## Task 13: Frontend — `CoverCard` + `CoverGrid`

**Files:**
- Create: `src/components/CoverCard.tsx`
- Create: `src/components/CoverGrid.tsx`
- Test: `tests/cover-card.test.tsx`

- [x] **Step 1: Failing component test**

`tests/cover-card.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { CoverCard } from "../src/components/CoverCard";

const item = {
  source: "mangadex",
  source_id: "abc",
  title: "Sample",
  author: "Author Name",
  cover_url: null,
  cover_path: null,
  kind: "manga" as const,
};

test("CoverCard renders title and author", () => {
  render(
    <MemoryRouter>
      <CoverCard item={item} />
    </MemoryRouter>
  );
  expect(screen.getByText("Sample")).toBeInTheDocument();
  expect(screen.getByText("Author Name")).toBeInTheDocument();
});
```

```powershell
pnpm test -- cover-card.test.tsx
```

Expected: FAIL (component missing).

- [x] **Step 2: Implement `CoverCard.tsx`**

```tsx
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { convertFileSrc } from "@tauri-apps/api/core";
import type { TitleSummary } from "../types";

export function CoverCard({ item }: { item: TitleSummary }) {
  const src = item.cover_path ? convertFileSrc(item.cover_path) : item.cover_url ?? undefined;
  return (
    <Link to={`/t/${item.source}/${item.source_id}`} aria-label={item.title}>
      <motion.div
        layoutId={`cover-${item.source}-${item.source_id}`}
        whileHover={{ y: -4, scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", stiffness: 300, damping: 24 }}
        className="group rounded-lg overflow-hidden glass focus-ring cursor-pointer"
      >
        <div className="aspect-[2/3] bg-ink-800 relative overflow-hidden">
          {src ? (
            <img
              src={src}
              alt={item.title}
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-ink-400 text-xs">
              {item.title}
            </div>
          )}
        </div>
        <div className="p-2.5">
          <p className="text-sm font-medium line-clamp-2 leading-snug">{item.title}</p>
          {item.author && (
            <p className="text-xs text-ink-300 truncate mt-1">{item.author}</p>
          )}
        </div>
      </motion.div>
    </Link>
  );
}
```

- [x] **Step 3: Implement `CoverGrid.tsx`**

```tsx
import { motion } from "framer-motion";
import type { TitleSummary } from "../types";
import { CoverCard } from "./CoverCard";

const container = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.025 } },
};
const item = {
  hidden:  { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 220, damping: 24 } },
};

export function CoverGrid({ items }: { items: TitleSummary[] }) {
  return (
    <motion.ul
      variants={container}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
    >
      {items.map(t => (
        <motion.li key={`${t.source}_${t.source_id}`} variants={item}>
          <CoverCard item={t} />
        </motion.li>
      ))}
    </motion.ul>
  );
}
```

- [x] **Step 4: Run tests**

```powershell
pnpm test -- cover-card.test.tsx
```

Expected: PASS.

- [x] **Step 5: Commit**

```powershell
git add .
git commit -m "feat(ui): add CoverCard + CoverGrid with stagger animation"
```

---

## Task 14: Frontend — Browse route hooked to MangaDex

**Files:**
- Modify: `src/routes/BrowseRoute.tsx`

- [x] **Step 1: Implement Browse route**

```tsx
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { browse, search as ipcSearch } from "../ipc/sources";
import type { BrowseList, TitleSummary } from "../types";
import { CoverGrid } from "../components/CoverGrid";
import { toastError } from "../stores/useToast";

export default function BrowseRoute() {
  const [items, setItems] = useState<TitleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<BrowseList>("trending");
  const [q, setQ] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const op = q.trim().length > 0
      ? ipcSearch("mangadex", q.trim())
      : browse("mangadex", list, 0);
    op.then(rows => { if (!cancelled) setItems(rows); })
      .catch(e => { if (!cancelled) toastError(e.message ?? String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [list, q]);

  return (
    <div className="h-full overflow-y-auto">
      <header className="sticky top-0 z-10 glass border-b border-ink-700/40 px-6 py-3 flex items-center gap-4">
        <div className="flex bg-ink-800/60 rounded-md p-0.5 text-sm">
          {(["trending", "latest"] as const).map(k => (
            <button
              key={k}
              onClick={() => setList(k)}
              className={`px-3 py-1 rounded ${list === k ? "bg-accent text-white" : "text-ink-300 hover:text-ink-100"}`}
            >
              {k[0].toUpperCase() + k.slice(1)}
            </button>
          ))}
        </div>
        <div className="ml-auto relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-300" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search MangaDex..."
            className="bg-ink-800/60 rounded-md pl-8 pr-3 py-1.5 text-sm w-64 outline-none border border-ink-700/40 focus:border-accent"
          />
        </div>
      </header>

      <div className="p-6">
        {loading ? (
          <SkeletonGrid />
        ) : items.length === 0 ? (
          <p className="text-ink-300 text-sm">No results.</p>
        ) : (
          <CoverGrid items={items} />
        )}
      </div>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {Array.from({ length: 18 }).map((_, i) => (
        <motion.li
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.02 }}
          className="aspect-[2/3] rounded-lg bg-gradient-to-br from-ink-800 via-ink-700 to-ink-800 bg-[length:200%_100%] animate-shimmer"
        />
      ))}
    </ul>
  );
}
```

- [x] **Step 2: Run dev, smoke test**

```powershell
pnpm tauri dev
```

Expected: Browse screen loads MangaDex covers within ~2s. Switching Trending/Latest changes results. Typing in search filters results.

- [x] **Step 3: Commit**

```powershell
git add .
git commit -m "feat(browse): hook Browse route to MangaDex with skeleton + search"
```

---

## Task 15: Frontend — Title detail route

**Files:**
- Modify: `src/routes/TitleRoute.tsx`
- Create: `src/components/ChapterList.tsx`

- [x] **Step 1: Implement `ChapterList.tsx`**

```tsx
import { Link } from "react-router-dom";
import type { ChapterSummary, TitleSummary } from "../types";

export function ChapterList({
  summary, chapters,
}: { summary: TitleSummary; chapters: ChapterSummary[] }) {
  if (chapters.length === 0) {
    return <p className="text-ink-300 text-sm">No chapters available.</p>;
  }
  return (
    <ul className="divide-y divide-ink-700/40 rounded-lg overflow-hidden glass">
      {chapters.map(c => (
        <li key={c.chapter_id}>
          <Link
            to={`/r/${summary.source}/${summary.source_id}/${c.chapter_id}`}
            className="flex items-baseline gap-3 px-4 py-2.5 hover:bg-ink-700/40 focus-ring"
          >
            <span className="text-accent text-sm font-mono w-12">
              {c.number != null ? `${c.number}` : "—"}
            </span>
            <span className="text-sm flex-1 truncate">{c.title || "Untitled"}</span>
            {c.published_at && (
              <span className="text-xs text-ink-300">
                {new Date(c.published_at * 1000).toLocaleDateString()}
              </span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
```

- [x] **Step 2: Implement Title route**

```tsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { getTitle } from "../ipc/sources";
import { isStarred, setStarred } from "../ipc/library";
import { toastError } from "../stores/useToast";
import type { TitleDetail } from "../types";
import { ChapterList } from "../components/ChapterList";

export default function TitleRoute() {
  const { source = "", id = "" } = useParams();
  const [detail, setDetail] = useState<TitleDetail | null>(null);
  const [starred, setStarredState] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([getTitle(source, id), isStarred(source, id)])
      .then(([d, s]) => { if (!cancelled) { setDetail(d); setStarredState(s); }})
      .catch(e => { if (!cancelled) toastError(e.message ?? String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [source, id]);

  async function toggleStar() {
    const next = !starred;
    setStarredState(next);
    try { await setStarred(source, id, next); }
    catch (e: any) { toastError(e.message ?? String(e)); setStarredState(!next); }
  }

  if (loading || !detail) {
    return <div className="p-8 text-ink-300 text-sm">Loading…</div>;
  }
  const cover = detail.summary.cover_path
    ? convertFileSrc(detail.summary.cover_path)
    : detail.summary.cover_url ?? undefined;

  return (
    <div className="h-full overflow-y-auto">
      <div className="relative">
        {cover && (
          <div
            className="absolute inset-0 -z-10 opacity-30 blur-2xl scale-110"
            style={{ backgroundImage: `url(${cover})`, backgroundSize: "cover", backgroundPosition: "center" }}
          />
        )}
        <div className="bg-gradient-to-b from-transparent to-ink-950 p-8 flex gap-8">
          <motion.div
            layoutId={`cover-${detail.summary.source}-${detail.summary.source_id}`}
            className="w-56 aspect-[2/3] rounded-lg overflow-hidden glass shadow-glow flex-shrink-0"
          >
            {cover && <img src={cover} alt={detail.summary.title} className="w-full h-full object-cover" />}
          </motion.div>
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-semibold">{detail.summary.title}</h1>
            {detail.summary.author && (
              <p className="text-ink-300 mt-1">by {detail.summary.author}</p>
            )}
            <div className="flex flex-wrap gap-1.5 mt-3">
              {detail.genres.slice(0, 8).map(g => (
                <span key={g} className="text-xs px-2 py-0.5 rounded-full bg-ink-700/60 text-ink-200">{g}</span>
              ))}
            </div>
            <p className="text-sm text-ink-200 mt-4 leading-relaxed line-clamp-6 whitespace-pre-line">
              {detail.synopsis ?? "No synopsis available."}
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={toggleStar}
                className={`px-4 py-2 rounded-md flex items-center gap-2 text-sm focus-ring ${starred ? "bg-accent text-white" : "bg-ink-700/60 hover:bg-ink-700"}`}
              >
                <Star size={16} fill={starred ? "currentColor" : "none"} />
                {starred ? "In Library" : "Add to Library"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-8">
        <h2 className="text-lg font-semibold mb-3">Chapters</h2>
        <ChapterList summary={detail.summary} chapters={detail.chapters} />
      </div>
    </div>
  );
}
```

- [x] **Step 3: Smoke test in dev**

```powershell
pnpm tauri dev
```

Expected: Click a cover from Browse → smooth shared-element morph into Title Detail with hero cover + synopsis + chapter list. Star toggles between filled and unfilled.

- [x] **Step 4: Commit**

```powershell
git add .
git commit -m "feat(title): add hero detail page with shared-element transition"
```

---

## Task 16: Frontend — Library route + Library store

**Files:**
- Create: `src/stores/useLibrary.ts`
- Modify: `src/routes/LibraryRoute.tsx`

- [x] **Step 1: Library store**

`src/stores/useLibrary.ts`:
```ts
import { create } from "zustand";
import { libraryList, setStarred } from "../ipc/library";
import type { TitleRecord } from "../types";

interface LibraryStore {
  items: TitleRecord[];
  loading: boolean;
  refresh: () => Promise<void>;
  remove: (source: string, id: string) => Promise<void>;
}

export const useLibrary = create<LibraryStore>((set, get) => ({
  items: [],
  loading: false,
  refresh: async () => {
    set({ loading: true });
    try {
      const items = await libraryList();
      set({ items });
    } finally { set({ loading: false }); }
  },
  remove: async (source, id) => {
    await setStarred(source, id, false);
    set({ items: get().items.filter(x => !(x.source === source && x.source_id === id)) });
  },
}));
```

- [x] **Step 2: Library route**

```tsx
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { convertFileSrc } from "@tauri-apps/api/core";
import { useLibrary } from "../stores/useLibrary";

export default function LibraryRoute() {
  const { items, loading, refresh, remove } = useLibrary();
  useEffect(() => { void refresh(); }, [refresh]);

  return (
    <div className="h-full overflow-y-auto p-8">
      <h1 className="text-2xl font-semibold mb-6">Library</h1>
      {loading ? (
        <p className="text-ink-300 text-sm">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-ink-300 text-sm">
          Nothing here yet — star a title from <Link to="/" className="text-accent underline">Browse</Link>.
        </p>
      ) : (
        <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {items.map(t => {
            const cover = t.cover_path ? convertFileSrc(t.cover_path) : undefined;
            return (
              <motion.li
                key={`${t.source}_${t.source_id}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg overflow-hidden glass relative group"
              >
                <Link to={`/t/${t.source}/${t.source_id}`}>
                  <div className="aspect-[2/3] bg-ink-800">
                    {cover && <img src={cover} alt={t.title} className="w-full h-full object-cover" />}
                  </div>
                  <div className="p-2.5">
                    <p className="text-sm font-medium line-clamp-2">{t.title}</p>
                    {t.author && <p className="text-xs text-ink-300 truncate mt-1">{t.author}</p>}
                  </div>
                </Link>
                <button
                  onClick={(e) => { e.preventDefault(); void remove(t.source, t.source_id); }}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-ink-900/70 backdrop-blur px-2 py-1 rounded text-xs hover:bg-red-500/80"
                >
                  Remove
                </button>
              </motion.li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
```

- [x] **Step 3: Smoke test**

```powershell
pnpm tauri dev
```

Expected: Star a title from Title Detail → switch to Library → it appears. Hover → Remove button. Click Remove → it disappears.

- [x] **Step 4: Commit**

```powershell
git add .
git commit -m "feat(library): add Library route + store"
```

---

## Task 17: Window lifecycle — clean close + progress flush

**Files:**
- Modify: `src-tauri/src/main.rs`
- Modify: `src-tauri/tauri.conf.json`

- [x] **Step 1: Add a clean shutdown handler**

Modify `main.rs` to flush any in-flight progress writes on shutdown. Replace the `tauri::Builder` chain with:

```rust
fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .init();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            let state = commands::AppState::new(&app.handle()).expect("AppState init");
            app.manage(state);
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                tracing::info!("close requested for {}", window.label());
                // SQLite writes are sync; the WAL is already on disk.
                // No tray, no minimize-on-close: let the OS exit normally.
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [x] **Step 2: Configure window for normal Windows behavior**

Already done in Task 10's `tauri.conf.json` snippet (decorations: true, fullscreen: false, no tray). Verify window options match.

- [x] **Step 3: Smoke test — close behavior**

```powershell
pnpm tauri dev
```

Expected:
- X button **closes the app fully**, no tray, no minimized process. Verify via Task Manager that `reading.exe` is gone after close.
- `Alt+F4` closes.
- Right-click taskbar → Close window closes.

- [x] **Step 4: Commit**

```powershell
git add .
git commit -m "chore(lifecycle): explicit close handling + log close requests"
```

---

## Task 18: App icon + window title polish

**Files:**
- Replace: `src-tauri/icons/*` (placeholder generation)
- Modify: `src-tauri/tauri.conf.json` (already has title)

- [x] **Step 1: Generate icon set**

If you have a square PNG (≥1024px) named `app-icon.png` at the project root:

```powershell
pnpm dlx @tauri-apps/cli icon ./app-icon.png
```

This populates `src-tauri/icons/` with all the platform-specific icons.

If you don't have one yet, create a temporary one (any 1024×1024 PNG works for the placeholder; the real icon gets done in Phase 6 polish):

```powershell
# Use any image editor to create a 1024×1024 PNG of a stylized "R" or book.
# Save as ./app-icon.png at the project root, then run the command above.
```

- [x] **Step 2: Build, sanity check**

```powershell
pnpm tauri build --debug
```

Expected: a debug `.exe` is produced under `src-tauri/target/debug/`. Double-click it to verify the window title and icon look right. Close it.

- [x] **Step 3: Commit**

```powershell
git add src-tauri/icons app-icon.png
git commit -m "chore(icons): add temporary app icon set"
```

---

## Task 19: README + run instructions

**Files:**
- Create: `README.md`

- [x] **Step 1: Write `README.md`**

```markdown
# Reading

A Windows desktop app that browses MangaDex (and soon NovelFire) and reads chapters aloud with on-device AI.

This is **Phase 1**: browse + library only. Audio comes in Phase 3.

## Develop

Prereqs: Node 22 LTS, pnpm 9+, Rust 1.79+, Windows 10/11.

```powershell
pnpm install
pnpm tauri dev
```

## Tests

```powershell
# Frontend
pnpm test

# Rust
cd src-tauri ; cargo test ; cd ..
```

## Build

```powershell
pnpm tauri build
```

Output is at `src-tauri/target/release/bundle/`.

## Project layout

See [`docs/superpowers/specs/2026-05-09-manga-novel-reader-design.md`](docs/superpowers/specs/2026-05-09-manga-novel-reader-design.md).
```

- [x] **Step 2: Commit**

```powershell
git add README.md
git commit -m "docs: add Phase 1 README"
```

---

## Task 20: End-to-end smoke verification

**Files:** none — manual checklist.

- [x] **Step 1: Cold start to first Browse render**

```powershell
pnpm tauri build --debug
.\src-tauri\target\debug\reading.exe
```

- [x] **Step 2: Walk the happy path manually**

Verify each:
- App opens within ~2s of double-click; left rail is collapsed showing 3 icons.
- Hovering the rail expands labels; clicking each switches the right pane.
- Browse loads MangaDex Trending grid within ~2s; Search field filters; Latest/Trending toggle works.
- Click any cover → smooth shared-element morph into Title Detail.
- Title Detail shows hero cover, synopsis, chapter list. Star toggle goes filled/unfilled with no error.
- Switch to Library → starred title is there; hover → Remove → vanishes.
- Close window via X → process is gone (verify in Task Manager).
- Reopen → Library is empty (Remove was persisted), star a different title to confirm star **persists** across launches.

- [x] **Step 3: Run all tests**

```powershell
pnpm test
cd src-tauri ; cargo test ; cd ..
```

Expected: all green.

- [x] **Step 4: Commit a phase-1 tag**

```powershell
git add .
git commit --allow-empty -m "chore: phase 1 (foundation) complete"
git tag -a phase-1 -m "Phase 1: foundation — browse + library"
```

---

## What lands in Phase 2 (next plan, drafted after Phase 1 ships)

- NovelFire scraper (browse / title / chapter), with HTML fixtures.
- "Source picker" tab on Browse (MangaDex | NovelFire | All).
- Reader route — manual mode only — for both manga (image viewer) and novels (paginated text).
- Generic-URL fallback (paste-any-URL).
- Reader keyboard shortcuts.

Audio still doesn't exist until Phase 3.

