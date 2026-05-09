# Reading — Phase 2: NovelFire + Manual Reader Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the NovelFire source so the user can browse + open web novels, then build the Reader route in manual mode for both manga (image viewer with prev/next) and novels (paginated text with prev/next). After Phase 2 lands, the user can read full chapters end-to-end on either platform — silently, with keyboard shortcuts, with reading progress persisting across launches. Audio still doesn't exist; that's Phase 3.

**Architecture:** Build on Phase 1's `Source` trait — `NovelFire` becomes the second `impl Source`, registered in `AppState` next to `MangaDex`. Browse route gains a source-tab switcher. Reader route is new and content-aware: switches between an image viewer and a text reader based on the `ChapterContent::MangaPages | NovelText` discriminator. A generic-URL paste box on the top bar lets the user feed in arbitrary URLs (a third source — `Generic` — uses heuristics to guess manga vs novel and extract content best-effort).

**Tech Stack:** Same Rust + React stack from Phase 1 — adds `scraper` (Rust HTML scraping via CSS selectors) and `dom_smoothie` (Readability-style main-content extraction for the generic fallback).

**Spec:** [`docs/superpowers/specs/2026-05-09-manga-novel-reader-design.md`](../specs/2026-05-09-manga-novel-reader-design.md) — see §5.3 (NovelFire), §5.4 (Generic), §7.4 (Reader manual mode).

**Phase 1 baseline:** Tag `phase-1` on `main`. 11 Rust tests, 2 frontend tests, all green. App launches via `start.bat`. MangaDex browse + title + library work end-to-end.

---

## Project layout produced by this phase (delta from Phase 1)

```
Reading/
├── src-tauri/
│   ├── src/
│   │   └── sources/
│   │       ├── mod.rs              # ← MODIFIED: BrowseList unchanged; pub mod novelfire; pub mod generic;
│   │       ├── mangadex.rs
│   │       ├── novelfire.rs        # ← NEW
│   │       └── generic.rs          # ← NEW
│   │   └── commands.rs             # ← MODIFIED: pick_source extends to "novelfire" + "generic"
│   ├── tests/
│   │   ├── novelfire_tests.rs      # ← NEW
│   │   └── generic_tests.rs        # ← NEW
│   ├── fixtures/
│   │   ├── novelfire_browse.html   # ← NEW
│   │   ├── novelfire_title.html    # ← NEW
│   │   ├── novelfire_chapter.html  # ← NEW
│   │   ├── generic_novel.html      # ← NEW
│   │   └── generic_manga.html      # ← NEW
├── src/
│   ├── routes/
│   │   ├── BrowseRoute.tsx         # ← MODIFIED: source tab + paste-URL bar
│   │   └── ReaderRoute.tsx         # ← REPLACED: real reader (image + text variants)
│   ├── components/
│   │   ├── reader/                 # ← NEW
│   │   │   ├── MangaReader.tsx
│   │   │   ├── NovelReader.tsx
│   │   │   └── ReaderShell.tsx
│   │   └── PasteUrlBar.tsx         # ← NEW
│   ├── stores/
│   │   └── useReaderProgress.ts    # ← NEW (progress debouncer)
│   └── hooks/
│       └── useKeyboardShortcuts.ts # ← NEW
└── tests/
    ├── novel-reader.test.tsx       # ← NEW
    └── manga-reader.test.tsx       # ← NEW
```

---

## Conventions (carried from Phase 1)

- **TDD on Rust modules:** failing test → run red → implement → run green → commit.
- **Frontend:** build component → small Vitest test → commit.
- **Commits:** small + frequent, Conventional Commits.
- **Tests:** Rust via `cargo test` (cwd `src-tauri`), Frontend via `pnpm exec vitest run` (project root).
- **Working directory:** `C:\Users\defnotean\OneDrive\Desktop\Codex\Reading` for all shell commands.
- **PowerShell quirk:** RemoteSigned execution policy is set; `.ps1` shims work. Use `curl.exe` (not `curl` alias).
- **Rust lib name:** `reading_lib`. Tests import as `use reading_lib::...`.
- **Don't run `pnpm tauri dev`** — blocking dev server; use `pnpm vite build` + `cargo build` for verification, plus `start.bat` for visual smoke at the end of the phase.

---

## Task 1: NovelFire HTML fixtures

**Files:**
- Create: `src-tauri/fixtures/novelfire_browse.html`
- Create: `src-tauri/fixtures/novelfire_title.html`
- Create: `src-tauri/fixtures/novelfire_chapter.html`

These are reference snapshots used by Task 2's parser tests so we don't hit the network in CI.

- [ ] **Step 1: Capture browse page**

```powershell
New-Item -Force -ItemType Directory src-tauri\fixtures | Out-Null
curl.exe -L -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36" `
  -o src-tauri\fixtures\novelfire_browse.html `
  "https://novelfire.net/genre-all-popular"
```

If this returns a Cloudflare interstitial (look for `Just a moment...`, `cf-challenge`, or status 403), use a different page that's known to be unprotected: try `https://novelfire.net/sitemap.xml` redirected through a curl with cookies, OR fall back to a manually saved HTML page (the user can save the browse page from their logged-in browser via Ctrl+S and drop the result at the fixture path). Don't bypass Cloudflare programmatically.

Verify the file is non-empty and contains book entries:
```powershell
(Get-Item src-tauri\fixtures\novelfire_browse.html).Length
Select-String -Path src-tauri\fixtures\novelfire_browse.html -Pattern "book/" -SimpleMatch | Select-Object -First 3
```

Expected: file size > 50KB, several `book/<slug>` references.

- [ ] **Step 2: Capture title page**

Pick a popular novel from the browse page (the implementer should grep one out of the captured `novelfire_browse.html`). For the prompt-template this is illustrative — substitute whatever slug is in the browse fixture:

```powershell
$slug = (Select-String -Path src-tauri\fixtures\novelfire_browse.html -Pattern '/book/([^"/?]+)' -AllMatches | ForEach-Object { $_.Matches } | Select-Object -First 1 -ExpandProperty Groups | Select-Object -Last 1 -ExpandProperty Value)
"slug: $slug"
curl.exe -L -A "Mozilla/5.0 ..." -o src-tauri\fixtures\novelfire_title.html "https://novelfire.net/book/$slug"
```

Verify it has a chapter list:
```powershell
Select-String -Path src-tauri\fixtures\novelfire_title.html -Pattern "chapter-" -SimpleMatch | Measure-Object
```

Expected: at least 5 matches. If the page paginates the chapter list (NovelFire often does), additionally fetch one or two more pages of the chapter list and concatenate, OR just rely on whatever the first page gives — Phase 2 doesn't need to span every chapter; it needs to render *some* chapters correctly.

- [ ] **Step 3: Capture chapter page**

```powershell
$chap = (Select-String -Path src-tauri\fixtures\novelfire_title.html -Pattern '/book/[^"]*?/chapter-(\d+)' -AllMatches | ForEach-Object { $_.Matches } | Select-Object -First 1 -ExpandProperty Value)
"first chapter url: $chap"
curl.exe -L -A "Mozilla/5.0 ..." -o src-tauri\fixtures\novelfire_chapter.html "https://novelfire.net$chap"
```

