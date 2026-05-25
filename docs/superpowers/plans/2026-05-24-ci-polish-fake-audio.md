# Reading CI, Polish, and Fake Audio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add CI, finish the small Phase 2 polish items, and ship the first Phase 3 fake-audio slice with tests before real audio/model work begins.

**Architecture:** CI lands first so every later slice has a shared quality gate. Phase 2 polish is split across cache/browse and title/chapter surfaces. Phase 3 starts with a deterministic novel-text fake TTS driver behind the same command/event contract that later `rodio` and Kokoro code will use.

**Tech Stack:** GitHub Actions on `windows-2022`, pnpm 10.33.4, Node 22, Rust stable MSVC, Tauri 2, React 19, Zustand 5, Vitest 4, Rust integration tests, `parking_lot`, `tokio`.

---

## Current Facts

- Package scripts live in `package.json`.
- Use `pnpm.cmd` in local PowerShell because `pnpm.ps1` can be blocked by execution policy.
- Rust commands may need `$env:PATH="$env:USERPROFILE\.cargo\bin;$env:PATH"` locally.
- `.github/workflows/` exists but has no workflow files.
- The product spec requires manual refresh buttons on lists, virtualized chapter lists, and a strict TTS state machine.
- The next audio slice must not add `rodio`, `ort`, Kokoro assets, Florence OCR, or emotion models.
- Official action docs were checked before writing this plan:
  - `actions/checkout@v6`
  - `actions/setup-node@v6`
  - `pnpm/action-setup@v6`
  - Tauri Windows prerequisites: Microsoft C++ Build Tools and WebView2.

## Parallel Execution Strategy

Use multiple workers, but keep write scopes disjoint.

1. **CI worker**
   - Owns only `.github/workflows/ci.yml`.
   - Does not touch app code.
2. **Browse/cache worker**
   - Owns `src/stores/useCache.ts`, optional `src/stores/useCombinedSources.ts`, `src/components/BrowseSection.tsx`, `src/routes/BrowseRoute.tsx`, and browse/cache tests.
3. **Title/chapter worker**
   - Owns `src/routes/TitleRoute.tsx`, `src/routes/LibraryRoute.tsx`, `src/components/ChapterList.tsx`, and title/chapter/library tests.
   - Starts after the Browse/cache worker finishes `useCache.ts` so title refresh and CTA loading share one effect instead of racing two patches.
4. **Audio backend worker**
   - Owns `src-tauri/src/audio.rs`, Rust audio tests, and backend command wrappers.
5. **Audio frontend worker**
   - Starts after the backend command/event contract is stable.
   - Owns `src/ipc/tts.ts`, `src/stores/useTtsPlayback.ts`, `src/components/reader/AudioDock.tsx`, ReaderShell integration, and frontend TTS tests.
6. **Reviewer workers**
   - After each task, run a focused review against the task diff and plan acceptance criteria.
   - Important findings must be fixed before the next dependent task starts.

Workers are not alone in the codebase. They must not revert edits made by others and must adapt to already-landed changes.

## Files And Responsibilities

- `.github/workflows/ci.yml`: Windows CI and tag-only Tauri build validation.
- `src/stores/useCache.ts`: cache reads, invalidation, force-refresh options.
- `src/stores/useCombinedSources.ts`: aggregate MangaDex, ComicK, and NovelFire results for the All tab.
- `src/components/BrowseSection.tsx`: horizontal browse row, lazy load, inline error, refresh action.
- `src/routes/BrowseRoute.tsx`: source tabs, search, All-source behavior.
- `src/routes/LibraryRoute.tsx`: explicit library refresh action owned with title/chapter work.
- `src/routes/TitleRoute.tsx`: refresh title detail, Continue / Start from Chapter 1 CTAs owned in one task to avoid competing load-effect edits.
- `src/components/ChapterList.tsx`: virtualized long chapter list while preserving link/button semantics.
- `src-tauri/src/audio.rs`: fake TTS state machine, segmentation, deterministic event plan.
- `src-tauri/src/commands.rs`: TTS command wrappers and `AppState.audio`.
- `src-tauri/src/lib.rs`: exports `audio`.
- `src-tauri/src/main.rs`: registers TTS commands.
- `src/ipc/tts.ts`: typed Tauri invoke wrappers for TTS.
- `src/stores/useTtsPlayback.ts`: frontend playback state and Tauri event subscriptions.
- `src/components/reader/AudioDock.tsx`: bottom playback controls for novel text.
- `src/components/reader/ReaderShell.tsx`: mounts AudioDock for novels only in this slice.
- `src/types.ts`: shared TTS payload types.
- `docs/ROADMAP.md`: mark completed items and keep next steps current after implementation.

## Definition Of Done

- CI runs `pnpm run check`, Rust tests, and Rust clippy on Windows.
- Tag-only Tauri build validation exists and does not slow every PR.
- Browse lists and title/library surfaces have explicit refresh affordances.
- The All tab combines MangaDex, ComicK, and NovelFire predictably and tolerates partial source failure.
- Title Detail has honest CTAs: Continue only when valid progress exists; Start from Chapter 1 when a playable first chapter exists.
- ChapterList handles 1000+ chapters without rendering every row at once.
- Fake TTS supports novel text end-to-end through Rust state, Tauri commands, events, frontend store, and AudioDock.
- Fake TTS emits deterministic events and requires no real model files, audio hardware, `rodio`, `ort`, or internet in CI.
- Fresh verification passes before the final commit and push.

---

## Task 0: Execution Prep

**Files:**
- Read: `git status --short --branch`
- Read: `package.json`
- Read: `docs/ROADMAP.md`
- Read: this plan

- [ ] **Step 1: Confirm branch and cleanliness**

Run:

```powershell
git status --short --branch
```

Expected: either clean `main...origin/main` or only intentional files from the active task.

- [ ] **Step 2: Confirm local gates are available**

Run:

```powershell
pnpm.cmd --version
node --version
$env:PATH="$env:USERPROFILE\.cargo\bin;$env:PATH"; cargo --version
```

Expected: pnpm 10.x, Node 22.x or newer compatible LTS, and Cargo available.

- [ ] **Step 3: Run the current baseline**

Run:

```powershell
pnpm.cmd run check
$env:PATH="$env:USERPROFILE\.cargo\bin;$env:PATH"; cargo test --manifest-path src-tauri\Cargo.toml --locked
```

Expected: frontend check passes; Rust tests pass. If Rust fails because local PATH is missing, fix PATH first.

---

## Task 1: Add Windows CI

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Verify the workflow file is absent**

Run:

```powershell
Test-Path .github\workflows\ci.yml
```

Expected: `False`.

- [ ] **Step 2: Create `.github/workflows/ci.yml`**

