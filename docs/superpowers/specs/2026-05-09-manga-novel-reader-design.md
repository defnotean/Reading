# Reading — Manga & Web Novel Audiobook Desktop App

**Status:** Design approved, ready for implementation plan
**Date:** 2026-05-09
**Owner:** defnotean
**Working title:** *Reading* (rename welcome)

## 1. Summary

A Windows desktop app that turns manga and web novels into audio. The user pastes a URL or browses an in-app catalog of titles from MangaDex (manga) and NovelFire (novels), opens any chapter, and the app reads it aloud with on-device AI — vision-OCR for manga panels, emotion-aware TTS for both formats. Two reading modes (auto-play "audiobook" and manual page-by-page reader). Heavy emphasis on a polished, animated UI.

Everything runs offline after install. No API keys, no cloud calls, no account.

## 2. Goals & non-goals

### Goals
- Read **MangaDex** manga and **NovelFire** novels aloud, end-to-end, offline.
- Read text and dialogue with **emotional variation** — different voices per character / mood, not a flat narration.
- Browse catalogs in-app: covers, authors, synopses, search, popular/latest sorts.
- Two playback modes: immersive auto-play and manual reader.
- Track reading progress per title; resume where you left off.
- Polished, animated UI worth showing off.

### Non-goals (v1)
- Account/sync across devices.
- Translation. We read whatever language the source serves; English content is the primary target.
- Bypassing Cloudflare aggressively. If NovelFire blocks us hard, we surface a clear error.
- Mobile or macOS/Linux builds. Windows-only first; cross-platform considered after.
- Generating original art / image-prompted ambient backgrounds for novel mode.
- Editing or correcting OCR output by hand.

## 3. User flows

### Browse → Read
1. App opens to **Browse** with two tabs: MangaDex and NovelFire. Default sort: Trending.
2. User clicks a cover → **Title Detail** with synopsis, author, full chapter list.
3. User clicks **Continue** (resume last position) or any chapter.
4. **Reader** opens. Default mode = whatever the user set in Settings (auto-play or manual).
5. In auto-play, chapter starts reading immediately; in manual, user clicks "speak" per page or paragraph.
6. Progress is persisted continuously.

### Paste-URL flow
1. User pastes a MangaDex / NovelFire / arbitrary URL into a top-bar address field.
2. App routes the URL to the appropriate `Source` adapter (or generic fallback).
3. Lands directly in Reader.

### Library
1. Star button on Title Detail adds to library.
2. Library screen shows starred titles + a "Continue Reading" carousel sorted by most-recent activity.

## 4. Architecture

### 4.1 Stack
- **Shell:** Tauri 2.x (Rust backend + system WebView2 frontend)
- **Frontend:** React 18 + TypeScript + Tailwind CSS + Framer Motion + Zustand for app state
- **Backend:** Rust (`tokio`, `reqwest`, `scraper`, `rusqlite`, `rodio`, `ort` for ONNX Runtime)
- **Build:** `pnpm` for the frontend, `cargo` via `tauri build`, NSIS installer + portable `.exe`

### 4.2 High-level diagram
```
┌───────────────────────────────────────────────────────┐
│  Tauri Desktop App (single .exe, fully offline)       │
│                                                       │
│  ┌─────────────────────┐   ┌──────────────────────┐  │
│  │ Frontend (WebView)  │   │ Backend (Rust)       │  │
│  │ React + Tailwind    │◄──┤                      │  │
│  │ + Framer Motion     │   │ ┌──────────────────┐ │  │
│  │                     │   │ │  Sources trait   │ │  │
│  │  • Browse (grid)    │   │ │  ├ MangaDex (API)│ │  │
│  │  • Title Detail     │   │ │  ├ NovelFire     │ │  │
│  │  • Reader (auto +   │   │ │  └ Generic       │ │  │
│  │     manual modes)   │   │ └──────────────────┘ │  │
│  │  • Library          │   │ ┌──────────────────┐ │  │
│  │  • Settings         │   │ │ AI runtime: ort  │ │  │
│  │                     │   │ │  ├ Florence-2    │ │  │
│  │  IPC ──────────────►├───┤  ├ Kokoro-82M     │ │  │
│  │  (Tauri commands)   │   │ │  └ distilbert-em │ │  │
│  │                     │   │ └──────────────────┘ │  │
│  │                     │   │ ┌──────────────────┐ │  │
│  │                     │   │ │ SQLite (library) │ │  │
│  │                     │   │ └──────────────────┘ │  │
│  └─────────────────────┘   └──────────────────────┘  │
│                                                       │
│  Bundled models (~400MB, all ONNX):                   │
│   • florence-2-base.onnx     (vision/OCR + layout)    │
│   • kokoro-82m.onnx + voices (TTS, multi-voice)       │
│   • distilbert-emotion.onnx  (per-line emotion tag)   │
└───────────────────────────────────────────────────────┘
```