Verify it has chapter content:
```powershell
Select-String -Path src-tauri\fixtures\novelfire_chapter.html -Pattern "<p>" -SimpleMatch | Measure-Object
```

Expected: dozens of `<p>` tags (the body of the chapter).

If any of these capture steps fails because of Cloudflare or rate limits, **stop and report the failure** — DO NOT bypass protection. The user can fall back to saving HTML from their browser and dropping it at the expected fixture paths.

- [ ] **Step 4: Commit**

```powershell
git add src-tauri/fixtures/novelfire_*.html
git commit -m "test(novelfire): capture browse/title/chapter HTML fixtures"
```

---

## Task 2: NovelFire parsers (TDD)

**Files:**
- Create: `src-tauri/src/sources/novelfire.rs` (parser submodule first; trait impl in Task 3)
- Modify: `src-tauri/src/sources/mod.rs` (add `pub mod novelfire;`)
- Modify: `src-tauri/Cargo.toml` (add `scraper = "0.20"` to `[dependencies]`)
- Create: `src-tauri/tests/novelfire_tests.rs`

This task only writes the **parsers** (pure HTML-string-in, struct-out functions). The full `Source` impl with HTTP calls comes in Task 3.

- [ ] **Step 1: Write the failing parser tests**

`src-tauri/tests/novelfire_tests.rs`:

```rust
use reading_lib::sources::novelfire::parse;

#[test]
fn parses_browse_into_summaries() {
    let raw = std::fs::read_to_string("fixtures/novelfire_browse.html").unwrap();
    let summaries = parse::browse_page(&raw).unwrap();
    assert!(!summaries.is_empty(), "should have at least one summary");
    let first = &summaries[0];
    assert_eq!(first.source, "novelfire");
    assert!(!first.title.is_empty());
    assert!(first.source_id.len() > 1, "source_id should be a non-trivial slug");
    assert!(first.cover_url.is_some(), "expected a cover URL on the browse card");
}

#[test]
fn parses_title_into_detail() {
    let raw = std::fs::read_to_string("fixtures/novelfire_title.html").unwrap();
    let detail = parse::title_page(&raw, "the-slug").unwrap();
    assert!(!detail.summary.title.is_empty());
    assert!(detail.synopsis.as_ref().map(|s| s.len()).unwrap_or(0) > 50, "expected non-trivial synopsis");
    assert!(!detail.chapters.is_empty(), "expected at least one chapter from the first page of the chapter list");
}

#[test]
fn parses_chapter_into_paragraphs() {
    let raw = std::fs::read_to_string("fixtures/novelfire_chapter.html").unwrap();
    let body = parse::chapter_page(&raw).unwrap();
    assert!(body.paragraphs.len() >= 5, "expected several paragraphs of body text");
    assert!(body.plain.len() > 500, "plain text should be non-trivial");
    // Sanity: ad/navigation noise should be stripped out
    assert!(!body.plain.to_lowercase().contains("subscribe to our newsletter"));
}
```

- [ ] **Step 2: Add `scraper` to `Cargo.toml`**

In the `[dependencies]` block of `src-tauri/Cargo.toml`, add:

```toml
scraper = "0.20"
```

- [ ] **Step 3: Run tests, verify FAIL**

```powershell
cd src-tauri
cargo test --test novelfire_tests
cd ..
```

Expected: FAIL — `reading_lib::sources::novelfire` doesn't exist.

- [ ] **Step 4: Add `pub mod novelfire;` to `src-tauri/src/sources/mod.rs`**

Next to the existing `pub mod mangadex;` line:

```rust
pub mod mangadex;
pub mod novelfire;
```

- [ ] **Step 5: Implement `src-tauri/src/sources/novelfire.rs` parsers**

Start with just the parsers (no Source trait impl yet). The implementer will need to **inspect the actual fixture HTML** to determine the right CSS selectors — NovelFire's HTML structure isn't standardized. Below is a starter sketch; **adapt selectors to what the captured fixtures actually contain**:

```rust
use crate::error::{AppError, AppResult};
use crate::library::ContentKind;
use crate::sources::{ChapterSummary, TitleDetail, TitleSummary};

pub mod parse {
    use scraper::{Html, Selector};
    use crate::error::{AppError, AppResult};
    use crate::library::ContentKind;
    use crate::sources::{ChapterSummary, TitleDetail, TitleSummary};

    pub struct NovelChapterBody {
        pub plain: String,
        pub paragraphs: Vec<String>,
    }

    fn parse_selector(s: &str) -> AppResult<Selector> {
        Selector::parse(s).map_err(|e| AppError::Parse(format!("bad selector {s}: {e:?}")))
    }

    fn slug_from_href(href: &str) -> Option<String> {
        // /book/some-novel-slug -> "some-novel-slug"
        href.trim_start_matches('/').strip_prefix("book/")
            .map(|rest| rest.split('/').next().unwrap_or(rest).to_string())
    }

    pub fn browse_page(html: &str) -> AppResult<Vec<TitleSummary>> {
        let doc = Html::parse_document(html);
        // The actual selector depends on NovelFire's markup; the implementer should
        // tweak after inspecting the fixture. Common patterns: .novel-list .novel-item,
        // .book-grid .book-card, etc.
        let card_sel  = parse_selector(".novel-item, .book-item, .col-novel-main .row")?;
        let title_sel = parse_selector("h3.novel-title a, .novel-name a, .book-name a")?;
        let cover_sel = parse_selector("img")?;
        let mut out = Vec::new();
        for card in doc.select(&card_sel) {
            let Some(title_el) = card.select(&title_sel).next() else { continue };
            let title = title_el.text().collect::<String>().trim().to_string();
            let href  = title_el.value().attr("href").unwrap_or_default();
            let Some(slug) = slug_from_href(href) else { continue };
            if title.is_empty() || slug.is_empty() { continue }
            let cover_url = card.select(&cover_sel).next()
                .and_then(|img| img.value().attr("src").or_else(|| img.value().attr("data-src")))
                .map(|s| if s.starts_with("http") { s.to_string() } else { format!("https://novelfire.net{s}") });
            out.push(TitleSummary {
                source: "novelfire".into(),
                source_id: slug,
                title,
                author: None,
                cover_url,
                cover_path: None,
                kind: ContentKind::Novel,
            });
        }
        if out.is_empty() {
            return Err(AppError::Parse("no novel cards parsed from browse page (selectors out of date?)".into()));
        }
        Ok(out)
    }

    pub fn title_page(html: &str, slug: &str) -> AppResult<TitleDetail> {
        let doc = Html::parse_document(html);
        // Adapt selectors to actual markup — these are educated guesses.
        let title_sel    = parse_selector("h1.novel-title, h1.book-name, h3.title")?;
        let author_sel   = parse_selector(".author a, .author span, .info .author")?;
        let synopsis_sel = parse_selector(".description, .summary, #info-meta + .desc")?;
        let cover_sel    = parse_selector(".cover img, .book-cover img")?;
        let chapter_sel  = parse_selector("ul.list-chapter li a, .chapter-list a")?;

        let title = doc.select(&title_sel).next()
            .map(|e| e.text().collect::<String>().trim().to_string())
            .ok_or_else(|| AppError::Parse("missing title element".into()))?;
        let author = doc.select(&author_sel).next()
            .map(|e| e.text().collect::<String>().trim().to_string());
        let synopsis = doc.select(&synopsis_sel).next()
            .map(|e| e.text().collect::<String>().trim().to_string());
        let cover_url = doc.select(&cover_sel).next()
            .and_then(|img| img.value().attr("src").or_else(|| img.value().attr("data-src")))
            .map(|s| if s.starts_with("http") { s.to_string() } else { format!("https://novelfire.net{s}") });

        let chapters: Vec<ChapterSummary> = doc.select(&chapter_sel).enumerate().filter_map(|(i, el)| {
            let href  = el.value().attr("href")?;
            let title = el.text().collect::<String>().trim().to_string();
            // Extract chapter number from href like /book/<slug>/chapter-12
            let number = href.rsplit("chapter-").next()
                .and_then(|s| s.split(|c: char| !c.is_ascii_digit()).next())
                .and_then(|s| s.parse::<f32>().ok());
            // chapter_id is the URL slug suffix
            let chapter_id = href.rsplit('/').next().unwrap_or(href).to_string();
            Some(ChapterSummary {
                chapter_id,
                number,
                title: if title.is_empty() { None } else { Some(title) },
                published_at: None,
                language: Some("en".into()),
            })
        }).collect();

        let summary = TitleSummary {
            source: "novelfire".into(),
            source_id: slug.to_string(),
            title,
            author: author.clone(),
            cover_url,
            cover_path: None,
            kind: ContentKind::Novel,
        };

        Ok(TitleDetail {
            summary,
            synopsis,
            status: None,
            original_language: Some("en".into()),
            genres: vec![],
            chapters,
        })
    }

    pub fn chapter_page(html: &str) -> AppResult<NovelChapterBody> {
        let doc = Html::parse_document(html);
        // Adapt selector to actual content container — common patterns:
        // #chapter-content, .chr-content, .chapter-body
        let content_sel = parse_selector("#chapter-content, #chr-content, .chr-content, .chapter-body, article.chapter-content")?;
        let p_sel = parse_selector("p")?;
        let body = doc.select(&content_sel).next()
            .ok_or_else(|| AppError::Parse("no chapter content container found".into()))?;
        let paragraphs: Vec<String> = body.select(&p_sel)
            .map(|p| p.text().collect::<String>().trim().to_string())
            .filter(|s| !s.is_empty())
            // strip common ad/affiliate noise
            .filter(|s| !s.to_lowercase().contains("subscribe to our newsletter"))
            .filter(|s| !s.to_lowercase().contains("read on novelfire"))
            .collect();
        let plain = paragraphs.join("\n\n");
        if plain.len() < 100 {
            return Err(AppError::Parse(format!("chapter body too short ({} chars) — selectors may be off", plain.len())));
        }
        Ok(NovelChapterBody { plain, paragraphs })
    }
}
```