Use this exact first version:

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]
    tags: ["v*"]

permissions:
  contents: read

jobs:
  windows-check:
    name: Windows check
    runs-on: windows-2022

    steps:
      - name: Checkout
        uses: actions/checkout@v6

      - name: Set up pnpm
        uses: pnpm/action-setup@v6

      - name: Set up Node
        uses: actions/setup-node@v6
        with:
          node-version: 22
          cache: pnpm
          cache-dependency-path: pnpm-lock.yaml

      - name: Set up Rust
        uses: dtolnay/rust-toolchain@stable
        with:
          targets: x86_64-pc-windows-msvc
          components: clippy

      - name: Cache Rust
        uses: Swatinem/rust-cache@v2
        with:
          workspaces: src-tauri -> target

      - name: Install frontend dependencies
        run: pnpm install --frozen-lockfile

      - name: Frontend check
        run: pnpm run check

      - name: Rust tests
        run: cargo test --manifest-path src-tauri/Cargo.toml --locked

      - name: Rust clippy
        run: cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --all-features --locked -- -D warnings

  tauri-build:
    name: Tag Tauri build
    runs-on: windows-2022
    needs: windows-check
    if: startsWith(github.ref, 'refs/tags/v')

    steps:
      - name: Checkout
        uses: actions/checkout@v6

      - name: Set up pnpm
        uses: pnpm/action-setup@v6

      - name: Set up Node
        uses: actions/setup-node@v6
        with:
          node-version: 22
          cache: pnpm
          cache-dependency-path: pnpm-lock.yaml

      - name: Set up Rust
        uses: dtolnay/rust-toolchain@stable
        with:
          targets: x86_64-pc-windows-msvc

      - name: Cache Rust
        uses: Swatinem/rust-cache@v2
        with:
          workspaces: src-tauri -> target

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build Tauri app
        run: pnpm run build:tauri
```

- [ ] **Step 3: Verify local commands match CI**

Run:

```powershell
pnpm.cmd install --frozen-lockfile
pnpm.cmd run check
$env:PATH="$env:USERPROFILE\.cargo\bin;$env:PATH"; cargo test --manifest-path src-tauri\Cargo.toml --locked
$env:PATH="$env:USERPROFILE\.cargo\bin;$env:PATH"; cargo clippy --manifest-path src-tauri\Cargo.toml --all-targets --all-features --locked -- -D warnings
pnpm.cmd run build:tauri
```

Expected: all pass. `build:tauri` is slower and mirrors the tag-only job; if it fails because the local machine is missing Windows packaging prerequisites, document the exact missing prerequisite before proceeding.

- [ ] **Step 4: Review and commit**

Run a reviewer against `.github/workflows/ci.yml`. Then commit with a detailed body:

```powershell
git add .github\workflows\ci.yml
git commit -m "ci: add Windows quality gates" -m "Context:
- The repository had an empty .github/workflows directory, so GitHub could not protect Phase 3 work from regressions.

Changes:
- Added a Windows 2022 CI workflow for frontend typecheck/tests/build, Rust tests, and clippy.
- Added a tag-only Tauri build validation job so release packaging is checked without slowing every PR.

Verification:
- pnpm install --frozen-lockfile
- pnpm run check
- cargo test --manifest-path src-tauri/Cargo.toml --locked
- cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --all-features --locked -- -D warnings
- pnpm run build:tauri"
```

---

## Task 2: Add Cache Force Refresh And Browse Refresh

**Files:**
- Modify: `src/stores/useCache.ts`
- Modify: `src/components/BrowseSection.tsx`
- Test: `tests/browse-section.test.tsx`

- [ ] **Step 1: Write failing cache and browse UI tests**

Add a `BrowseSection` test that proves refresh bypasses the cached value:

```tsx
test("BrowseSection refresh reloads the section with forceRefresh", async () => {
  cachedBrowseMock.mockResolvedValue([
    { source: "mangadex", source_id: "one", title: "One", kind: "manga" },
  ]);

  render(
    <MemoryRouter>
      <BrowseSection source="mangadex" list="trending" label="Trending" />
    </MemoryRouter>
  );

  await screen.findByText("One");
  fireEvent.click(screen.getByRole("button", { name: /refresh trending/i }));

  await waitFor(() => {
    expect(cachedBrowseMock).toHaveBeenLastCalledWith("mangadex", "trending", 0, { forceRefresh: true });
  });
});
```

- [ ] **Step 2: Verify the tests fail**

Run:

```powershell
pnpm.cmd test -- tests/browse-section.test.tsx
```

Expected: fails because force-refresh options and the BrowseSection refresh button do not exist yet.

- [ ] **Step 3: Implement cache options**

Change signatures in `src/stores/useCache.ts`:

```ts
interface CacheOptions {
  forceRefresh?: boolean;
}

export async function cachedBrowse(
  source: string,
  list: BrowseList,
  page = 0,
  options: CacheOptions = {},
): Promise<TitleSummary[]> {
  const cache = useCache.getState();
  const key = browseKey(source, list, page);
  const cached = options.forceRefresh ? null : cache.get<TitleSummary[]>("browse", key);
  // keep the existing stale-while-revalidate behavior below
}