### 4.3 Module boundaries

| Module | Responsibility | Talks to |
|---|---|---|
| `commands` | Thin Tauri command handlers; validate inputs, marshal to/from frontend | All others |
| `sources::*` | One impl of `Source` per site; HTTP + parsing + normalization | `cache`, network |
| `ai::florence` | Load + run Florence-2 ONNX, return `Vec<Region>` per page image | `ort` |
| `ai::kokoro` | Load + run Kokoro-82M ONNX, return PCM + word timings per chunk | `ort` |
| `ai::emotion` | Load + run distilbert-emotion ONNX, return label per text input | `ort` |
| `ai::pipeline` | Orchestrate the manga / novel pipelines; emit IPC events | All `ai::*`, `audio` |
| `audio` | `rodio` playback queue, state machine, progress events | `ai::pipeline` |
| `library` | SQLite reads/writes for titles, chapters, progress | rusqlite |
| `cache` | Disk LRU for covers, page images, chapter text | filesystem |

Each module is a single file or small folder, tested in isolation.

## 5. Source adapters

### 5.1 Common shape
```rust
#[async_trait]
pub trait Source: Send + Sync {
    fn id(&self) -> &'static str;
    fn kind(&self) -> ContentKind;     // Manga | Novel

    async fn browse(&self, list: BrowseList, page: u32) -> Result<Vec<TitleSummary>>;
    async fn search(&self, q: &str, page: u32)            -> Result<Vec<TitleSummary>>;
    async fn title(&self, id: &str)                       -> Result<Title>;
    async fn chapter(&self, title_id: &str, chapter_id: &str) -> Result<Chapter>;
}

pub enum BrowseList { Trending, Latest, ByGenre(String), ByStatus(Status) }
pub enum ContentKind { Manga, Novel }
pub enum Chapter {
    MangaPages(Vec<PageImage>),                                // ordered image URLs/paths
    NovelText { plain: String, paragraphs: Vec<String> },
}

pub struct TitleSummary {
    pub source: &'static str,
    pub source_id: String,
    pub title: String,
    pub author: Option<String>,
    pub cover_url: Option<String>,
    pub kind: ContentKind,
}

pub struct Title {
    pub summary: TitleSummary,
    pub synopsis: Option<String>,
    pub status: Option<String>,
    pub original_language: Option<String>,    // drives RTL vs LTR for manga
    pub genres: Vec<String>,
    pub chapters: Vec<ChapterSummary>,
}
```

### 5.2 MangaDex adapter
- **No scraping** — uses the public API at `https://api.mangadex.org`.
- Endpoints used:
  - `GET /manga` with `order[followedCount]=desc`, `availableTranslatedLanguage[]=en`, `contentRating[]=safe,suggestive,erotica` (configurable in Settings)
  - `GET /manga/{id}?includes[]=author,artist,cover_art` for detail
  - `GET /manga/{id}/feed?translatedLanguage[]=en&order[chapter]=asc&limit=500` for chapters (paginated)
  - `GET /at-home/server/{chapter_id}` for the CDN host + page filenames; build full image URLs from that
  - Covers: `https://uploads.mangadex.org/covers/{manga_id}/{filename}.512.jpg`
- Rate limit: 5 requests/sec, enforced via `tower::limit::rate::RateLimitLayer`.