**Important:** These selectors are educated guesses. The implementer must run the tests, observe failures, inspect the fixture HTML, and adjust selectors until the tests pass. The tests are the contract; the selectors are a means to satisfy them.

- [ ] **Step 6: Run tests until they pass**

```powershell
cd src-tauri
cargo test --test novelfire_tests
cd ..
```

Iterate on selectors as needed. Expected: 3/3 PASS.

- [ ] **Step 7: Commit**

```powershell
git add -A
git commit -m "feat(novelfire): add HTML parsers for browse/title/chapter"
```

---

## Task 3: NovelFire Source impl

**Files:**
- Modify: `src-tauri/src/sources/novelfire.rs` (add `pub struct NovelFire` + `impl Source for NovelFire`)

The parsers from Task 2 are pure functions; this task wraps them in HTTP calls and the `Source` trait.

- [ ] **Step 1: Implement the trait**

Append to `src-tauri/src/sources/novelfire.rs`:

```rust
use async_trait::async_trait;
use crate::error::{AppError, AppResult};
use crate::library::ContentKind;
use crate::sources::{
    BrowseList, ChapterContent, Source, TitleDetail, TitleSummary,
};

const BASE: &str = "https://novelfire.net";

pub struct NovelFire;

async fn fetch_html(url: &str) -> AppResult<String> {
    let resp = crate::http::client().get(url).send().await?;
    let status = resp.status();
    if status.as_u16() == 403 {
        return Err(AppError::Blocked(format!(
            "novelfire blocked the request (Cloudflare?) — try opening {url} in your browser to refresh cookies"
        )));
    }
    if !status.is_success() {
        let body = resp.text().await.unwrap_or_default();
        return Err(AppError::Http(format!("{status} {url}: {}", &body.chars().take(200).collect::<String>())));
    }
    Ok(resp.text().await?)
}

#[async_trait]
impl Source for NovelFire {
    fn id(&self) -> &'static str { "novelfire" }
    fn kind(&self) -> ContentKind { ContentKind::Novel }

    async fn browse(&self, list: BrowseList, _page: u32) -> AppResult<Vec<TitleSummary>> {
        let path = match list {
            BrowseList::Trending => "/genre-all-popular",
            BrowseList::Latest   => "/genre-all-newest",
        };
        let html = fetch_html(&format!("{BASE}{path}")).await?;
        parse::browse_page(&html)
    }

    async fn search(&self, q: &str, _page: u32) -> AppResult<Vec<TitleSummary>> {
        let q = urlencoding::encode(q);
        let html = fetch_html(&format!("{BASE}/search?keyword={q}")).await?;
        parse::browse_page(&html)
    }

    async fn title(&self, id: &str) -> AppResult<TitleDetail> {
        let html = fetch_html(&format!("{BASE}/book/{id}")).await?;
        parse::title_page(&html, id)
    }

    async fn chapter(&self, title_id: &str, chapter_id: &str) -> AppResult<ChapterContent> {
        let html = fetch_html(&format!("{BASE}/book/{title_id}/{chapter_id}")).await?;
        let body = parse::chapter_page(&html)?;
        Ok(ChapterContent::NovelText { plain: body.plain, paragraphs: body.paragraphs })
    }
}
```

- [ ] **Step 2: Build, ensure no errors**

```powershell
cd src-tauri
cargo build
cd ..
```

Expected: clean.

- [ ] **Step 3: Commit**

```powershell
git add -A
git commit -m "feat(novelfire): implement Source trait with HTTP + 403 detection"
```

---

## Task 4: AppState recognizes the NovelFire source

**Files:**
- Modify: `src-tauri/src/commands.rs` (extend `pick_source` and `AppState`)

- [ ] **Step 1: Modify `commands.rs`**

In `AppState`, add a `novelfire` field next to `mangadex`:

```rust
pub struct AppState {
    pub db: Db,
    pub library: Library,
    pub covers: CoverCache,
    pub mangadex: Arc<dyn Source>,
    pub novelfire: Arc<dyn Source>,
}
```

Update the `AppState::new` body:

```rust
let mangadex:  Arc<dyn Source> = Arc::new(MangaDex);
let novelfire: Arc<dyn Source> = Arc::new(crate::sources::novelfire::NovelFire);
Ok(Self { db, library, covers, mangadex, novelfire })
```

Add the import at the top:

```rust
use crate::sources::novelfire::NovelFire as NovelFireSource;
```