export async function cachedGetTitle(
  source: string,
  id: string,
  options: CacheOptions = {},
): Promise<TitleDetail> {
  const cache = useCache.getState();
  const key = titleKey(source, id);
  const cached = options.forceRefresh ? null : cache.get<TitleDetail>("title", key);
  // keep the existing stale-while-revalidate behavior below
}
```

- [ ] **Step 4: Implement refresh buttons**

Use `RefreshCw` from `lucide-react`.

Required button label:

- Browse section: `Refresh ${label}`

Browse refresh must call:

```ts
cachedBrowse(source, list, 0, { forceRefresh: true })
```

Keep the inline error path from the current component. If refresh fails, show the inline error and keep the refresh button available.

- [ ] **Step 5: Verify and review**

Run:

```powershell
pnpm.cmd test -- tests/browse-section.test.tsx
pnpm.cmd run check
```

Expected: tests and full frontend gate pass. Request focused review on BrowseSection refresh behavior and cache invalidation.

---

## Task 3: Add The All Source Tab

**Files:**
- Create: `src/stores/useCombinedSources.ts`
- Modify: `src/routes/BrowseRoute.tsx`
- Modify: `src/components/BrowseSection.tsx`
- Test: `tests/browse-search.test.tsx`
- Test: `tests/browse-section.test.tsx`

- [ ] **Step 1: Write failing tests**

Add tests for source tabs and search fan-out:

```tsx
test("BrowseRoute All tab searches all public sources and renders successful results", async () => {
  searchMock.mockImplementation((source: string) => Promise.resolve([
    { source, source_id: `${source}-1`, title: `${source} result`, kind: source === "novelfire" ? "novel" : "manga" },
  ]));

  render(
    <MemoryRouter>
      <BrowseRoute />
    </MemoryRouter>
  );

  fireEvent.click(screen.getByRole("tab", { name: /all/i }));
  fireEvent.change(screen.getByPlaceholderText(/search all/i), { target: { value: "hero" } });
  act(() => { vi.advanceTimersByTime(300); });

  await screen.findByText("mangadex result");
  expect(searchMock).toHaveBeenCalledWith("mangadex", "hero");
  expect(searchMock).toHaveBeenCalledWith("comick", "hero");
  expect(searchMock).toHaveBeenCalledWith("novelfire", "hero");
});
```

Add a partial-failure test:

```tsx
test("BrowseRoute All search keeps successful source results when one source fails", async () => {
  searchMock.mockImplementation((source: string) => {
    if (source === "novelfire") return Promise.reject(new Error("blocked"));
    return Promise.resolve([
      { source, source_id: `${source}-1`, title: `${source} result`, kind: "manga" },
    ]);
  });

  render(
    <MemoryRouter>
      <BrowseRoute />
    </MemoryRouter>
  );

  fireEvent.click(screen.getByRole("tab", { name: /all/i }));
  fireEvent.change(screen.getByPlaceholderText(/search all/i), { target: { value: "hero" } });
  act(() => { vi.advanceTimersByTime(300); });

  await screen.findByText("mangadex result");
  expect(screen.getByText("comick result")).toBeInTheDocument();
});
```

Add an All-row refresh test in `tests/browse-section.test.tsx`:

```tsx
test("BrowseSection refresh uses the custom All-source loader with forceRefresh", async () => {
  const loadItems = vi.fn().mockResolvedValue([
    { source: "mangadex", source_id: "one", title: "One", kind: "manga" },
  ]);

  render(
    <MemoryRouter>
      <BrowseSection source="all" list="trending" label="Trending" loadItems={loadItems} />
    </MemoryRouter>
  );

  await screen.findByText("One");
  fireEvent.click(screen.getByRole("button", { name: /refresh trending/i }));

  await waitFor(() => {
    expect(loadItems).toHaveBeenLastCalledWith("trending", 0, { forceRefresh: true });
  });
});
```

- [ ] **Step 2: Verify tests fail**

Run:

```powershell
pnpm.cmd test -- tests/browse-search.test.tsx tests/browse-section.test.tsx
```

Expected: fails because the All tab and fan-out helper do not exist.

- [ ] **Step 3: Implement combined source helper**

Create `src/stores/useCombinedSources.ts`:

```ts
import { search as ipcSearch } from "../ipc/sources";
import { cachedBrowse } from "./useCache";
import type { BrowseList, TitleSummary } from "../types";

export const ALL_BROWSE_SOURCES = ["mangadex", "comick", "novelfire"] as const;
export type BrowseSourceId = (typeof ALL_BROWSE_SOURCES)[number];
export interface CombinedSourceOptions {
  forceRefresh?: boolean;
}

export async function searchAcrossSources(q: string): Promise<TitleSummary[]> {
  const settled = await Promise.allSettled(ALL_BROWSE_SOURCES.map(source => ipcSearch(source, q)));
  const rows = settled.flatMap(result => result.status === "fulfilled" ? result.value : []);
  if (rows.length === 0 && settled.some(result => result.status === "rejected")) {
    throw new Error("All sources failed to search.");
  }
  return rows;
}