### 5.3 NovelFire adapter
- **HTML scraping** at `https://novelfire.net` using `reqwest` + `scraper`.
- URLs:
  - Browse: `/genre-all-popular`, `/genre-all-newest`, `/genre/{genre}`
  - Title: `/book/{slug}` — title, author, cover `<img>`, synopsis, full chapter list (often paginated; follow "next" links)
  - Chapter: `/book/{slug}/chapter-{n}` — extract main content `<div id="content">`, strip ads/scripts
- Polite rate limit: 1 request/sec. Realistic `User-Agent`. Retry-with-backoff on 5xx.
- **Cloudflare risk:** if a 403 challenge is returned, surface a clear "site is blocking us" error rather than silently failing. Plan B if it becomes a recurring problem (post-v1): use Tauri's webview as a fetch backend so the user's browser-equivalent cookie context is reused.

### 5.4 Generic URL fallback
- For arbitrary URLs the user pastes that aren't MangaDex/NovelFire.
- Sniff `<head>` and image count to guess **manga** (many large images, gallery layout) vs **novel** (long article-shaped main content).
- Novels: Readability-style heuristics via the `dom_smoothie` crate — pick the densest text block.
- Manga: collect all `<img>` with width > 500px in document order.
- Always shows a banner: *"Treating this as a novel — looks wrong? Tap to switch to manga."*
- Best-effort only. Failure mode is "couldn't parse — try a different URL," not a crash.

### 5.5 Caching layout
```
%APPDATA%/Reading/
  cache/
    covers/   {source}_{id}.jpg              (LRU, 200MB cap)
    pages/    {source}_{title}_{chap}/*.jpg  (LRU, 1GB cap, configurable)
    text/     {source}_{title}_{chap}.txt    (small, no cap)
  metadata/
    library.sqlite                           (titles, chapters, progress)
  models/
    florence-2-base.onnx
    kokoro-82m.onnx + voices/
    distilbert-emotion.onnx
  settings.json
```
Search/browse responses cached in-memory for 5 min. Manual "refresh" button on every list. No automatic background sync.

## 6. AI pipeline

### 6.1 Manga page → speech
1. Load page image from cache (download via `Source` if missing).
2. **Florence-2 `<OCR_WITH_REGION>`** → list of `{text, bbox}` regions, up to ~30 per page.
3. **Region sort** in manga reading order:
   - RTL = `true` if `title.original_language == "ja"`, else LTR.
   - Group regions by row using y-bucket clustering (page height / ~6).
   - Sort within each row by x descending (RTL) or ascending (LTR).
4. **Region classify** with cheap geometric heuristics (no extra model):
   - **Bubble:** moderate text length, near image center, balanced bbox aspect.
   - **SFX:** very short, irregular bbox aspect, often near edges → skip OR read as punchy aside (configurable).
   - **Caption:** narrow horizontal box at top/bottom of page → narrator voice.
5. **Per-region emotion classify** with distilbert-emotion → one of `{joy, sadness, anger, fear, love, surprise, neutral}`.
6. **Voice selection:**
   - Captions → narrator voice (warm, steady).
   - Bubbles → rotating character bank (2–3 voices) within a chapter so back-and-forth feels distinct.
   - Emotion modulates speed/pitch/style-mix weights via Kokoro's style vectors.
7. **Kokoro-82M synthesis** → PCM chunks + word-level timings → audio queue.

### 6.2 Novel chapter → speech
1. Load chapter plain text.
2. **Sentence segmentation** via `srx-rs` (or hand-ported pragmatic_segmenter rules — final choice during implementation).
3. **Dialogue extraction:** regex match `"..."`, `"..."`, `「...」`, `'...'`. Detect speaker from surrounding `"X said"`, `"said X"`, `"—X"`.
4. **Per-sentence emotion classify** with distilbert-emotion.
5. **Voice assignment:**
   - Narration → narrator voice (consistent across chapter).
   - Dialogue → per-speaker map: `speaker_name → voice` (sticky within chapter; alternate among 2–3 voices for unattributed lines).
6. **Kokoro-82M synthesis** → PCM chunks + word-level timings → audio queue.