(Or just qualify inline as `crate::sources::novelfire::NovelFire` — either is fine.)

Extend `pick_source`:

```rust
fn pick_source<'a>(state: &'a AppState, id: &str) -> Result<&'a Arc<dyn Source>, String> {
    match id {
        "mangadex"  => Ok(&state.mangadex),
        "novelfire" => Ok(&state.novelfire),
        other => Err(format!("unknown source: {other}")),
    }
}
```

- [ ] **Step 2: In `get_title`, record the right `ContentKind`**

The existing code hard-codes `ContentKind::Manga`. Replace with the source's kind:

```rust
let title_record = TitleRecord {
    source:        detail.summary.source.clone(),
    source_id:     detail.summary.source_id.clone(),
    kind:          src.kind(),                       // ← was: ContentKind::Manga
    title:         detail.summary.title.clone(),
    // ... rest unchanged
};
```

- [ ] **Step 3: Build + run all tests**

```powershell
cd src-tauri
cargo build
cargo test
cd ..
```

Expected: clean build, 11/11 prior tests still passing, plus 3/3 new novelfire parser tests.

- [ ] **Step 4: Commit**

```powershell
git add -A
git commit -m "feat(commands): register NovelFire alongside MangaDex; respect source kind"
```

---

## Task 5: Browse — source tabs (MangaDex / NovelFire)

**Files:**
- Modify: `src/routes/BrowseRoute.tsx`
- Modify: `src/types.ts` (no change needed — `TitleSummary.source` is already string)

- [ ] **Step 1: Add a source-tabs control to Browse**

Refactor `src/routes/BrowseRoute.tsx`. The current implementation hard-codes `"mangadex"`; pull that into state and add a tab control next to (or above) the Trending/Latest pill:

```tsx
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { browse, search as ipcSearch } from "../ipc/sources";
import type { BrowseList, TitleSummary } from "../types";
import { CoverGrid } from "../components/CoverGrid";
import { toastError } from "../stores/useToast";

type SourceId = "mangadex" | "novelfire";

const SOURCES: { id: SourceId; label: string }[] = [
  { id: "mangadex",  label: "MangaDex"  },
  { id: "novelfire", label: "NovelFire" },
];

export default function BrowseRoute() {
  const [items, setItems] = useState<TitleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<BrowseList>("trending");
  const [source, setSource] = useState<SourceId>("mangadex");
  const [q, setQ] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const op = q.trim().length > 0
      ? ipcSearch(source, q.trim())
      : browse(source, list, 0);
    op.then(rows => { if (!cancelled) setItems(rows); })
      .catch(e => { if (!cancelled) toastError(e.message ?? String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [list, q, source]);

  return (
    <div className="h-full overflow-y-auto">
      <header className="sticky top-0 z-10 glass border-b border-ink-700/40 px-6 py-3 flex items-center gap-4">
        {/* Source tabs */}
        <div className="flex bg-ink-800/60 rounded-md p-0.5 text-sm">
          {SOURCES.map(s => (
            <button
              key={s.id}
              onClick={() => setSource(s.id)}
              className={`px-3 py-1 rounded ${source === s.id ? "bg-accent text-white" : "text-ink-300 hover:text-ink-100"}`}
            >
              {s.label}
            </button>
          ))}
        </div>
        {/* Sort tabs */}
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
            placeholder={`Search ${SOURCES.find(s => s.id === source)?.label}…`}
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

- [ ] **Step 2: Build + tests**

```powershell
pnpm vite build
pnpm exec vitest run
```

Expected: all green.

- [ ] **Step 3: Commit**

```powershell
git add -A
git commit -m "feat(browse): add source tabs for MangaDex / NovelFire switch"
```

---

## Task 6: Reader shell — split between manga / novel mode

**Files:**
- Create: `src/components/reader/ReaderShell.tsx`

This is just the wrapper that chooses which inner component to mount based on `ChapterContent.kind`. The `MangaReader` and `NovelReader` themselves come in Tasks 7 + 8.

- [ ] **Step 1: Implement `ReaderShell.tsx`**

```tsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { getChapter } from "../../ipc/sources";
import type { ChapterContent } from "../../types";
import { toastError } from "../../stores/useToast";
import { MangaReader } from "./MangaReader";
import { NovelReader } from "./NovelReader";