export async function browseAcrossSources(
  list: BrowseList,
  page = 0,
  options: CombinedSourceOptions = {},
): Promise<TitleSummary[]> {
  const settled = await Promise.allSettled(
    ALL_BROWSE_SOURCES.map(source => cachedBrowse(source, list, page, options)),
  );
  const rows = settled.flatMap(result => result.status === "fulfilled" ? result.value : []);
  if (rows.length === 0 && settled.some(result => result.status === "rejected")) {
    throw new Error("All sources failed to load.");
  }
  return rows;
}
```

- [ ] **Step 4: Wire BrowseRoute and BrowseSection**

Update source typing:

```ts
type SourceId = "all" | "mangadex" | "novelfire" | "comick";
```

Add an `All` tab before MangaDex. For All sections, use shared sections only:

```ts
const ALL_SECTIONS: Section[] = [
  { id: "trending", label: "Trending", list: "trending" },
  { id: "latest", label: "Latest Updates", list: "latest" },
  { id: "action", label: "Action", list: { genre: "action" } },
  { id: "fantasy", label: "Fantasy", list: { genre: "fantasy" } },
  { id: "romance", label: "Romance", list: { genre: "romance" } },
];
```

For All search, call `searchAcrossSources(trimmedQuery)`.

For All browse rows, either pass `source="all"` and branch inside `BrowseSection`, or pass a `loadItems` prop. Prefer the prop to keep source behavior explicit:

```ts
interface Props {
  source: string;
  list: BrowseList;
  label: string;
  loadItems?: (list: BrowseList, page: number, options?: { forceRefresh?: boolean }) => Promise<TitleSummary[]>;
}
```

`BrowseSection` refresh rules:

- Default source rows call `cachedBrowse(source, list, 0, { forceRefresh: true })`.
- All-source rows call `loadItems(list, 0, { forceRefresh: true })`.
- All-source partial failures return successful source rows and show an inline error only when every source fails.

- [ ] **Step 5: Verify and review**

Run:

```powershell
pnpm.cmd test -- tests/browse-search.test.tsx tests/browse-section.test.tsx
pnpm.cmd run check
```

Expected: tests and frontend gate pass. Request focused review on All-source partial failure and source labels.

---

## Task 4: Clarify Title Detail CTAs And Title/Library Refresh

**Files:**
- Modify: `src/routes/TitleRoute.tsx`
- Modify: `src/routes/LibraryRoute.tsx`
- Test: `tests/title-route.test.tsx`
- Test: `tests/library-route.test.tsx`

- [ ] **Step 1: Write failing tests**

Mock `continueReading` in `tests/title-route.test.tsx` and add:

```tsx
test("TitleRoute shows Start from Chapter 1 when there is no saved progress", async () => {
  continueReadingMock.mockResolvedValue([]);
  getTitleMock.mockResolvedValue({
    ...detail,
    chapters: [{ chapter_id: "chapter-1", number: 1, title: "Chapter 1" }],
  });

  renderTitleRoute();

  const start = await screen.findByRole("link", { name: /start from chapter 1/i });
  expect(start).toHaveAttribute("href", "/r/mangadex/title-1/chapter-1");
  expect(screen.queryByRole("link", { name: /^continue$/i })).not.toBeInTheDocument();
});
```

Add ordering and external-chapter coverage:

```tsx
test("TitleRoute Start from Chapter 1 uses the lowest numeric playable chapter", async () => {
  continueReadingMock.mockResolvedValue([]);
  getTitleMock.mockResolvedValue({
    ...detail,
    chapters: [
      { chapter_id: "chapter-10", number: 10, title: "Chapter 10" },
      { chapter_id: "chapter-1", number: 1, title: "Chapter 1" },
      { chapter_id: "external-0", number: 0, title: "External", external_url: "https://example.com" },
    ],
  });

  renderTitleRoute();

  expect(await screen.findByRole("link", { name: /start from chapter 1/i })).toHaveAttribute("href", "/r/mangadex/title-1/chapter-1");
});
```

Add refresh tests in the same task so `TitleRoute` has one coordinated load effect:

```tsx
test("TitleRoute refresh reloads title details", async () => {
  renderTitleRoute();
  await screen.findByText("Audited Title");

  fireEvent.click(screen.getByRole("button", { name: /refresh title details/i }));

  await waitFor(() => {
    expect(getTitleMock).toHaveBeenCalledTimes(2);
  });
});
```

```tsx
test("LibraryRoute exposes a refresh button", async () => {
  render(
    <MemoryRouter>
      <LibraryRoute />
    </MemoryRouter>
  );

  fireEvent.click(screen.getByRole("button", { name: /refresh library/i }));

  await waitFor(() => {
    expect(refreshMock).toHaveBeenCalledTimes(2);
  });
});
```

```tsx
test("TitleRoute shows Continue when saved progress points at a playable chapter", async () => {
  continueReadingMock.mockResolvedValue([
    { source: "mangadex", source_id: "title-1", chapter_id: "chapter-2", position_pct: 0.4, updated_at: 1 },
  ]);
  getTitleMock.mockResolvedValue({
    ...detail,
    chapters: [
      { chapter_id: "chapter-1", number: 1, title: "Chapter 1" },
      { chapter_id: "chapter-2", number: 2, title: "Chapter 2" },
    ],
  });

  renderTitleRoute();

  expect(await screen.findByRole("link", { name: /^continue$/i })).toHaveAttribute("href", "/r/mangadex/title-1/chapter-2");
  expect(screen.getByRole("link", { name: /start from chapter 1/i })).toHaveAttribute("href", "/r/mangadex/title-1/chapter-1");
});
```

- [ ] **Step 2: Verify tests fail**

Run:

```powershell
pnpm.cmd test -- tests/title-route.test.tsx tests/library-route.test.tsx
```

Expected: fails because the CTA links and refresh buttons are not implemented.

- [ ] **Step 3: Import existing progress IPC and refresh cache**

`src/ipc/library.ts` already exports `continueReading`. Import it in `TitleRoute.tsx`, and update the existing test mock to include it:

```ts
continueReading: continueReadingMock,
```

Title refresh must call:

```ts
cachedGetTitle(source, id, { forceRefresh: true })
```

Library refresh must call the existing `refresh` action from `useLibrary`.

- [ ] **Step 4: Implement CTA rules**

In `TitleRoute.tsx`:

- Load `continueReading(50)` with title details.
- Find a progress row matching `source` and `id`.
- Ignore progress if its chapter is missing or external.
- `Start from Chapter 1` points to the playable chapter with the lowest numeric `number`.
- If no playable chapter has a numeric number, use the first non-external chapter in source order.
- Render:
  - `Continue` only for valid matching progress.
  - `Start from Chapter 1` for first playable chapter.
  - Neither in-app CTA for external-only titles.
  - `Refresh title details` as an icon button near the title action row.
  - `Refresh library` as an icon button near the Library heading.

- [ ] **Step 5: Verify and review**

Run:

```powershell
pnpm.cmd test -- tests/title-route.test.tsx tests/library-route.test.tsx
pnpm.cmd run check
```

Expected: tests and frontend gate pass. Request review on stale progress fallback, chapter ordering, and refresh behavior.

---

## Task 5: Virtualize Long Chapter Lists

**Files:**
- Modify: `src/components/ChapterList.tsx`
- Test: `tests/chapter-list.test.tsx`

- [ ] **Step 1: Write failing virtualization tests**

Add:

```tsx
test("ChapterList virtualizes long chapter lists", () => {
  const chapters = Array.from({ length: 300 }, (_, i) => ({
    chapter_id: `chapter-${i + 1}`,
    number: i + 1,
    title: `Chapter ${i + 1}`,
  }));

  render(
    <MemoryRouter>
      <ChapterList summary={summary} chapters={chapters} virtualizeAt={50} />
    </MemoryRouter>
  );

  expect(screen.getByText("Chapter 1")).toBeInTheDocument();
  expect(screen.queryByText("Chapter 300")).not.toBeInTheDocument();
});
```

Add scroll test:

```tsx
test("ChapterList renders later rows after scrolling a virtualized list", () => {
  const chapters = Array.from({ length: 300 }, (_, i) => ({
    chapter_id: `chapter-${i + 1}`,
    number: i + 1,
    title: `Chapter ${i + 1}`,
  }));

  render(
    <MemoryRouter>
      <ChapterList summary={summary} chapters={chapters} virtualizeAt={50} rowHeight={40} maxHeight={200} />
    </MemoryRouter>
  );

  const list = screen.getByRole("list", { name: /chapters/i });
  fireEvent.scroll(list, { target: { scrollTop: 8000 } });

  expect(screen.getByText(/Chapter 200|Chapter 201|Chapter 202/)).toBeInTheDocument();
});
```

Add semantic preservation tests:

```tsx
test("ChapterList keeps link semantics inside virtualized rows", () => {
  const chapters = Array.from({ length: 80 }, (_, i) => ({
    chapter_id: `chapter-${i + 1}`,
    number: i + 1,
    title: `Chapter ${i + 1}`,
  }));

  render(
    <MemoryRouter>
      <ChapterList summary={summary} chapters={chapters} virtualizeAt={10} />
    </MemoryRouter>
  );

  const list = screen.getByRole("list", { name: /chapters/i });
  expect(list).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /chapter 1/i })).toHaveAttribute("href", "/r/mangadex/title-1/chapter-1");
});
```

```tsx
test("ChapterList keeps external buttons working when virtualized", async () => {
  openUrlMock.mockResolvedValue(undefined);
  const chapters = Array.from({ length: 80 }, (_, i) => ({
    chapter_id: `chapter-${i + 1}`,
    number: i + 1,
    title: `Chapter ${i + 1}`,
    external_url: i === 0 ? "https://example.com/chapter-1" : null,
  }));

  render(
    <MemoryRouter>
      <ChapterList summary={summary} chapters={chapters} virtualizeAt={10} />
    </MemoryRouter>
  );

  fireEvent.click(screen.getByRole("button", { name: /chapter 1/i }));

  await waitFor(() => {
    expect(openUrlMock).toHaveBeenCalledWith("https://example.com/chapter-1");
  });
});
```

- [ ] **Step 2: Verify tests fail**

Run:

```powershell
pnpm.cmd test -- tests/chapter-list.test.tsx
```

Expected: fails because all rows render and the list has no virtualized scroll behavior.

- [ ] **Step 3: Implement virtualized rendering**

Extend the component API:

```ts
export function ChapterList({
  summary,
  chapters,
  from,
  virtualizeAt = 150,
  rowHeight = 42,
  maxHeight = 640,
}: {
  summary: TitleSummary;
  chapters: ChapterSummary[];
  from?: string;
  virtualizeAt?: number;
  rowHeight?: number;
  maxHeight?: number;
}) {
```

Rules:

- Keep current non-virtual `<ul>` path for small lists.
- Extract a `ChapterRow` helper so link/button semantics are identical in both paths.
- For long lists, render a scrollable list with fixed `rowHeight`, total spacer height, visible rows, and 8-row overscan.
- Add `aria-label="Chapters"` to the list.
- Preserve `Link` rows for in-app chapters and `button` rows for external chapters in both normal and virtualized paths.
- Keep rows keyboard reachable; do not replace links/buttons with `div` click handlers.

- [ ] **Step 4: Verify and review**

Run:

```powershell
pnpm.cmd test -- tests/chapter-list.test.tsx
pnpm.cmd run check
```

Expected: existing external URL error test still passes; virtualization tests pass. Request accessibility-focused review.

---

## Task 6: Build The Rust Fake TTS State Machine

**Files:**
- Create: `src-tauri/src/audio.rs`
- Modify: `src-tauri/src/lib.rs`
- Test: `src-tauri/tests/audio_tests.rs`

- [ ] **Step 1: Write failing Rust tests**

Create `src-tauri/tests/audio_tests.rs`:

```rust
use reading_lib::audio::{AudioManager, TtsPlaybackState};

#[test]
fn fake_driver_segments_text_into_chunks() {
    let chunks = AudioManager::segment_text("Hello world. Second sentence here.");
    assert_eq!(chunks.len(), 2);
    assert_eq!(chunks[0].words.iter().map(|w| w.word.as_str()).collect::<Vec<_>>(), vec!["Hello", "world"]);
}

#[test]
fn play_pause_resume_stop_transitions_state() {
    let manager = AudioManager::default();
    manager.load_fake_chapter("novelfire", "title", "chapter", "Hello world.", 1.0, "narrator").unwrap();
    assert_eq!(manager.status().state, TtsPlaybackState::Playing);
    manager.pause().unwrap();
    assert_eq!(manager.status().state, TtsPlaybackState::Paused);
    manager.resume().unwrap();
    assert_eq!(manager.status().state, TtsPlaybackState::Playing);
    manager.stop().unwrap();
    assert_eq!(manager.status().state, TtsPlaybackState::Stopped);
}

#[test]
fn seek_clamps_to_valid_position() {
    let manager = AudioManager::default();
    manager.load_fake_chapter("novelfire", "title", "chapter", "one two three", 1.0, "narrator").unwrap();
    manager.seek(99_999).unwrap();
    assert_eq!(manager.status().elapsed_ms, manager.status().duration_ms);
}

#[test]
fn fake_word_events_are_deterministic() {
    let chunks = AudioManager::segment_text("one two.");
    assert_eq!(chunks[0].words[0].start_ms, 0);
    assert_eq!(chunks[0].words[0].end_ms, 280);
    assert_eq!(chunks[0].words[1].start_ms, 280);
    assert_eq!(chunks[0].words[1].end_ms, 560);
}
```

- [ ] **Step 2: Verify tests fail**

Run:

```powershell
$env:PATH="$env:USERPROFILE\.cargo\bin;$env:PATH"; cargo test --manifest-path src-tauri\Cargo.toml --test audio_tests
```

Expected: fails because `reading_lib::audio` does not exist.

- [ ] **Step 3: Implement `audio.rs`**

Required public API:

```rust
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize)]
#[serde(rename_all = "snake_case")]
pub enum TtsPlaybackState {
    Idle,
    Loading,
    Playing,
    Paused,
    Stopped,
    Finished,
    Error,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct TtsStatus {
    pub state: TtsPlaybackState,
    pub source: Option<String>,
    pub title_id: Option<String>,
    pub chapter_id: Option<String>,
    pub chunk_idx: usize,
    pub word_idx: usize,
    pub elapsed_ms: u64,
    pub duration_ms: u64,
    pub speed: f32,
    pub voice: String,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct FakeWordTiming {
    pub word: String,
    pub start_ms: u64,
    pub end_ms: u64,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct FakeChunk {
    pub chunk_idx: usize,
    pub words: Vec<FakeWordTiming>,
    pub start_ms: u64,
    pub end_ms: u64,
}

#[derive(Clone)]
pub struct AudioManager {
    inner: std::sync::Arc<parking_lot::Mutex<AudioState>>,
}

#[derive(Debug, Clone)]
struct AudioState {
    status: TtsStatus,
    chunks: Vec<FakeChunk>,
    generation: u64,
}

impl Default for TtsStatus {
    fn default() -> Self {
        Self {
            state: TtsPlaybackState::Idle,
            source: None,
            title_id: None,
            chapter_id: None,
            chunk_idx: 0,
            word_idx: 0,
            elapsed_ms: 0,
            duration_ms: 0,
            speed: 1.0,
            voice: "narrator".into(),
        }
    }
}

impl Default for AudioManager {
    fn default() -> Self {
        Self {
            inner: std::sync::Arc::new(parking_lot::Mutex::new(AudioState {
                status: TtsStatus::default(),
                chunks: Vec::new(),
                generation: 0,
            })),
        }
    }
}
```

Implement:

- `AudioManager::segment_text(text: &str) -> Vec<FakeChunk>`
- `load_fake_chapter(&self, source, title_id, chapter_id, plain, speed, voice) -> AppResult<TtsStatus>`
- `pause(&self) -> AppResult<TtsStatus>`
- `resume(&self) -> AppResult<TtsStatus>`
- `stop(&self) -> AppResult<TtsStatus>`
- `seek(&self, elapsed_ms: u64) -> AppResult<TtsStatus>`
- `status(&self) -> TtsStatus`

Illegal transitions must return the current status without panic.

State design required for the next task:

- `chunks` stores the current fake chapter timing plan.
- `generation` increments on every new play or stop and lets the async event loop exit when stale.
- `pause`, `resume`, `stop`, and `seek` update the shared `AudioState`; the event loop must read this shared state between word events.

- [ ] **Step 4: Export the module**

Add to `src-tauri/src/lib.rs`:

```rust
pub mod audio;
```

- [ ] **Step 5: Verify and review**

Run:

```powershell
$env:PATH="$env:USERPROFILE\.cargo\bin;$env:PATH"; cargo test --manifest-path src-tauri\Cargo.toml --test audio_tests
$env:PATH="$env:USERPROFILE\.cargo\bin;$env:PATH"; cargo test --manifest-path src-tauri\Cargo.toml --locked
```

Expected: audio tests and full Rust tests pass. Request backend review before command wiring.

---

## Task 7: Add TTS Commands And Event Contract

**Files:**
- Modify: `src-tauri/src/audio.rs`
- Modify: `src-tauri/src/commands.rs`
- Modify: `src-tauri/src/main.rs`
- Test: `src-tauri/tests/audio_tests.rs`

- [ ] **Step 1: Add command-focused tests**

Extend Rust tests to assert serde names where practical:

```rust
#[test]
fn status_serializes_state_as_snake_case() {
    let manager = AudioManager::default();
    let json = serde_json::to_string(&manager.status()).unwrap();
    assert!(json.contains("\"state\":\"idle\""));
}
```

Add payload-shape tests so frontend mocks cannot drift from backend events:

```rust
#[test]
fn word_event_serializes_frontend_contract() {
    let event = reading_lib::audio::TtsWordEvent {
        idx: 2,
        chunk_idx: 0,
        word: "world".into(),
        start_ms: 280,
        end_ms: 560,
    };
    let json = serde_json::to_value(event).unwrap();
    assert_eq!(json["idx"], 2);
    assert_eq!(json["chunk_idx"], 0);
    assert_eq!(json["word"], "world");
    assert_eq!(json["start_ms"], 280);
    assert_eq!(json["end_ms"], 560);
}
```

- [ ] **Step 2: Wire AppState**

Add to `AppState`:

```rust
pub audio: crate::audio::AudioManager,
```

Initialize with:

```rust
audio: crate::audio::AudioManager::default(),
```

- [ ] **Step 3: Add command wrappers**

In `commands.rs`, add:

```rust
#[tauri::command]
pub fn tts_status(state: State<'_, AppState>) -> Result<crate::audio::TtsStatus, AppError> {
    Ok(state.audio.status())
}

#[tauri::command]
pub fn tts_pause(state: State<'_, AppState>) -> Result<crate::audio::TtsStatus, AppError> {
    state.audio.pause()
}

#[tauri::command]
pub fn tts_resume(state: State<'_, AppState>) -> Result<crate::audio::TtsStatus, AppError> {
    state.audio.resume()
}

#[tauri::command]
pub fn tts_stop(state: State<'_, AppState>) -> Result<crate::audio::TtsStatus, AppError> {
    state.audio.stop()
}

#[tauri::command]
pub fn tts_seek(elapsed_ms: u64, state: State<'_, AppState>) -> Result<crate::audio::TtsStatus, AppError> {
    state.audio.seek(elapsed_ms)
}
```

Before adding `tts_play_chapter`, add serializable event payload structs in `audio.rs` and mirror them exactly in `src/types.ts` during Task 8:

```rust
#[derive(Debug, Clone, serde::Serialize)]
pub struct TtsChunkStartedEvent {
    pub chunk_idx: usize,
    pub words: Vec<FakeWordTiming>,
    pub start_ms: u64,
    pub end_ms: u64,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct TtsWordEvent {
    pub idx: usize,
    pub chunk_idx: usize,
    pub word: String,
    pub start_ms: u64,
    pub end_ms: u64,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct TtsChunkFinishedEvent {
    pub idx: usize,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct TtsChapterFinishedEvent {
    pub source: String,
    pub title_id: String,
    pub chapter_id: String,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct TtsErrorEvent {
    pub code: String,
    pub message: String,
}
```

Add `tts_play_chapter` after `AudioManager` supports fake event emission. Its inputs:

```rust
source: String,
title_id: String,
chapter_id: String,
plain: String,
speed: f32,
voice: String,
app: AppHandle,
state: State<'_, AppState>,
```

It emits:

- `tts:state`
- `tts:chunk_started`
- `tts:word`
- `tts:chunk_finished`
- `tts:chapter_finished`
- `tts:error`

`tts_play_chapter` must return quickly. It must:

1. Build chunks synchronously.
2. Set status to `playing`.
3. Emit `tts:state`.
4. Spawn a `tauri::async_runtime::spawn` task for fake word timing.
5. In the spawned task, read shared `AudioState` before each word so `pause`, `resume`, `stop`, and `seek` take effect.
6. Exit when `generation` changes or state becomes `stopped`.
7. Emit `tts:chapter_finished` only when the active generation reaches the end naturally.

- [ ] **Step 4: Register handlers**

Add to `tauri::generate_handler!` in `src-tauri/src/main.rs`:

```rust
reading_lib::commands::tts_play_chapter,
reading_lib::commands::tts_pause,
reading_lib::commands::tts_resume,
reading_lib::commands::tts_stop,
reading_lib::commands::tts_seek,
reading_lib::commands::tts_status,
```

- [ ] **Step 5: Verify and review**

Run:

```powershell
$env:PATH="$env:USERPROFILE\.cargo\bin;$env:PATH"; cargo test --manifest-path src-tauri\Cargo.toml --locked
$env:PATH="$env:USERPROFILE\.cargo\bin;$env:PATH"; cargo clippy --manifest-path src-tauri\Cargo.toml --all-targets --all-features --locked -- -D warnings
```

Expected: all Rust tests and clippy pass. Request review on command names and event payloads.

---

## Task 8: Add Frontend TTS IPC And Store

**Files:**
- Create: `src/ipc/tts.ts`
- Create: `src/stores/useTtsPlayback.ts`
- Modify: `src/types.ts`
- Test: `tests/tts-ipc.test.ts`
- Test: `tests/tts-store.test.ts`

- [ ] **Step 1: Write failing IPC tests**

Create `tests/tts-ipc.test.ts`:

```ts
import { invoke } from "@tauri-apps/api/core";
import { expect, test, vi } from "vitest";
import { ttsPause, ttsPlayChapter, ttsSeek, ttsStatus } from "../src/ipc/tts";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockResolvedValue({ state: "idle" }),
}));

test("ttsPlayChapter invokes the backend with snake_case command and camelCase args", async () => {
  await ttsPlayChapter({
    source: "novelfire",
    titleId: "title",
    chapterId: "chapter",
    plain: "Hello world.",
    speed: 1,
    voice: "narrator",
  });

  expect(invoke).toHaveBeenCalledWith("tts_play_chapter", {
    source: "novelfire",
    titleId: "title",
    chapterId: "chapter",
    plain: "Hello world.",
    speed: 1,
    voice: "narrator",
  });
});

test("basic tts controls call the expected commands", async () => {
  await ttsStatus();
  await ttsPause();
  await ttsSeek(500);

  expect(invoke).toHaveBeenCalledWith("tts_status");
  expect(invoke).toHaveBeenCalledWith("tts_pause");
  expect(invoke).toHaveBeenCalledWith("tts_seek", { elapsedMs: 500 });
});
```

- [ ] **Step 2: Write failing store tests**

Create `tests/tts-store.test.ts`:

```ts
import { beforeEach, expect, test, vi } from "vitest";
import { useTtsPlayback } from "../src/stores/useTtsPlayback";

const listeners = new Map<string, (event: { payload: unknown }) => void>();

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn((name: string, cb: (event: { payload: unknown }) => void) => {
    listeners.set(name, cb);
    return Promise.resolve(() => listeners.delete(name));
  }),
}));

beforeEach(() => {
  listeners.clear();
  useTtsPlayback.getState().reset();
});

test("tts store updates status from tts:state events", async () => {
  await useTtsPlayback.getState().subscribe();
  listeners.get("tts:state")?.({ payload: { state: "playing", elapsed_ms: 0, duration_ms: 560, chunk_idx: 0, word_idx: 0, speed: 1, voice: "narrator" } });

  expect(useTtsPlayback.getState().status.state).toBe("playing");
});

test("tts store tracks current word events", async () => {
  await useTtsPlayback.getState().subscribe();
  listeners.get("tts:word")?.({ payload: { idx: 2, chunk_idx: 0, word: "world", start_ms: 280, end_ms: 560 } });

  expect(useTtsPlayback.getState().activeWord?.word).toBe("world");
});
```

- [ ] **Step 3: Verify tests fail**

Run:

```powershell
pnpm.cmd test -- tests/tts-ipc.test.ts tests/tts-store.test.ts
```

Expected: fails because files do not exist.

- [ ] **Step 4: Implement types, IPC wrappers, and store**

Add to `src/types.ts`:

```ts
export type TtsPlaybackState = "idle" | "loading" | "playing" | "paused" | "stopped" | "finished" | "error";

export interface TtsStatus {
  state: TtsPlaybackState;
  source?: string | null;
  title_id?: string | null;
  chapter_id?: string | null;
  chunk_idx: number;
  word_idx: number;
  elapsed_ms: number;
  duration_ms: number;
  speed: number;
  voice: string;
}

export interface TtsWordEvent {
  idx: number;
  chunk_idx: number;
  word: string;
  start_ms: number;
  end_ms: number;
}

export interface TtsChunkStartedEvent {
  chunk_idx: number;
  words: Array<{ word: string; start_ms: number; end_ms: number }>;
  start_ms: number;
  end_ms: number;
}

export interface TtsChunkFinishedEvent {
  idx: number;
}

export interface TtsChapterFinishedEvent {
  source: string;
  title_id: string;
  chapter_id: string;
}

export interface TtsErrorEvent {
  code: string;
  message: string;
}
```

Create `src/ipc/tts.ts` wrappers around `invoke`.

Create `src/stores/useTtsPlayback.ts` with:

- `status`
- `activeWord`
- `subscribe`
- `reset`
- play/pause/resume/stop/seek action helpers if useful for `AudioDock`.

- [ ] **Step 5: Verify and review**

Run:

```powershell
pnpm.cmd test -- tests/tts-ipc.test.ts tests/tts-store.test.ts
pnpm.cmd run check
```

Expected: tests and frontend gate pass. Request review on event cleanup and naming consistency.

---

## Task 9: Add AudioDock For Novel Text

**Files:**
- Create: `src/components/reader/AudioDock.tsx`
- Modify: `src/components/reader/ReaderShell.tsx`
- Modify: `src/components/reader/ShortcutsOverlay.tsx`
- Test: `tests/audio-dock.test.tsx`
- Test: `tests/reader-data.test.tsx`

- [ ] **Step 1: Write failing UI tests**

Create `tests/audio-dock.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { AudioDock } from "../src/components/reader/AudioDock";

const playMock = vi.fn();
const pauseMock = vi.fn();
const stopMock = vi.fn();
const seekMock = vi.fn();
const subscribeMock = vi.fn(() => Promise.resolve(vi.fn()));

vi.mock("../src/stores/useTtsPlayback", () => ({
  useTtsPlayback: () => ({
    status: { state: "idle", elapsed_ms: 0, duration_ms: 0, speed: 1, voice: "narrator" },
    activeWord: { idx: 1, chunk_idx: 0, word: "world", start_ms: 280, end_ms: 560 },
    playChapter: playMock,
    pause: pauseMock,
    stop: stopMock,
    seek: seekMock,
    subscribe: subscribeMock,
  }),
}));

test("AudioDock starts fake chapter playback", () => {
  render(
    <AudioDock
      source="novelfire"
      titleId="title"
      chapterId="chapter"
      plain="Hello world."
    />
  );

  fireEvent.click(screen.getByRole("button", { name: /play narration/i }));

  expect(playMock).toHaveBeenCalledWith({
    source: "novelfire",
    titleId: "title",
    chapterId: "chapter",
    plain: "Hello world.",
    speed: 1,
    voice: "narrator",
  });
});
```

Add control coverage:

```tsx
test("AudioDock exposes stop, scrubber, speed, voice, and current word controls", () => {
  render(
    <AudioDock
      source="novelfire"
      titleId="title"
      chapterId="chapter"
      plain="Hello world."
    />
  );

  fireEvent.change(screen.getByLabelText(/narration speed/i), { target: { value: "1.25" } });
  fireEvent.change(screen.getByLabelText(/narration voice/i), { target: { value: "calm" } });
  fireEvent.click(screen.getByRole("button", { name: /play narration/i }));
  fireEvent.change(screen.getByLabelText(/narration position/i), { target: { value: "280" } });
  fireEvent.click(screen.getByRole("button", { name: /stop narration/i }));

  expect(playMock).toHaveBeenCalledWith(expect.objectContaining({ speed: 1.25, voice: "calm" }));
  expect(seekMock).toHaveBeenCalledWith(280);
  expect(stopMock).toHaveBeenCalled();
  expect(screen.getByText(/world/i)).toBeInTheDocument();
});

test("AudioDock subscribes to tts events on mount", () => {
  render(
    <AudioDock
      source="novelfire"
      titleId="title"
      chapterId="chapter"
      plain="Hello world."
    />
  );

  expect(subscribeMock).toHaveBeenCalled();
});
```

Add ReaderShell behavior tests:

```tsx
test("ReaderShell shows AudioDock for novel chapters", async () => {
  getChapterMock.mockResolvedValue({ kind: "novel_text", plain: "Hello world.", paragraphs: ["Hello world."] });
  getTitleMock.mockResolvedValue({ ...titleDetail, summary: { ...titleDetail.summary, kind: "novel" } });

  render(
    <MemoryRouter initialEntries={["/r/novelfire/title-1/chapter-1"]}>
      <Routes>
        <Route path="/r/:source/:id/:chapter" element={<ReaderShell />} />
      </Routes>
    </MemoryRouter>
  );

  expect(await screen.findByRole("button", { name: /play narration/i })).toBeInTheDocument();
});
```

- [ ] **Step 2: Verify tests fail**

Run:

```powershell
pnpm.cmd test -- tests/audio-dock.test.tsx tests/reader-data.test.tsx
```

Expected: fails because `AudioDock` is missing and ReaderShell does not mount it.

- [ ] **Step 3: Implement AudioDock**

Controls required for this slice:

- Play/Pause button with `aria-label="Play narration"` or `aria-label="Pause narration"`.
- Stop button.
- Scrubber input with `aria-label="Narration position"`.
- Speed select with 0.75, 1, 1.25, 1.5, 2.
- Voice select with `narrator` and `calm`.
- Current spoken word display when `activeWord` exists.

Use lucide icons for buttons.

- [ ] **Step 4: Mount AudioDock in ReaderShell**

Only mount when:

```ts
content.kind === "novel_text"
```

Pass `source`, `id`, `chapter`, and `content.plain`.

Do not mount for manga in this first slice.

- [ ] **Step 5: Update keyboard help**

Add Space as play/pause in both `ReaderShell.tsx` and `ShortcutsOverlay.tsx` after the action is wired.

Rules:

- Space toggles play/pause only when the loaded content is `novel_text`.
- Space does nothing for manga in this slice.
- Preserve `useKeyboardShortcuts` input/select guards so typing in controls is not intercepted.

Add a ReaderShell test that presses Space on a novel chapter and asserts the store play/pause action was called.

- [ ] **Step 6: Verify and review**

Run:

```powershell
pnpm.cmd test -- tests/audio-dock.test.tsx tests/reader-data.test.tsx
pnpm.cmd run check
```

Expected: tests and frontend gate pass. Request UI/accessibility review on the dock.

---

## Task 10: Update Roadmap And Manual QA Checklist

**Files:**
- Modify: `docs/ROADMAP.md`
- Create or modify: `docs/QA.md`

- [ ] **Step 1: Update docs after implementation**

Move completed items from `Next` to `Done`:

- GitHub Actions CI
- Phase 2 polish items that landed
- Phase 3 fake audio state machine and AudioDock, if landed

Keep not-started items explicit:

- Real `rodio` playback
- Kokoro ONNX
- Manga OCR
- Emotion model
- Multi-voice character mapping

- [ ] **Step 2: Add manual QA checklist**

Create `docs/QA.md` with:

```md
# Reading Manual QA

## Browse And Library

- Browse opens on All or MangaDex without runtime errors.
- MangaDex, ComicK, and NovelFire tabs can be selected.
- All search returns results when at least one source succeeds.
- Refresh buttons reload Browse, Title Detail, and Library without losing navigation state.
- Library Continue Reading links open the saved chapter.

## Reader

- Manga chapters open and page navigation works.
- Novel chapters open and manual reading still works.
- AudioDock appears for novels and not for manga.
- Play, pause, stop, seek, speed, and voice controls respond.
- Fake TTS word highlight/current word advances deterministically.

## Window Chrome

- Drag region moves the window.
- Minimize, maximize/restore, and close buttons call the correct window APIs.
```

- [ ] **Step 3: Verify docs**

Run:

```powershell
git diff --check
pnpm.cmd run check
```

Expected: docs have no whitespace errors and frontend gate still passes.

---

## Task 11: Final Verification, Review, Commit, And Push

**Files:**
- All files changed by completed tasks.

- [ ] **Step 1: Run full verification**

Run:

```powershell
git status --short --branch
git diff --check
pnpm.cmd run check
$env:PATH="$env:USERPROFILE\.cargo\bin;$env:PATH"; cargo test --manifest-path src-tauri\Cargo.toml --locked
$env:PATH="$env:USERPROFILE\.cargo\bin;$env:PATH"; cargo clippy --manifest-path src-tauri\Cargo.toml --all-targets --all-features --locked -- -D warnings
pnpm.cmd run build:tauri
```

Expected: all pass. If `build:tauri` fails for a local packaging prerequisite while CI is expected to have it, record the exact error and source of the prerequisite.

- [ ] **Step 2: Run review agents**

Run at least two reviewers in parallel:

1. Frontend/UI reviewer: Browse, Title, ChapterList, AudioDock, accessibility.
2. Backend/CI reviewer: CI YAML, Rust TTS state machine, command/event contract, clippy output.

Fix Critical and Important findings before committing.

- [ ] **Step 3: Commit with detailed body**

Use one commit per completed task, or a single final commit if tasks were implemented in one coordinated batch. Every commit body must include:

- Context
- Changes
- Tests
- Known limitations

Example final commit:

```powershell
git add .
git commit -m "feat: add CI, polish reader flows, and fake TTS foundation" -m "Context:
- Reading needed a CI gate before Phase 3 expanded the Rust and frontend surface area.
- Phase 2 polish items from the roadmap were still open.
- Audio needs a fake driver first so commands, events, state, and UI can be tested without model files or audio hardware.

Changes:
- Added Windows CI with frontend checks, Rust tests, clippy, and tag-only Tauri build validation.
- Added explicit refresh controls, All-source browsing/search, honest Title Detail CTAs, and virtualized long chapter lists.
- Added a fake novel-text TTS state machine, Tauri commands/events, frontend TTS IPC/store, and AudioDock controls.
- Updated roadmap and QA documentation.

Verification:
- git diff --check
- pnpm run check
- cargo test --manifest-path src-tauri/Cargo.toml --locked
- cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --all-features --locked -- -D warnings
- pnpm run build:tauri

Known limitations:
- Fake TTS only supports novel text in this slice.
- Real rodio playback, Kokoro ONNX, manga OCR, and emotion/voice modeling remain future Phase 3+ work."
```

- [ ] **Step 4: Push**

Run:

```powershell
git push origin main
```

Expected: push succeeds and `main` is synced with `origin/main`.