### 6.3 Shared TTS rendering layer
- **Streaming:** synthesize chunk-by-chunk (sentence or region), start playing as soon as chunk #1 lands. Lookahead buffer of 3 chunks so playback never stalls.
- **Playback:** `rodio` for cross-platform audio out, with a custom queue that emits progress events.
- **Word-level timestamps:** Kokoro's ONNX export returns the phoneme alignment matrix; we collapse phonemes back to words via the input tokenizer to produce `[(word, start_ms, end_ms)]`. Frontend uses these for the karaoke highlight via `requestAnimationFrame`.
- **State machine** (strict): `Idle → Loading → Playing → Paused → Stopped`. Illegal transitions are logged and dropped, never panic.
- **IPC events emitted to frontend:**
  - `tts:chunk_started   { chunk_idx, words: [{w, t0, t1}], region_idx? }`
  - `tts:word            { idx }` — drives highlight
  - `tts:chunk_finished  { idx }`
  - `tts:page_finished   { advance_to: n }` — drives auto-advance
  - `tts:error           { code, message }`
- **Emotion intensity slider (0..1):** scales the modulation magnitude of voice swap / speed / pitch / style mix. At 0, everything reads in narrator voice flat. At 1, full character + emotion swap-in. Default 0.7.
- **Performance:**
  - All three ONNX models loaded once at app start, kept warm.
  - DirectML execution provider on Windows for GPU; CPU fallback. Florence-2 ~150ms/page on a 3060, ~1s on CPU. Kokoro real-time on CPU.
  - Precompute the next page or sentence's audio while current plays.

### 6.4 "Maximum emotion" levers (in order of impact)
1. **Voice swap** — joy/love → bright voice, sadness → soft voice, anger → firm voice, fear → trembling voice. Biggest lever.
2. **Speed** — anger/joy ×1.1–1.2, sadness ×0.85, fear varied.
3. **Pitch shift** — small ±5%; surprise/joy up, sadness down.
4. **Punctuation respect** — Kokoro already handles `…`, `!`, `?`; we add 50–150ms breath pause between dialogue lines from different speakers.
5. **Sound-effect sass (manga only)** — short SFX text ("BANG!", "WHOOSH") read at ×1.3 speed, +20% pitch in the narrator voice, then a beat of silence.

## 7. UX surfaces

### 7.1 Global shell
Left rail with three icon-only destinations (**Browse**, **Library**, **Settings**), expanding labels on hover. Dark theme by default with glassmorphism panels. `<LayoutGroup>` Framer Motion wrapper for shared-element transitions across screens — the cover image flies smoothly from grid → detail → reader.

### 7.2 Browse
- Source tabs: MangaDex / NovelFire / All
- Filter row: Trending, Latest, By genre, By status; right-aligned 🔍 search
- Cover grid (5–6 columns, responsive), virtualized for long lists
- Stagger fade-in on load. Hover = lift + tilt + parallax on the cover. Click → shared-element transition into Title Detail.

### 7.3 Title Detail
- Hero: large sharp cover over the same cover blurred and scaled as the background.
- Title, author, status, genres, synopsis on the right.
- Below: **virtualized** chapter list (manga can have 1000+ chapters).
- Primary CTAs: **Continue** (resumes last position) and **Start from Chapter 1**.
- Star toggle for "Add to Library".

### 7.4 Reader (mode toggle in top-right pill)

**Auto-play mode** — immersive, low-chrome:
- Big focal art (current manga page; for novels, the cover or a generated ambient gradient)
- Animated waveform visualizer (Web Audio `AnalyserNode` → `<canvas>`)
- Current sentence/bubble shown below in large type, **karaoke word-by-word highlight** as Kokoro speaks
- Bottom dock: ⏮ ⏯ ⏭ scrubber, speed (0.75/1/1.25/1.5/2x), voice picker, emotion-intensity slider
- Auto-advances pages/chapters; subtle ambient pulse animation timed to audio amplitude

**Manual mode** — content-first:
- Manga: full-width page, click left/right to navigate. Active speech bubble glows + scales subtly while being read; ⏯ button per page.
- Novel: paginated text or continuous scroll. Current paragraph has a subtle gradient glow; word highlights as TTS plays.
- "Read this page" / "Read from here" buttons, plus the same dock controls in slimmer form.