export function ReaderShell() {
  const { source = "", id = "", chapter = "" } = useParams();
  const navigate = useNavigate();
  const [content, setContent] = useState<ChapterContent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getChapter(source, id, chapter)
      .then(c => { if (!cancelled) setContent(c); })
      .catch(e => { if (!cancelled) toastError(e.message ?? String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [source, id, chapter]);

  return (
    <div className="h-full w-full flex flex-col bg-ink-950 text-ink-100">
      <header className="glass border-b border-ink-700/40 px-4 py-2 flex items-center gap-3 flex-shrink-0">
        <button
          onClick={() => navigate(`/t/${source}/${id}`)}
          aria-label="Back to title"
          className="rounded-md p-1.5 hover:bg-ink-700/60 focus-ring"
        >
          <ArrowLeft size={18} />
        </button>
        <span className="text-sm text-ink-300 truncate">
          {source} / {id} / {chapter}
        </span>
      </header>

      <motion.div
        key={`${source}_${id}_${chapter}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="flex-1 overflow-hidden"
      >
        {loading || !content ? (
          <div className="h-full flex items-center justify-center text-ink-300 text-sm">Loading…</div>
        ) : content.kind === "manga_pages" ? (
          <MangaReader source={source} titleId={id} chapterId={chapter} pages={content.pages} />
        ) : (
          <NovelReader source={source} titleId={id} chapterId={chapter} paragraphs={content.paragraphs} plain={content.plain} />
        )}
      </motion.div>
    </div>
  );
}
```

- [ ] **Step 2: Don't wire it into the router yet** — Task 9 does that after `MangaReader` and `NovelReader` exist.

- [ ] **Step 3: Verify it at least type-checks** (it imports components that don't exist yet, which will error)

This is expected; we commit the shell after Tasks 7 + 8 land, OR we stub the imports. To keep commits clean, **don't commit yet — stash and continue**:

```powershell
# Don't commit yet. Move on to Task 7.
```

---

## Task 7: MangaReader component (manual mode)

**Files:**
- Create: `src/components/reader/MangaReader.tsx`
- Create: `tests/manga-reader.test.tsx`

- [ ] **Step 1: Failing test**

`tests/manga-reader.test.tsx`:

```tsx
import { vi } from "vitest";
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
  convertFileSrc: (s: string) => s,
}));

import { render, screen, fireEvent } from "@testing-library/react";
import { MangaReader } from "../src/components/reader/MangaReader";

const pages = [
  { url: "https://example.com/p1.jpg", width: null, height: null },
  { url: "https://example.com/p2.jpg", width: null, height: null },
  { url: "https://example.com/p3.jpg", width: null, height: null },
];

test("MangaReader renders first page and advances on Next click", () => {
  render(<MangaReader source="mangadex" titleId="t" chapterId="c" pages={pages} />);
  expect(screen.getByText(/page 1 of 3/i)).toBeInTheDocument();
  fireEvent.click(screen.getByLabelText(/next page/i));
  expect(screen.getByText(/page 2 of 3/i)).toBeInTheDocument();
});

test("MangaReader does not advance past last page", () => {
  render(<MangaReader source="mangadex" titleId="t" chapterId="c" pages={pages} />);
  fireEvent.click(screen.getByLabelText(/next page/i));
  fireEvent.click(screen.getByLabelText(/next page/i));
  fireEvent.click(screen.getByLabelText(/next page/i));   // would go past end
  expect(screen.getByText(/page 3 of 3/i)).toBeInTheDocument();
});
```

Run, expect FAIL.

- [ ] **Step 2: Implement `MangaReader.tsx`**

```tsx
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PageImage } from "../../types";
import { recordProgress } from "../../ipc/library";

interface Props {
  source: string;
  titleId: string;
  chapterId: string;
  pages: PageImage[];
}

export function MangaReader({ source, titleId, chapterId, pages }: Props) {
  const [index, setIndex] = useState(0);
  const total = pages.length;
  const page = pages[index];

  // Persist progress as the user advances
  useEffect(() => {
    if (total === 0) return;
    const pct = (index + 1) / total;
    void recordProgress(source, titleId, chapterId, pct).catch(() => { /* swallow */ });
  }, [source, titleId, chapterId, index, total]);

  function next() { setIndex(i => Math.min(i + 1, total - 1)); }
  function prev() { setIndex(i => Math.max(i - 1, 0)); }

  if (total === 0) {
    return <div className="h-full flex items-center justify-center text-ink-300">No pages in this chapter.</div>;
  }

  return (
    <div className="relative h-full w-full bg-ink-950">
      <motion.img
        key={page.url}
        src={page.url}
        alt={`Page ${index + 1}`}
        loading="eager"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.15 }}
        className="absolute inset-0 m-auto max-h-full max-w-full object-contain"
      />

      {/* Click zones */}
      <button
        type="button"
        onClick={prev}
        aria-label="Previous page"
        className="absolute left-0 top-0 h-full w-1/3 focus-ring"
      >
        <ChevronLeft className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-300/60 hover:text-ink-100 transition-colors" size={32} />
      </button>
      <button
        type="button"
        onClick={next}
        aria-label="Next page"
        className="absolute right-0 top-0 h-full w-1/3 focus-ring"
      >
        <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-300/60 hover:text-ink-100 transition-colors" size={32} />
      </button>

      {/* Page counter */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 glass rounded-full px-3 py-1 text-xs text-ink-200">
        Page {index + 1} of {total}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Run tests, verify pass**

```powershell
pnpm exec vitest run tests/manga-reader.test.tsx
```

Expected: 2/2 pass.

- [ ] **Step 4: Commit**

```powershell
git add src/components/reader/MangaReader.tsx tests/manga-reader.test.tsx
git commit -m "feat(reader): MangaReader manual mode with page navigation"
```

---

## Task 8: NovelReader component (manual mode)

**Files:**
- Create: `src/components/reader/NovelReader.tsx`
- Create: `tests/novel-reader.test.tsx`

- [ ] **Step 1: Failing test**

`tests/novel-reader.test.tsx`:

```tsx
import { vi } from "vitest";
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
  convertFileSrc: (s: string) => s,
}));

import { render, screen, fireEvent } from "@testing-library/react";
import { NovelReader } from "../src/components/reader/NovelReader";

const paragraphs = Array.from({ length: 30 }, (_, i) => `Paragraph ${i + 1}. ` + "Lorem ipsum dolor sit amet, ".repeat(10));

test("NovelReader paginates and shows page count", () => {
  render(<NovelReader source="nf" titleId="t" chapterId="c" paragraphs={paragraphs} plain={paragraphs.join("\n\n")} />);
  // Should split into multiple pages
  const counterMatch = screen.getByText(/page 1 of \d+/i);
  expect(counterMatch).toBeInTheDocument();
  fireEvent.click(screen.getByLabelText(/next page/i));
  expect(screen.getByText(/page 2 of \d+/i)).toBeInTheDocument();
});
```

Run, expect FAIL.

- [ ] **Step 2: Implement `NovelReader.tsx`**

```tsx
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { recordProgress } from "../../ipc/library";

interface Props {
  source: string;
  titleId: string;
  chapterId: string;
  paragraphs: string[];
  plain: string;
}

const PARAS_PER_PAGE = 6;

export function NovelReader({ source, titleId, chapterId, paragraphs }: Props) {
  const pages = useMemo(() => {
    const out: string[][] = [];
    for (let i = 0; i < paragraphs.length; i += PARAS_PER_PAGE) {
      out.push(paragraphs.slice(i, i + PARAS_PER_PAGE));
    }
    return out.length > 0 ? out : [["(empty chapter)"]];
  }, [paragraphs]);

  const [index, setIndex] = useState(0);
  const total = pages.length;

  useEffect(() => {
    if (total === 0) return;
    const pct = (index + 1) / total;
    void recordProgress(source, titleId, chapterId, pct).catch(() => {});
  }, [source, titleId, chapterId, index, total]);

  function next() { setIndex(i => Math.min(i + 1, total - 1)); }
  function prev() { setIndex(i => Math.max(i - 1, 0)); }

  return (
    <div className="relative h-full w-full">
      <div className="absolute inset-0 overflow-y-auto px-12 py-8 max-w-3xl mx-auto">
        <motion.article
          key={index}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="prose prose-invert leading-relaxed text-ink-100 space-y-5"
        >
          {pages[index].map((p, i) => (
            <p key={i} className="text-base whitespace-pre-line">{p}</p>
          ))}
        </motion.article>
      </div>

      <button
        type="button"
        onClick={prev}
        aria-label="Previous page"
        disabled={index === 0}
        className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full glass p-2 disabled:opacity-30 hover:bg-ink-700/60 focus-ring"
      >
        <ChevronLeft size={20} />
      </button>
      <button
        type="button"
        onClick={next}
        aria-label="Next page"
        disabled={index === total - 1}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full glass p-2 disabled:opacity-30 hover:bg-ink-700/60 focus-ring"
      >
        <ChevronRight size={20} />
      </button>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 glass rounded-full px-3 py-1 text-xs text-ink-200">
        Page {index + 1} of {total}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Run tests, verify pass**

```powershell
pnpm exec vitest run tests/novel-reader.test.tsx
```

Expected: 1/1 pass.

- [ ] **Step 4: Commit**

```powershell
git add src/components/reader/NovelReader.tsx tests/novel-reader.test.tsx
git commit -m "feat(reader): NovelReader manual mode with paginated text"
```

---

## Task 9: Wire ReaderShell into the route

**Files:**
- Modify: `src/routes/ReaderRoute.tsx` (replace stub)

- [ ] **Step 1: Replace the stub**

Replace `src/routes/ReaderRoute.tsx` content with:

```tsx
import { ReaderShell } from "../components/reader/ReaderShell";

export default function ReaderRoute() {
  return <ReaderShell />;
}
```

- [ ] **Step 2: Now commit `ReaderShell.tsx` from Task 6 along with this**

```powershell
git add src/components/reader/ReaderShell.tsx src/routes/ReaderRoute.tsx
git commit -m "feat(reader): wire ReaderShell into /r/:source/:id/:chapter route"
```

- [ ] **Step 3: Verify build + tests**

```powershell
pnpm vite build
pnpm exec vitest run
```

Expected: clean build, all 4 frontend tests pass (shell, cover-card, manga-reader, novel-reader).

---

## Task 10: Reader keyboard shortcuts

**Files:**
- Create: `src/hooks/useKeyboardShortcuts.ts`
- Modify: `src/components/reader/MangaReader.tsx` (use the hook)
- Modify: `src/components/reader/NovelReader.tsx` (use the hook)
- Modify: `src/components/reader/ReaderShell.tsx` (Esc → back)

- [ ] **Step 1: Implement the hook**

```ts
// src/hooks/useKeyboardShortcuts.ts
import { useEffect } from "react";

type Handler = (e: KeyboardEvent) => void;
export type ShortcutMap = Record<string, Handler>;

export function useKeyboardShortcuts(map: ShortcutMap, deps: ReadonlyArray<unknown> = []) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Ignore when user is typing in an input/textarea
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      const handler = map[e.key];
      if (handler) {
        handler(e);
        e.preventDefault();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
```

- [ ] **Step 2: Add shortcuts to `MangaReader`**

In `MangaReader.tsx`, after `prev`/`next` are defined:

```tsx
import { useKeyboardShortcuts } from "../../hooks/useKeyboardShortcuts";
// ...
useKeyboardShortcuts({
  ArrowLeft:  prev,
  ArrowRight: next,
}, [index, total]);
```

- [ ] **Step 3: Add shortcuts to `NovelReader`** — same pattern.

- [ ] **Step 4: Add Esc → back in `ReaderShell`**

In `ReaderShell.tsx`, after `navigate` is set up:

```tsx
import { useKeyboardShortcuts } from "../../hooks/useKeyboardShortcuts";
// ...
useKeyboardShortcuts({
  Escape: () => navigate(`/t/${source}/${id}`),
}, [source, id]);
```

- [ ] **Step 5: Verify**

```powershell
pnpm vite build
pnpm exec vitest run
```

Expected: clean.

- [ ] **Step 6: Commit**

```powershell
git add -A
git commit -m "feat(reader): keyboard shortcuts (arrows = page, Esc = back)"
```

---

## Task 11: Generic URL fallback (Rust)

**Files:**
- Create: `src-tauri/src/sources/generic.rs`
- Modify: `src-tauri/src/sources/mod.rs` (add `pub mod generic;`)
- Modify: `src-tauri/src/commands.rs` (extend `pick_source` for `"generic"`; add `from_url` command)
- Modify: `src-tauri/src/main.rs` (register the new command)
- Modify: `src-tauri/Cargo.toml` (add `dom_smoothie = "0.13"` — adjust if a different version is current)
- Create: `src-tauri/tests/generic_tests.rs`
- Create: `src-tauri/fixtures/generic_novel.html` (a saved sample novel page from any site — RoyalRoad, ScribbleHub, etc.)
- Create: `src-tauri/fixtures/generic_manga.html` (a saved sample manga page with multiple large images)

The user can paste any URL; this module sniffs whether it's a manga (gallery of large images) or novel (Readability-style article) and parses accordingly. **Best-effort** by design.

- [ ] **Step 1: Capture two fixtures**

Save two HTML pages — one obviously a novel chapter (lots of `<p>` text), one obviously a manga page (lots of large `<img>`). The user can save these from their browser via Ctrl+S, or use any saved HTML page from their reading habits. Drop them at:
- `src-tauri/fixtures/generic_novel.html`
- `src-tauri/fixtures/generic_manga.html`

- [ ] **Step 2: Failing tests**

`src-tauri/tests/generic_tests.rs`:

```rust
use reading_lib::sources::generic::{detect_kind, parse_novel, parse_manga};
use reading_lib::library::ContentKind;

#[test]
fn detects_novel_html_as_novel() {
    let raw = std::fs::read_to_string("fixtures/generic_novel.html").unwrap();
    assert_eq!(detect_kind(&raw), ContentKind::Novel);
}

#[test]
fn detects_manga_html_as_manga() {
    let raw = std::fs::read_to_string("fixtures/generic_manga.html").unwrap();
    assert_eq!(detect_kind(&raw), ContentKind::Manga);
}

#[test]
fn parses_novel_html_into_paragraphs() {
    let raw = std::fs::read_to_string("fixtures/generic_novel.html").unwrap();
    let body = parse_novel(&raw, "https://example.com").unwrap();
    assert!(body.paragraphs.len() >= 3);
    assert!(body.plain.len() > 200);
}

#[test]
fn parses_manga_html_into_image_urls() {
    let raw = std::fs::read_to_string("fixtures/generic_manga.html").unwrap();
    let pages = parse_manga(&raw, "https://example.com").unwrap();
    assert!(!pages.is_empty());
    assert!(pages.iter().all(|p| p.url.starts_with("http")));
}
```

- [ ] **Step 3: Add deps**

In `src-tauri/Cargo.toml`:

```toml
dom_smoothie = "0.13"   # adjust if a newer version is current
```

(If `dom_smoothie` isn't available or breaks, fall back to a hand-rolled "biggest text block" heuristic — see Step 4 fallback below.)

- [ ] **Step 4: Implement `src-tauri/src/sources/generic.rs`**

```rust
use scraper::{Html, Selector};
use crate::error::{AppError, AppResult};
use crate::library::ContentKind;
use crate::sources::PageImage;

pub struct GenericNovelBody {
    pub plain: String,
    pub paragraphs: Vec<String>,
}

fn count_text_chars(html: &str) -> usize {
    let doc = Html::parse_document(html);
    let body_sel = Selector::parse("body").unwrap();
    doc.select(&body_sel).next()
        .map(|b| b.text().collect::<String>().len())
        .unwrap_or(0)
}

fn count_large_images(html: &str) -> usize {
    let doc = Html::parse_document(html);
    let img_sel = Selector::parse("img").unwrap();
    doc.select(&img_sel)
        .filter(|el| {
            let w = el.value().attr("width").and_then(|s| s.parse::<u32>().ok()).unwrap_or(0);
            let h = el.value().attr("height").and_then(|s| s.parse::<u32>().ok()).unwrap_or(0);
            // either declared dims are large, OR the file extension is image-like and there's no
            // declared width (we'll trust it)
            w >= 500 || h >= 500 || (w == 0 && h == 0 &&
                el.value().attr("src")
                    .map(|s| s.ends_with(".jpg") || s.ends_with(".jpeg") || s.ends_with(".png") || s.ends_with(".webp"))
                    .unwrap_or(false))
        })
        .count()
}

pub fn detect_kind(html: &str) -> ContentKind {
    let chars = count_text_chars(html) as i64;
    let imgs  = count_large_images(html) as i64;
    // If the page has 5+ large images and < 3000 chars of text, it's manga.
    // If it has lots of text and few images, it's a novel.
    if imgs >= 5 && chars < 3000 {
        ContentKind::Manga
    } else if chars > 1500 && imgs < 5 {
        ContentKind::Novel
    } else if imgs > chars / 200 {  // image-heavy
        ContentKind::Manga
    } else {
        ContentKind::Novel
    }
}

pub fn parse_novel(html: &str, _base_url: &str) -> AppResult<GenericNovelBody> {
    // Strategy: find the densest text container by iterating major block elements
    // and picking whichever has the most direct <p> descendants.
    let doc = Html::parse_document(html);
    let candidate_sel = Selector::parse("article, main, [role=main], .post, .article, .chapter, .content, #content, body")
        .map_err(|e| AppError::Parse(format!("bad selector: {e:?}")))?;
    let p_sel = Selector::parse("p").unwrap();
    let mut best: Option<(usize, scraper::ElementRef)> = None;
    for el in doc.select(&candidate_sel) {
        let text_len: usize = el.select(&p_sel)
            .map(|p| p.text().collect::<String>().chars().count())
            .sum();
        match best {
            Some((cur, _)) if cur >= text_len => {}
            _ => best = Some((text_len, el)),
        }
    }
    let Some((_, container)) = best else {
        return Err(AppError::Parse("no candidate content container found".into()));
    };
    let paragraphs: Vec<String> = container.select(&p_sel)
        .map(|p| p.text().collect::<String>().trim().to_string())
        .filter(|s| s.len() > 20)
        .collect();
    if paragraphs.is_empty() {
        return Err(AppError::Parse("no paragraphs found in densest container".into()));
    }
    let plain = paragraphs.join("\n\n");
    Ok(GenericNovelBody { plain, paragraphs })
}

pub fn parse_manga(html: &str, base_url: &str) -> AppResult<Vec<PageImage>> {
    let doc = Html::parse_document(html);
    let img_sel = Selector::parse("img").unwrap();
    let pages: Vec<PageImage> = doc.select(&img_sel)
        .filter_map(|el| {
            let src = el.value().attr("src").or_else(|| el.value().attr("data-src"))?;
            // Skip obvious avatars / icons
            let w = el.value().attr("width").and_then(|s| s.parse::<u32>().ok()).unwrap_or(0);
            let h = el.value().attr("height").and_then(|s| s.parse::<u32>().ok()).unwrap_or(0);
            if (w > 0 && w < 200) || (h > 0 && h < 200) { return None; }
            let url = if src.starts_with("http") {
                src.to_string()
            } else if src.starts_with("//") {
                format!("https:{src}")
            } else if let Ok(base) = url::Url::parse(base_url) {
                base.join(src).ok().map(|u| u.to_string()).unwrap_or_else(|| src.to_string())
            } else {
                src.to_string()
            };
            Some(PageImage { url, width: if w > 0 { Some(w) } else { None }, height: if h > 0 { Some(h) } else { None } })
        })
        .collect();
    if pages.is_empty() {
        return Err(AppError::Parse("no candidate images found".into()));
    }
    Ok(pages)
}
```

- [ ] **Step 5: Add a Tauri command for paste-URL**

In `src-tauri/src/commands.rs`, append:

```rust
use crate::sources::{generic, ChapterContent, PageImage};

#[derive(serde::Serialize)]
pub struct GenericRouteHint {
    pub source: String,         // always "generic"
    pub source_id: String,      // url-encoded URL — used to round-trip the URL through routing
    pub kind: ContentKind,
    pub title: String,           // best-effort: <title> tag
    pub chapter_id: String,      // same as source_id (one-shot)
}

#[tauri::command]
pub async fn from_url(url: String, _state: State<'_, AppState>) -> Result<GenericRouteHint, AppError> {
    let html = crate::http::client().get(&url).send().await?.text().await?;
    let kind = generic::detect_kind(&html);
    // Use the document <title> as a best-effort title
    let doc = scraper::Html::parse_document(&html);
    let title_sel = scraper::Selector::parse("title").map_err(|e| AppError::Parse(format!("{e:?}")))?;
    let title = doc.select(&title_sel).next()
        .map(|t| t.text().collect::<String>().trim().to_string())
        .unwrap_or_else(|| url.clone());
    let encoded = urlencoding::encode(&url).to_string();
    Ok(GenericRouteHint {
        source: "generic".into(),
        source_id: encoded.clone(),
        kind,
        title,
        chapter_id: encoded,
    })
}
```

Add `from_url` to the `invoke_handler!` macro in `main.rs` and to the IPC wrapper in `src/ipc/sources.ts`:

```ts
// src/ipc/sources.ts
export interface GenericRouteHint {
  source: "generic";
  source_id: string;
  kind: import("../types").ContentKind;
  title: string;
  chapter_id: string;
}
export const fromUrl = (url: string): Promise<GenericRouteHint> => invoke("from_url", { url });
```

(The full `Source` impl for generic — handling browse/title/chapter on a single URL — is overkill for v1. We just route the URL straight to the reader via this hint.)

- [ ] **Step 6: Implement a generic `Source` impl as a stub**

In `src-tauri/src/sources/generic.rs`, add:

```rust
use async_trait::async_trait;
use crate::sources::{
    BrowseList, ChapterContent, ChapterSummary, Source, TitleDetail, TitleSummary,
};
use crate::library::ContentKind;

pub struct Generic;

#[async_trait]
impl Source for Generic {
    fn id(&self) -> &'static str { "generic" }
    fn kind(&self) -> ContentKind { ContentKind::Novel } // placeholder; chapter() decides per-URL

    async fn browse(&self, _list: BrowseList, _page: u32) -> AppResult<Vec<TitleSummary>> {
        Err(AppError::NotFound("generic source does not support browse".into()))
    }
    async fn search(&self, _q: &str, _page: u32) -> AppResult<Vec<TitleSummary>> {
        Err(AppError::NotFound("generic source does not support search".into()))
    }
    async fn title(&self, id: &str) -> AppResult<TitleDetail> {
        // `id` is url-encoded URL; decode and synthesize a one-chapter title.
        let url = urlencoding::decode(id).map_err(|e| AppError::Parse(e.to_string()))?.into_owned();
        let html = crate::http::client().get(&url).send().await?.text().await?;
        let doc = scraper::Html::parse_document(&html);
        let title_sel = scraper::Selector::parse("title").unwrap();
        let title = doc.select(&title_sel).next()
            .map(|t| t.text().collect::<String>().trim().to_string())
            .unwrap_or_else(|| url.clone());
        let kind = detect_kind(&html);
        Ok(TitleDetail {
            summary: TitleSummary {
                source: "generic".into(),
                source_id: id.to_string(),
                title: title.clone(),
                author: None,
                cover_url: None,
                cover_path: None,
                kind,
            },
            synopsis: None,
            status: None,
            original_language: None,
            genres: vec![],
            chapters: vec![ChapterSummary {
                chapter_id: id.to_string(),
                number: Some(1.0),
                title: Some(title),
                published_at: None,
                language: None,
            }],
        })
    }
    async fn chapter(&self, _title_id: &str, chapter_id: &str) -> AppResult<ChapterContent> {
        let url = urlencoding::decode(chapter_id).map_err(|e| AppError::Parse(e.to_string()))?.into_owned();
        let html = crate::http::client().get(&url).send().await?.text().await?;
        match detect_kind(&html) {
            ContentKind::Manga => {
                let pages = parse_manga(&html, &url)?;
                Ok(ChapterContent::MangaPages { pages })
            }
            ContentKind::Novel => {
                let body = parse_novel(&html, &url)?;
                Ok(ChapterContent::NovelText { plain: body.plain, paragraphs: body.paragraphs })
            }
        }
    }
}
```

In `commands.rs::pick_source`, add:
```rust
"generic" => Ok(&state.generic),
```

In `AppState`, add a `pub generic: Arc<dyn Source>` field initialized as `Arc::new(crate::sources::generic::Generic)`.

In `src-tauri/src/sources/mod.rs`, add `pub mod generic;`.

- [ ] **Step 7: Run tests**

```powershell
cd src-tauri
cargo test
cd ..
```

Expected: all prior tests still pass + 4 new generic_tests pass.

- [ ] **Step 8: Commit**

```powershell
git add -A
git commit -m "feat(generic): URL paste fallback with content-kind sniffing"
```

---

## Task 12: PasteUrlBar — paste-and-go input

**Files:**
- Create: `src/components/PasteUrlBar.tsx`
- Modify: `src/components/Shell.tsx` (mount it in the top-bar area; or alternatively, into `BrowseRoute`)

- [ ] **Step 1: Implement `PasteUrlBar.tsx`**

```tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Link2 } from "lucide-react";
import { fromUrl } from "../ipc/sources";
import { toastError } from "../stores/useToast";

export function PasteUrlBar() {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function go() {
    if (!url.trim()) return;
    setBusy(true);
    try {
      const hint = await fromUrl(url.trim());
      // Route to /r/generic/<encoded>/<encoded> — title and chapter share the same id
      navigate(`/r/${hint.source}/${hint.source_id}/${hint.chapter_id}`);
      setUrl("");
    } catch (e: any) {
      toastError(e.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative w-72">
      <Link2 size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-300" />
      <input
        value={url}
        onChange={e => setUrl(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") void go(); }}
        placeholder="Paste a manga or novel URL…"
        disabled={busy}
        className="bg-ink-800/60 rounded-md pl-8 pr-3 py-1.5 text-sm w-full outline-none border border-ink-700/40 focus:border-accent disabled:opacity-50"
      />
    </div>
  );
}
```

- [ ] **Step 2: Mount `<PasteUrlBar />` in `BrowseRoute.tsx` header (next to the search field)**

In `BrowseRoute.tsx`, replace the `<div className="ml-auto relative">` block with:

```tsx
<div className="ml-auto flex items-center gap-3">
  <PasteUrlBar />
  <div className="relative">
    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-300" />
    <input ... />
  </div>
</div>
```

…and import `PasteUrlBar`.

- [ ] **Step 3: Verify**

```powershell
pnpm vite build
pnpm exec vitest run
```

Expected: clean.

- [ ] **Step 4: Commit**

```powershell
git add -A
git commit -m "feat(browse): add paste-URL bar that routes to the reader"
```

---

## Task 13: Continue Reading carousel in Library

**Files:**
- Modify: `src/stores/useLibrary.ts` (also load progress)
- Modify: `src/routes/LibraryRoute.tsx` (render carousel)

- [ ] **Step 1: Extend the store**

```ts
// src/stores/useLibrary.ts
import { create } from "zustand";
import { libraryList, setStarred, continueReading } from "../ipc/library";
import type { ProgressRecord, TitleRecord } from "../types";

interface LibraryStore {
  items: TitleRecord[];
  recents: ProgressRecord[];
  loading: boolean;
  refresh: () => Promise<void>;
  remove: (source: string, id: string) => Promise<void>;
}

export const useLibrary = create<LibraryStore>((set, get) => ({
  items: [],
  recents: [],
  loading: false,
  refresh: async () => {
    set({ loading: true });
    try {
      const [items, recents] = await Promise.all([libraryList(), continueReading(10)]);
      set({ items, recents });
    } finally { set({ loading: false }); }
  },
  remove: async (source, id) => {
    await setStarred(source, id, false);
    set({ items: get().items.filter(x => !(x.source === source && x.source_id === id)) });
  },
}));
```

- [ ] **Step 2: Render the carousel in `LibraryRoute.tsx`**

Above the existing starred grid, add:

```tsx
{recents.length > 0 && (
  <section className="mb-10">
    <h2 className="text-lg font-semibold mb-3">Continue Reading</h2>
    <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2">
      {recents.map(r => {
        const title = items.find(t => t.source === r.source && t.source_id === r.source_id);
        const cover = title?.cover_path ? convertFileSrc(title.cover_path) : undefined;
        return (
          <Link
            key={`${r.source}_${r.source_id}`}
            to={`/r/${r.source}/${r.source_id}/${r.chapter_id}`}
            className="snap-start flex-shrink-0 w-40 group"
          >
            <div className="aspect-[2/3] rounded-lg overflow-hidden glass relative">
              {cover && <img src={cover} alt={title?.title ?? r.source_id} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-ink-900/80">
                <div className="h-full bg-accent transition-all duration-500" style={{ width: `${Math.round(r.position_pct * 100)}%` }} />
              </div>
            </div>
            <p className="text-sm font-medium line-clamp-2 mt-2">{title?.title ?? "Untitled"}</p>
            <p className="text-xs text-ink-300">{Math.round(r.position_pct * 100)}% — ch. {r.chapter_id.replace(/^chapter-/, "")}</p>
          </Link>
        );
      })}
    </div>
  </section>
)}
```

Pull `recents` from `useLibrary()` alongside `items`.

- [ ] **Step 3: Verify**

```powershell
pnpm vite build
pnpm exec vitest run
```

Expected: clean.

- [ ] **Step 4: Commit**

```powershell
git add -A
git commit -m "feat(library): add Continue Reading carousel with progress bar"
```

---

## Task 14: End-to-end smoke verification + tag

- [ ] **Step 1: Run full test suite**

```powershell
cd src-tauri
cargo test
cd ..
pnpm exec vitest run
```

Expected: all green. Rust tests should now be ~18 (11 prior + 3 novelfire + 4 generic). Frontend tests ~4 (shell, cover-card, manga-reader, novel-reader).

- [ ] **Step 2: Debug build**

```powershell
pnpm tauri build --debug
```

Expected: clean build, `src-tauri/target/debug/reading.exe` updated.

- [ ] **Step 3: Manual smoke (user does this)**

Launch via `start.bat`. Test:
- Browse → tab to NovelFire → see real novels
- Click a novel → Title detail → click a chapter → NovelReader opens, paginates, arrows + Esc work
- Back to Browse → MangaDex → click a chapter → MangaReader opens, prev/next + arrow keys + Esc work
- Paste a URL into the Paste bar → goes to reader and renders best-effort
- Library → "Continue Reading" carousel shows the chapters you opened, with progress bars

- [ ] **Step 4: Commit + tag**

```powershell
git add -A
git commit --allow-empty -m "chore: phase 2 (novelfire + reader) complete"
git tag -a phase-2 -m "Phase 2: NovelFire + manual Reader UI"
```

---

## What's next (Phase 3, drafted after Phase 2 lands)

- Audio module: `rodio` playback queue + state machine
- Kokoro-82M ONNX integration via `ort` crate (inference + streaming PCM out)
- Reader: auto-play mode toggle, audio scrubber, voice picker, speed control
- Karaoke-style word highlight as audio plays

Florence-2 vision OCR for manga panel reading order is Phase 4. Emotion + multi-voice is Phase 5.
