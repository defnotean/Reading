# Reading - Project Status

> Single source of truth for what's shipped, what's next, and what's not started.
> Last updated: 2026-05-24

## Done

### Phase 1 - Foundation (tagged `phase-1`)
Tauri 2 + React + Tailwind shell, MangaDex source, SQLite library + progress, on-disk cover cache, Browse / Title Detail / Library routes, toast system, IPC layer, Rust + Vitest test harnesses.

See [`docs/superpowers/plans/2026-05-09-phase-1-foundation.md`](superpowers/plans/2026-05-09-phase-1-foundation.md) - all 20 tasks complete.

### Phase 2 - NovelFire + Manual Reader (tagged `phase-2`)
NovelFire HTML scraper, generic-URL paste fallback, Browse source tabs, manga reader (paginated + continuous, RTL, fit modes), novel reader (paginated + continuous, themes, fonts, spacing), keyboard shortcuts, chapter picker, progress tracking, Continue Reading carousel.

See [`docs/superpowers/plans/2026-05-09-phase-2-novelfire-reader.md`](superpowers/plans/2026-05-09-phase-2-novelfire-reader.md) - all 14 tasks complete.

### Beyond-plan additions
Shipped on top of the original Phase 1/2 plans:
- **ComicK source** - third browse tab, also acts as a MangaDex external-chapter fallback
- **Custom titlebar** - drag region + minimize/maximize/close, including window-controls tests
- **Genre/language section rows** - MangaDex (12 rows incl. Manhua/Manhwa), ComicK (7), NovelFire (6)
- **Full Settings route** - manga + novel defaults, theme, font, size, spacing, cache reset
- **Reader hardening** - `ReaderShell`, `ChapterPicker`, `ReaderSettings`, `ShortcutsOverlay`, `useAutoHideChrome`, `useReaderSettings`, `useCache` hooks
- **Security tests** - `http_security_tests` (SSRF/MIME guard via `http::get_user_html`), `generic_security_tests`
- **Quality gate** - `pnpm check` runs typecheck + tests + build
- **Project docs sync** - README, this roadmap, and Phase 1/2 plan checkboxes now reflect shipped work

## Next

In recommended order:

1. **GitHub Actions CI** - implement the workflow planned in [`docs/superpowers/plans/2026-05-25-cross-platform-mobile-linux.md`](superpowers/plans/2026-05-25-cross-platform-mobile-linux.md): Windows/Linux quality gates for `pnpm check` + `cargo test` + `cargo clippy`, plus a manual/tag-only Linux Tauri bundle job that asserts and uploads `.deb`, `.AppImage`, or `.rpm` artifacts.
2. **Draft `phase-3-audio.md`** - decompose spec section 6 (Kokoro + rodio + emotion + audio state machine) and section 7.4 (auto-play UI, karaoke highlight, scrubber, voice picker, emotion slider) into TDD slices. Strategy: build the state machine + IPC events + frontend controls against a **fake audio driver** first, then wire in real Kokoro ONNX.
3. **Phase 2 polish folded into Phase 3 prep** - virtualize `ChapterList.tsx`, add an "All" source tab, add explicit refresh buttons where useful, and clarify Title Detail CTAs before audio controls make the reader surface busier.

## Not started

| Phase | Scope |
|---|---|
| **Phase 3** | Audio: `rodio` playback, `idle/loading/playing/paused/stopped` state machine, `tts:*` IPC events, reader play/pause/scrubber/speed/voice controls, word-level highlighting, Kokoro-82M ONNX integration via `ort` |
| **Phase 4** | Manga AI: Florence-2 OCR per page, region ordering (RTL/LTR), bubble/caption/SFX classification |
| **Phase 5** | Expressive delivery: distilbert-emotion per region/sentence, multi-voice character/narrator assignment, emotion intensity slider |

## Open polish (deferred, no phase)

- Status filters in Browse (spec section 7.2 mentions "By status")
- Filter row vs section rows - current UI uses section rows; spec implies a filter chip row
- Generic source edge cases: lazy-loaded `<img data-src>`, CSS-only galleries, SPA shells
- Title Detail CTAs: "Continue" vs "Start from Chapter 1" (spec section 7.3)