### 7.5 Library
- "Continue Reading" carousel up top (snap-scroll, hero-sized cards showing % progress as a ring around the cover).
- "Saved" grid below.
- Long-press / right-click → Remove / Mark complete / Reset progress.

### 7.6 Settings
- Voice picker (preview each Kokoro voice with a sample line)
- Default mode (auto-play vs manual)
- Emotion intensity (0 = monotone, 1 = full performance)
- Manga reading direction default (RTL/LTR/auto)
- MangaDex content rating filter
- Cache management (clear images, clear models, recompute model files)

## 8. Data model

SQLite at `%APPDATA%/Reading/metadata/library.sqlite`.

```sql
CREATE TABLE titles (
  source       TEXT NOT NULL,                  -- 'mangadex' | 'novelfire' | 'generic'
  source_id    TEXT NOT NULL,
  kind         TEXT NOT NULL,                  -- 'manga' | 'novel'
  title        TEXT NOT NULL,
  author       TEXT,
  cover_path   TEXT,                           -- relative to cache/covers/
  synopsis     TEXT,
  status       TEXT,
  original_lang TEXT,
  genres_json  TEXT,
  added_at     INTEGER NOT NULL,
  starred      INTEGER NOT NULL DEFAULT 0,     -- 1 = in Library
  PRIMARY KEY (source, source_id)
);

CREATE TABLE chapters (
  source       TEXT NOT NULL,
  source_id    TEXT NOT NULL,                  -- title id
  chapter_id   TEXT NOT NULL,
  number       REAL,
  title        TEXT,
  published_at INTEGER,
  PRIMARY KEY (source, source_id, chapter_id),
  FOREIGN KEY (source, source_id) REFERENCES titles(source, source_id)
);

CREATE TABLE progress (
  source       TEXT NOT NULL,
  source_id    TEXT NOT NULL,
  chapter_id   TEXT NOT NULL,
  position_pct REAL NOT NULL,                  -- 0.0 – 1.0 within the chapter
  updated_at   INTEGER NOT NULL,
  PRIMARY KEY (source, source_id)              -- only most-recent chapter is kept
);

CREATE INDEX idx_progress_updated ON progress(updated_at DESC);
CREATE INDEX idx_titles_starred  ON titles(starred);
```

- **Library** = `SELECT * FROM titles WHERE starred=1`
- **Continue Reading** = join `progress` ↔ `titles`, order by `progress.updated_at DESC`, limit 10
- Progress is updated every ~5 seconds during playback, debounced

Settings live in a single `settings.json` next to the DB — voice preferences, default mode, emotion intensity, RTL toggle, cache caps.

## 9. Errors

| Class | Example | Behavior |
|---|---|---|
| Transient | MangaDex timeout, NovelFire 5xx | Exponential backoff via `tower::retry`, max 3 attempts, then toast: *"MangaDex unreachable — try again in a moment"* |
| Permanent | NovelFire selector renamed; 404 | Log full context, toast: *"Couldn't read this chapter — the site may have changed"*, do not retry automatically |
| Hard block | Cloudflare 403 | Toast: *"NovelFire is blocking automated requests. Open the chapter in your browser to refresh the cookies."* with a "Retry" button |
| AI empty | Florence-2 returns no regions | Emit `tts:page_skipped`, advance silently, log the page id for review |
| AI corrupt | Bad model file at startup | Block app with "re-download model" CTA; do not silently recover |

State invariants enforced in Rust: TTS state machine validates every transition; illegal commands are logged and dropped, never panic.

## 10. Testing strategy

| Layer | Tool | Coverage |
|---|---|---|
| Source parsers | Rust unit + fixture files | Snapshot of MangaDex JSON + saved NovelFire HTML — guarantees parsing stays correct without hitting the network |
| Region sort / dialogue extract | Rust unit | Synthetic bbox sets, dialogue regex, sentence split |
| AI pipeline wiring | Rust integration #1 | One fixture page image → asserted text sequence (proves ONNX models load + run) |
| End-to-end reader | Rust integration #2 | Fake `Source` impl → driver replays a chapter → asserts the exact ordered list of `tts:chunk_started` events |
| Frontend components | Vitest | Component-level state, store reducers |
| Smoke / visual | Playwright (Tauri webview, dev mode) | Browse → open title → press play → assert at least one `tts:word` event fires |
| Manual QA | Checklist | Top-10 MangaDex titles + top-5 NovelFire titles before each release |

The two Rust integration tests are load-bearing: if the fake-source replay test passes, the whole stack works end-to-end without internet or audio hardware in CI.

## 11. Project layout

```
Reading/
├── docs/superpowers/specs/2026-05-09-manga-novel-reader-design.md
├── src-tauri/                 # Rust core
│   ├── src/
│   │   ├── main.rs
│   │   ├── commands.rs        # Tauri command handlers
│   │   ├── sources/
│   │   │   ├── mod.rs
│   │   │   ├── mangadex.rs
│   │   │   ├── novelfire.rs
│   │   │   └── generic.rs
│   │   ├── ai/
│   │   │   ├── florence.rs
│   │   │   ├── kokoro.rs
│   │   │   ├── emotion.rs
│   │   │   └── pipeline.rs
│   │   ├── library.rs
│   │   ├── cache.rs
│   │   └── audio.rs
│   ├── tests/
│   ├── fixtures/              # mangadex_*.json, novelfire_*.html, page_*.jpg
│   ├── Cargo.toml
│   └── tauri.conf.json
├── src/                       # React frontend
│   ├── routes/                # Browse, Title, Reader, Library, Settings
│   ├── components/
│   ├── stores/                # Zustand
│   ├── ipc/                   # typed wrappers around Tauri commands
│   └── main.tsx
├── package.json
├── vite.config.ts
└── README.md
```

## 12. Build & distribution

- `pnpm tauri build` → Windows NSIS installer + portable `.exe`.
- Models ship as Tauri **resources**, copied to `%APPDATA%/Reading/models/` on first launch (lets future app updates skip re-downloading the 400MB).
- WebView2 is system-installed on Windows 11 → no bundled runtime.
- **Total installer:** ~415MB (10MB shell + 400MB models + ~5MB frontend).
- Updater: Tauri's built-in updater pointing at GitHub Releases, signature-checked.
- Code signing: skipped for personal use; README documents the SmartScreen *"More info → Run anyway"* workaround.
- CI: GitHub Actions, single Windows runner, builds on git tag.

## 13. Risks & open questions

| Risk | Likelihood | Mitigation |
|---|---|---|
| NovelFire Cloudflare-blocks scraping requests | Medium | Polite rate limit + realistic UA. Plan B: Tauri webview fetch backend. |
| Florence-2 OCR quality on heavily stylized manga fonts | Medium | Florence is much better than Tesseract here; if a page comes back empty we skip silently and log for tuning. |
| ONNX Runtime + DirectML wheel availability for `ort` crate | Low | `ort` 2.x supports DML; CPU is the tested fallback path. |
| Kokoro phoneme→word alignment for karaoke timing | Low–Medium | First pass: even-distribution over chunk duration (good enough). Real alignment is a polish task. |
| MangaDex API rate or ToS changes | Low | Single-source dependency; graceful failure + clear error. |
| App size (~415MB) feels large | Low | Acceptable for a desktop AI app; user accepted the tradeoff. |

### Open questions to resolve during implementation planning
- Exact Kokoro voice → emotion mapping table (taste-driven; tune in implementation)
- Whether to support `srx-rs` or hand-port pragmatic_segmenter rules for sentence splitting
- Whether SFX in manga should be skipped or read with the punchy delivery, by default

## 14. Success criteria

- Paste a MangaDex chapter URL → audio starts playing within 3 seconds, with at least 80% of speech bubbles read in the correct order.
- Paste a NovelFire chapter URL → audio starts within 2 seconds, with proper sentence segmentation and clear narrator/dialogue separation.
- Browse → click cover → opens detail in <300ms with smooth shared-element transition.
- Library and "Continue Reading" survive app restarts.
- Emotion intensity 0 vs 1 is clearly audibly different to the user.
- App runs offline after first launch.

