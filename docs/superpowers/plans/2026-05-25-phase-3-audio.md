# Phase 3 Audio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship tested audiobook playback for novels first, with a fake audio driver proving the IPC, state machine, reader UI, and release constraints before real Kokoro ONNX and `rodio` playback land.

**Architecture:** Phase 3 is split into gated slices. Build the TTS domain model, fake driver, commands, events, frontend store, controls, scrubber, word highlighting, and release checks first, all without `rodio`, `ort`, model files, or audio hardware. Only after that contract is stable, add real synthesis/playback behind the same driver trait, then model download/cache and packaging constraints.

**Tech Stack:** Rust 2021, Tauri 2 commands/events, Tokio, Vitest 4, React 19, Zustand 5, TypeScript, `rodio` for real playback, `ort` for Kokoro ONNX, SHA-256 model verification, Windows/Linux/Android-aware release checks.

---

## Current Facts

- Repo root: `C:\Users\Eating\Desktop\Reading`
- Live roadmap: `docs/ROADMAP.md`
- Product spec: `docs/superpowers/specs/2026-05-09-manga-novel-reader-design.md`
- Existing plan style uses unchecked task steps, exact commands, expected results, and detailed commit bodies.
- Phase 3 should start with the fake audio driver. Do not add `rodio`, `ort`, Kokoro assets, model downloads, or real audio output until the fake-driver contract is green end-to-end.
- The fake-driver slice must work in CI without internet, model files, or audio hardware.
- Audio state invariants live in Rust. Illegal state transitions are logged and dropped or returned as typed errors; they must never panic.
- The first shippable audio surface is novel text. Manga OCR, Florence-2, SFX classification, and full emotion modeling stay outside this initial Phase 3 plan unless a task explicitly names them as a future extension point.
- This plan intentionally does not require README or roadmap edits during execution. Update docs only in a later explicit docs task or separate plan.

## File Map

Create:

- `src-tauri/src/audio/mod.rs` - module exports and shared audio types.
- `src-tauri/src/audio/state.rs` - strict playback state machine and transition tests.
- `src-tauri/src/audio/chunk.rs` - text segmentation, chunk IDs, word timing generation, and seek math.
- `src-tauri/src/audio/driver.rs` - `AudioDriver` trait plus fake driver.
- `src-tauri/src/audio/session.rs` - `AudioManager`, session lifecycle, command handling, and event emission.
- `src-tauri/tests/audio_state_tests.rs` - Rust state-machine tests.
- `src-tauri/tests/audio_fake_driver_tests.rs` - fake-driver integration tests.
- `src-tauri/tests/audio_ipc_contract_tests.rs` - serializable command/event contract tests.
- `src/ipc/tts.ts` - typed Tauri command wrappers and event subscription helpers.
- `src/stores/useTtsPlayback.ts` - frontend playback store and event reducer.
- `src/components/reader/AudioDock.tsx` - reader playback controls.
- `src/components/reader/KaraokeText.tsx` - word-level highlight renderer.
- `src/components/reader/VoiceMenu.tsx` - voice picker and preview trigger.
- `src/components/reader/EmotionSlider.tsx` - emotion intensity control.
- `tests/tts-ipc.test.ts` - frontend IPC contract tests.
- `tests/tts-store.test.ts` - playback reducer/store tests.
- `tests/audio-dock.test.tsx` - reader control tests.
- `tests/karaoke-text.test.tsx` - word highlight tests.
- `src-tauri/src/models/mod.rs` - model manifest, cache paths, and verification helpers.
- `src-tauri/tests/model_cache_tests.rs` - model cache/download contract tests.

Modify:

- `src-tauri/src/lib.rs` - export `audio` and `models`, initialize `AppState.audio`, and register TTS commands.
- `src-tauri/src/commands.rs` - expose `tts_status`, `tts_play_chapter`, `tts_pause`, `tts_resume`, `tts_stop`, `tts_seek`, `tts_set_speed`, `tts_set_voice`, `tts_set_emotion_intensity`, and model cache commands.
- `src-tauri/Cargo.toml` - add dependencies only when their gated task begins.
- `src/types.ts` - mirror TTS payloads and model-cache payloads.
- `src/components/reader/ReaderShell.tsx` - mount audio controls for novel chapters and later manga chapters.
- `src/components/reader/NovelReader.tsx` - expose paragraph/word anchors for highlighting.
- `src/routes/SettingsRoute.tsx` - add defaults after reader controls are stable.
- `package.json` - add focused test scripts only if repeated commands become unwieldy.
- `.github/workflows/ci.yml` - add model-free audio gates only after fake-driver tests exist.

## Driver Boundary

All playback code must depend on this shape, not directly on `rodio` or Kokoro:

```rust
pub trait AudioDriver: Send + Sync + 'static {
    fn prepare(&self, request: TtsRequest) -> Result<PreparedAudio, AudioError>;
    fn play(&self, prepared: PreparedAudio, sink: EventSink) -> Result<(), AudioError>;
    fn pause(&self) -> Result<(), AudioError>;
    fn resume(&self) -> Result<(), AudioError>;
    fn stop(&self) -> Result<(), AudioError>;
    fn seek(&self, elapsed_ms: u64) -> Result<(), AudioError>;
    fn set_speed(&self, speed: PlaybackSpeed) -> Result<(), AudioError>;
}
```

The fake driver prepares deterministic chunks and emits deterministic `tts:*` events. The real driver later fills `PreparedAudio` with Kokoro PCM and plays it through `rodio`, but does not change frontend payload names.

## Event Contract

Use these events for both fake and real drivers:

- `tts:status` - `{ state, chapterId, elapsedMs, durationMs, speed, voiceId, emotionIntensity }`
- `tts:chunk_started` - `{ sessionId, chunkIdx, paragraphIdx, regionIdx, text, words }`
- `tts:word` - `{ sessionId, chunkIdx, wordIdx, elapsedMs }`
- `tts:chunk_finished` - `{ sessionId, chunkIdx }`
- `tts:page_finished` - `{ sessionId, advanceTo }`
- `tts:error` - `{ sessionId, code, message, recoverable }`

The `words` array must use `{ idx, w, t0, t1 }` to match the product spec while leaving room for exact Kokoro timing later.

## Definition Of Done

- Fake-driver novel playback works from ReaderShell through Rust commands and Tauri events.
- Play, pause, resume, stop, seek, speed, voice, and emotion intensity are covered by Rust and Vitest tests.
- Karaoke highlighting follows `tts:word` events and remains deterministic in tests.
- Real `rodio`/Kokoro integration is behind the same `AudioDriver` trait and can be disabled for CI.
- Model cache code verifies filename, size, and checksum before enabling real synthesis.
- Release checks fail clearly when model files are missing, corrupt, unexpectedly bundled, or too large for the intended artifact.
- Full verification commands pass before any Phase 3 release candidate.

---

### Task 0: Baseline And Guardrails

**Files:**
- Read only: `git status --short --branch`
- Read only: `package.json`
- Read only: `src-tauri/Cargo.toml`
- Read only: `docs/ROADMAP.md`

- [ ] **Step 1: Confirm the working tree**

Run:

```powershell
git status --short --branch
```

Expected: note every existing uncommitted file before editing. Do not revert or overwrite unrelated work.

- [ ] **Step 2: Run the current frontend gate**

Run:

```powershell
pnpm.cmd run check
```

Expected: the existing typecheck, Vitest suite, and build pass before audio work begins.

- [ ] **Step 3: Run the current Rust gate**

Run:

```powershell
$env:PATH="$env:USERPROFILE\.cargo\bin;$env:PATH"
cargo test --manifest-path src-tauri\Cargo.toml --locked
```

Expected: all existing Rust tests pass.

- [ ] **Step 4: Commit only if baseline files changed during setup**

Expected: no commit is needed for a read-only preflight.

---

### Task 1: Rust TTS State Machine

**Files:**
- Create: `src-tauri/src/audio/mod.rs`
- Create: `src-tauri/src/audio/state.rs`
- Create: `src-tauri/tests/audio_state_tests.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Write failing state-machine tests**

Create `src-tauri/tests/audio_state_tests.rs`:

```rust
use reading_lib::audio::state::{PlaybackCommand, TtsPlaybackState, TtsStateMachine};

#[test]
fn legal_transitions_move_through_playback_lifecycle() {
    let mut machine = TtsStateMachine::default();

    assert_eq!(machine.state(), TtsPlaybackState::Idle);
    assert!(machine.apply(PlaybackCommand::Load).is_ok());
    assert_eq!(machine.state(), TtsPlaybackState::Loading);
    assert!(machine.apply(PlaybackCommand::Start).is_ok());
    assert_eq!(machine.state(), TtsPlaybackState::Playing);
    assert!(machine.apply(PlaybackCommand::Pause).is_ok());
    assert_eq!(machine.state(), TtsPlaybackState::Paused);
    assert!(machine.apply(PlaybackCommand::Resume).is_ok());
    assert_eq!(machine.state(), TtsPlaybackState::Playing);
    assert!(machine.apply(PlaybackCommand::Stop).is_ok());
    assert_eq!(machine.state(), TtsPlaybackState::Stopped);
    assert!(machine.apply(PlaybackCommand::Reset).is_ok());
    assert_eq!(machine.state(), TtsPlaybackState::Idle);
}

#[test]
fn illegal_transition_is_returned_without_mutating_state() {
    let mut machine = TtsStateMachine::default();

    let err = machine.apply(PlaybackCommand::Pause).unwrap_err();

    assert_eq!(machine.state(), TtsPlaybackState::Idle);
    assert_eq!(err.from, TtsPlaybackState::Idle);
    assert_eq!(err.command, PlaybackCommand::Pause);
}
```

- [ ] **Step 2: Run the failing test**

Run:

```powershell
$env:PATH="$env:USERPROFILE\.cargo\bin;$env:PATH"
cargo test --manifest-path src-tauri\Cargo.toml --test audio_state_tests
```

Expected: fails because `reading_lib::audio` does not exist.

- [ ] **Step 3: Implement the minimal state module**

Create `src-tauri/src/audio/mod.rs`:

```rust
pub mod state;
```

Create `src-tauri/src/audio/state.rs`:

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum TtsPlaybackState {
    Idle,
    Loading,
    Playing,
    Paused,
    Stopped,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PlaybackCommand {
    Load,
    Start,
    Pause,
    Resume,
    Stop,
    Reset,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct InvalidTransition {
    pub from: TtsPlaybackState,
    pub command: PlaybackCommand,
}

#[derive(Debug, Clone)]
pub struct TtsStateMachine {
    state: TtsPlaybackState,
}

impl Default for TtsStateMachine {
    fn default() -> Self {
        Self {
            state: TtsPlaybackState::Idle,
        }
    }
}

impl TtsStateMachine {
    pub fn state(&self) -> TtsPlaybackState {
        self.state
    }

    pub fn apply(&mut self, command: PlaybackCommand) -> Result<TtsPlaybackState, InvalidTransition> {
        let next = match (self.state, command) {
            (TtsPlaybackState::Idle, PlaybackCommand::Load) => TtsPlaybackState::Loading,
            (TtsPlaybackState::Loading, PlaybackCommand::Start) => TtsPlaybackState::Playing,
            (TtsPlaybackState::Playing, PlaybackCommand::Pause) => TtsPlaybackState::Paused,
            (TtsPlaybackState::Paused, PlaybackCommand::Resume) => TtsPlaybackState::Playing,
            (TtsPlaybackState::Playing | TtsPlaybackState::Paused | TtsPlaybackState::Loading, PlaybackCommand::Stop) => TtsPlaybackState::Stopped,
            (TtsPlaybackState::Stopped, PlaybackCommand::Reset) => TtsPlaybackState::Idle,
            _ => {
                return Err(InvalidTransition {
                    from: self.state,
                    command,
                });
            }
        };

        self.state = next;
        Ok(next)
    }
}
```

Modify `src-tauri/src/lib.rs`:

```rust
pub mod audio;
```

- [ ] **Step 4: Run the passing test**

Run:

```powershell
$env:PATH="$env:USERPROFILE\.cargo\bin;$env:PATH"
cargo test --manifest-path src-tauri\Cargo.toml --test audio_state_tests
```

Expected: state-machine tests pass.

- [ ] **Step 5: Commit**

```powershell
git add src-tauri\src\audio src-tauri\src\lib.rs src-tauri\tests\audio_state_tests.rs
git commit -m "feat: add TTS playback state machine" -m "Context:
- Phase 3 audio needs strict Rust-owned playback state before commands or UI.

Changes:
- Added TTS playback states and legal transition handling.
- Added tests for legal and illegal transitions.

Tests:
- cargo test --manifest-path src-tauri\Cargo.toml --test audio_state_tests"
```

---

### Task 2: Chunk Planning And Fake Word Timings

**Files:**
- Create: `src-tauri/src/audio/chunk.rs`
- Modify: `src-tauri/src/audio/mod.rs`
- Create: `src-tauri/tests/audio_fake_driver_tests.rs`

- [ ] **Step 1: Write failing chunk tests**

Create `src-tauri/tests/audio_fake_driver_tests.rs`:

```rust
use reading_lib::audio::chunk::{plan_novel_chunks, word_at_elapsed};

#[test]
fn novel_text_is_split_into_deterministic_chunks_and_words() {
    let chunks = plan_novel_chunks("Hello world. This is Reading!", 1_000);

    assert_eq!(chunks.len(), 2);
    assert_eq!(chunks[0].idx, 0);
    assert_eq!(chunks[0].text, "Hello world.");
    assert_eq!(chunks[0].words[0].w, "Hello");
    assert_eq!(chunks[0].words[0].t0, 0);
    assert!(chunks[0].words[0].t1 > chunks[0].words[0].t0);
    assert_eq!(chunks[1].idx, 1);
    assert_eq!(chunks[1].paragraph_idx, 0);
}

#[test]
fn word_lookup_uses_elapsed_time_boundaries() {
    let chunks = plan_novel_chunks("One two three.", 900);

    assert_eq!(word_at_elapsed(&chunks, 0).unwrap().w, "One");
    assert_eq!(word_at_elapsed(&chunks, 350).unwrap().w, "two");
    assert_eq!(word_at_elapsed(&chunks, 650).unwrap().w, "three");
    assert!(word_at_elapsed(&chunks, 1_200).is_none());
}
```

- [ ] **Step 2: Run the failing test**

```powershell
$env:PATH="$env:USERPROFILE\.cargo\bin;$env:PATH"
cargo test --manifest-path src-tauri\Cargo.toml --test audio_fake_driver_tests
```

Expected: fails because `audio::chunk` does not exist.

- [ ] **Step 3: Implement deterministic chunk planning**

Create `src-tauri/src/audio/chunk.rs` with serializable `TtsWord`, `TtsChunk`, `plan_novel_chunks`, and `word_at_elapsed`. Use punctuation-aware sentence splitting for `.`, `!`, and `?`; assign equal word timing across each chunk; and keep timings deterministic by accepting `ms_per_sentence` as an argument.

Modify `src-tauri/src/audio/mod.rs`:

```rust
pub mod chunk;
pub mod state;
```

- [ ] **Step 4: Run focused Rust tests**

```powershell
$env:PATH="$env:USERPROFILE\.cargo\bin;$env:PATH"
cargo test --manifest-path src-tauri\Cargo.toml --test audio_fake_driver_tests
cargo test --manifest-path src-tauri\Cargo.toml --test audio_state_tests
```

Expected: both test files pass.

- [ ] **Step 5: Commit**

```powershell
git add src-tauri\src\audio src-tauri\tests\audio_fake_driver_tests.rs
git commit -m "feat: plan fake TTS chunks" -m "Context:
- Fake audio needs deterministic text chunks and word timings before IPC events exist.

Changes:
- Added novel chunk planning and elapsed-time word lookup.
- Added tests for chunk and timing determinism.

Tests:
- cargo test --manifest-path src-tauri\Cargo.toml --test audio_fake_driver_tests
- cargo test --manifest-path src-tauri\Cargo.toml --test audio_state_tests"
```

---

### Task 3: Audio Driver Trait And Fake Driver

**Files:**
- Create: `src-tauri/src/audio/driver.rs`
- Modify: `src-tauri/src/audio/mod.rs`
- Modify: `src-tauri/tests/audio_fake_driver_tests.rs`

- [ ] **Step 1: Add failing fake-driver tests**

Append to `src-tauri/tests/audio_fake_driver_tests.rs`:

```rust
use reading_lib::audio::driver::{AudioDriver, FakeAudioDriver, TtsRequest};

#[test]
fn fake_driver_prepares_predictable_audio_without_hardware() {
    let driver = FakeAudioDriver::default();
    let prepared = driver
        .prepare(TtsRequest {
            session_id: "session-1".into(),
            chapter_id: "chapter-1".into(),
            text: "First line. Second line.".into(),
            speed: 1.0,
            voice_id: "narrator".into(),
            emotion_intensity: 0.7,
        })
        .unwrap();

    assert_eq!(prepared.session_id, "session-1");
    assert_eq!(prepared.chunks.len(), 2);
    assert_eq!(prepared.duration_ms, 2_000);
}
```

- [ ] **Step 2: Run the failing test**

```powershell
$env:PATH="$env:USERPROFILE\.cargo\bin;$env:PATH"
cargo test --manifest-path src-tauri\Cargo.toml --test audio_fake_driver_tests
```

Expected: fails because `audio::driver` does not exist.

- [ ] **Step 3: Implement `AudioDriver` and `FakeAudioDriver`**

Create the trait and fake implementation in `src-tauri/src/audio/driver.rs`. The fake driver must call `plan_novel_chunks(&request.text, 1_000)`, calculate `duration_ms` from the final word timing, and return no audio bytes.

Modify `src-tauri/src/audio/mod.rs`:

```rust
pub mod chunk;
pub mod driver;
pub mod state;
```

- [ ] **Step 4: Run focused tests**

```powershell
$env:PATH="$env:USERPROFILE\.cargo\bin;$env:PATH"
cargo test --manifest-path src-tauri\Cargo.toml --test audio_fake_driver_tests
```

Expected: fake-driver tests pass without audio hardware.

- [ ] **Step 5: Commit**

```powershell
git add src-tauri\src\audio src-tauri\tests\audio_fake_driver_tests.rs
git commit -m "feat: add fake audio driver" -m "Context:
- Phase 3 must prove audio behavior with no model files or sound device.

Changes:
- Added an AudioDriver trait.
- Added deterministic FakeAudioDriver preparation.

Tests:
- cargo test --manifest-path src-tauri\Cargo.toml --test audio_fake_driver_tests"
```

---

### Task 4: Tauri Commands And Events Against Fake Driver

**Files:**
- Create: `src-tauri/src/audio/session.rs`
- Modify: `src-tauri/src/audio/mod.rs`
- Modify: `src-tauri/src/commands.rs`
- Modify: `src-tauri/src/lib.rs`
- Create: `src-tauri/tests/audio_ipc_contract_tests.rs`

- [ ] **Step 1: Write failing IPC contract tests**

Create `src-tauri/tests/audio_ipc_contract_tests.rs`:

```rust
use reading_lib::audio::session::{TtsStatus, TtsWordEvent};
use reading_lib::audio::state::TtsPlaybackState;

#[test]
fn status_serializes_in_frontend_shape() {
    let status = TtsStatus {
        state: TtsPlaybackState::Playing,
        session_id: Some("session-1".into()),
        chapter_id: Some("chapter-1".into()),
        elapsed_ms: 250,
        duration_ms: 1_000,
        speed: 1.25,
        voice_id: "narrator".into(),
        emotion_intensity: 0.7,
    };

    let json = serde_json::to_value(status).unwrap();

    assert_eq!(json["state"], "playing");
    assert_eq!(json["sessionId"], "session-1");
    assert_eq!(json["elapsedMs"], 250);
    assert_eq!(json["voiceId"], "narrator");
}

#[test]
fn word_event_serializes_with_session_and_elapsed_time() {
    let event = TtsWordEvent {
        session_id: "session-1".into(),
        chunk_idx: 0,
        word_idx: 2,
        elapsed_ms: 400,
    };

    let json = serde_json::to_value(event).unwrap();

    assert_eq!(json["sessionId"], "session-1");
    assert_eq!(json["chunkIdx"], 0);
    assert_eq!(json["wordIdx"], 2);
    assert_eq!(json["elapsedMs"], 400);
}
```

- [ ] **Step 2: Run the failing contract test**

```powershell
$env:PATH="$env:USERPROFILE\.cargo\bin;$env:PATH"
cargo test --manifest-path src-tauri\Cargo.toml --test audio_ipc_contract_tests
```

Expected: fails because `audio::session` does not exist.

- [ ] **Step 3: Implement session payloads and manager**

Create `AudioManager` in `src-tauri/src/audio/session.rs` with:

- `status() -> TtsStatus`
- `play_chapter(chapter_id, text, voice_id, speed, emotion_intensity) -> Result<TtsStatus, AudioError>`
- `pause()`, `resume()`, `stop()`, `seek(elapsed_ms)`, `set_speed(speed)`, `set_voice(voice_id)`, `set_emotion_intensity(value)`
- serializable event structs using `#[serde(rename_all = "camelCase")]`

Use `Arc<dyn AudioDriver>` internally and default to `FakeAudioDriver`.

- [ ] **Step 4: Wire commands**

Add Tauri commands in `src-tauri/src/commands.rs`:

```rust
#[tauri::command]
pub fn tts_status(state: tauri::State<'_, AppState>) -> Result<crate::audio::session::TtsStatus, AppError> {
    Ok(state.audio.status())
}
```

Repeat the wrapper pattern for `tts_play_chapter`, `tts_pause`, `tts_resume`, `tts_stop`, `tts_seek`, `tts_set_speed`, `tts_set_voice`, and `tts_set_emotion_intensity`.

- [ ] **Step 5: Register state and commands**

Modify `src-tauri/src/lib.rs` so `AppState` owns `audio: crate::audio::session::AudioManager` and the Tauri builder registers every `tts_*` command.

- [ ] **Step 6: Run Rust audio tests**

```powershell
$env:PATH="$env:USERPROFILE\.cargo\bin;$env:PATH"
cargo test --manifest-path src-tauri\Cargo.toml --test audio_state_tests
cargo test --manifest-path src-tauri\Cargo.toml --test audio_fake_driver_tests
cargo test --manifest-path src-tauri\Cargo.toml --test audio_ipc_contract_tests
```

Expected: all audio Rust tests pass.

- [ ] **Step 7: Commit**

```powershell
git add src-tauri\src src-tauri\tests\audio_ipc_contract_tests.rs
git commit -m "feat: expose fake TTS commands" -m "Context:
- Reader UI needs a stable Tauri command and event contract before real audio.

Changes:
- Added AudioManager session lifecycle.
- Added TTS command wrappers and serializable status/event payloads.

Tests:
- cargo test --manifest-path src-tauri\Cargo.toml --test audio_state_tests
- cargo test --manifest-path src-tauri\Cargo.toml --test audio_fake_driver_tests
- cargo test --manifest-path src-tauri\Cargo.toml --test audio_ipc_contract_tests"
```

---

### Task 5: Frontend IPC Types And Playback Store

**Files:**
- Modify: `src/types.ts`
- Create: `src/ipc/tts.ts`
- Create: `src/stores/useTtsPlayback.ts`
- Create: `tests/tts-ipc.test.ts`
- Create: `tests/tts-store.test.ts`

- [ ] **Step 1: Write failing IPC tests**

Create `tests/tts-ipc.test.ts`:

```ts
import { beforeEach, expect, test, vi } from "vitest";
import { ttsPause, ttsPlayChapter, ttsSeek, ttsSetEmotionIntensity, ttsSetSpeed, ttsSetVoice } from "../src/ipc/tts";

const invoke = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({ invoke }));
vi.mock("@tauri-apps/api/event", () => ({ listen: vi.fn() }));

beforeEach(() => {
  invoke.mockReset();
});

test("ttsPlayChapter invokes the backend with stable payload names", async () => {
  invoke.mockResolvedValue({ state: "playing" });

  await ttsPlayChapter({
    chapterId: "chapter-1",
    text: "Hello world.",
    voiceId: "narrator",
    speed: 1,
    emotionIntensity: 0.7,
  });

  expect(invoke).toHaveBeenCalledWith("tts_play_chapter", {
    chapterId: "chapter-1",
    text: "Hello world.",
    voiceId: "narrator",
    speed: 1,
    emotionIntensity: 0.7,
  });
});

test("control wrappers use expected command names", async () => {
  invoke.mockResolvedValue({ state: "paused" });

  await ttsPause();
  await ttsSeek(1200);
  await ttsSetSpeed(1.25);
  await ttsSetVoice("bright");
  await ttsSetEmotionIntensity(0.4);

  expect(invoke).toHaveBeenCalledWith("tts_pause");
  expect(invoke).toHaveBeenCalledWith("tts_seek", { elapsedMs: 1200 });
  expect(invoke).toHaveBeenCalledWith("tts_set_speed", { speed: 1.25 });
  expect(invoke).toHaveBeenCalledWith("tts_set_voice", { voiceId: "bright" });
  expect(invoke).toHaveBeenCalledWith("tts_set_emotion_intensity", { emotionIntensity: 0.4 });
});
```

- [ ] **Step 2: Write failing store tests**

Create `tests/tts-store.test.ts`:

```ts
import { beforeEach, expect, test } from "vitest";
import { useTtsPlayback } from "../src/stores/useTtsPlayback";

beforeEach(() => {
  useTtsPlayback.getState().resetForTest();
});

test("status events update playback state", () => {
  useTtsPlayback.getState().applyStatus({
    state: "playing",
    sessionId: "session-1",
    chapterId: "chapter-1",
    elapsedMs: 300,
    durationMs: 1200,
    speed: 1,
    voiceId: "narrator",
    emotionIntensity: 0.7,
  });

  expect(useTtsPlayback.getState().state).toBe("playing");
  expect(useTtsPlayback.getState().elapsedMs).toBe(300);
});

test("word events are ignored when they belong to an old session", () => {
  useTtsPlayback.getState().applyStatus({
    state: "playing",
    sessionId: "session-new",
    chapterId: "chapter-1",
    elapsedMs: 0,
    durationMs: 1200,
    speed: 1,
    voiceId: "narrator",
    emotionIntensity: 0.7,
  });

  useTtsPlayback.getState().applyWord({ sessionId: "session-old", chunkIdx: 0, wordIdx: 1, elapsedMs: 200 });

  expect(useTtsPlayback.getState().currentWordIdx).toBeNull();
});
```

- [ ] **Step 3: Run failing frontend tests**

```powershell
pnpm.cmd test -- tests/tts-ipc.test.ts tests/tts-store.test.ts
```

Expected: fails because the new frontend TTS modules do not exist.

- [ ] **Step 4: Implement shared types, IPC wrappers, and store**

Add TTS types to `src/types.ts`, implement wrappers in `src/ipc/tts.ts`, and implement `useTtsPlayback` in Zustand. Keep event application pure enough for tests; event subscription setup should be one exported `subscribeToTtsEvents()` function.

- [ ] **Step 5: Run focused frontend tests**

```powershell
pnpm.cmd test -- tests/tts-ipc.test.ts tests/tts-store.test.ts
```

Expected: TTS IPC and store tests pass.

- [ ] **Step 6: Commit**

```powershell
git add src\types.ts src\ipc\tts.ts src\stores\useTtsPlayback.ts tests\tts-ipc.test.ts tests\tts-store.test.ts
git commit -m "feat: add frontend TTS IPC store" -m "Context:
- Reader audio controls need typed command wrappers and event state before UI work.

Changes:
- Added TTS TypeScript payloads.
- Added Tauri invoke wrappers and playback store reducers.

Tests:
- pnpm.cmd test -- tests/tts-ipc.test.ts tests/tts-store.test.ts"
```

---

### Task 6: Reader Controls And Karaoke Highlighting

**Files:**
- Create: `src/components/reader/AudioDock.tsx`
- Create: `src/components/reader/KaraokeText.tsx`
- Create: `src/components/reader/VoiceMenu.tsx`
- Create: `src/components/reader/EmotionSlider.tsx`
- Modify: `src/components/reader/ReaderShell.tsx`
- Modify: `src/components/reader/NovelReader.tsx`
- Create: `tests/audio-dock.test.tsx`
- Create: `tests/karaoke-text.test.tsx`

- [ ] **Step 1: Write failing AudioDock tests**

Create `tests/audio-dock.test.tsx` with coverage for:

- Play calls `ttsPlayChapter` with current novel text.
- Pause and resume call the matching wrappers.
- Scrubber calls `ttsSeek`.
- Speed control calls `ttsSetSpeed`.
- Voice picker calls `ttsSetVoice`.
- Emotion slider calls `ttsSetEmotionIntensity`.

- [ ] **Step 2: Write failing karaoke tests**

Create `tests/karaoke-text.test.tsx` with coverage for:

- Current word receives `aria-current="true"`.
- Words before the current word are marked complete.
- Empty word lists render the chunk text without crashing.

- [ ] **Step 3: Run failing UI tests**

```powershell
pnpm.cmd test -- tests/audio-dock.test.tsx tests/karaoke-text.test.tsx
```

Expected: fails because the reader audio components do not exist.

- [ ] **Step 4: Implement reader audio UI**

Implement:

- `AudioDock` with icon buttons from `lucide-react`, a stable scrubber width, speed menu, voice menu, and emotion slider.
- `KaraokeText` as a presentational component that renders provided `TtsWord[]`.
- `VoiceMenu` with fake voices: `narrator`, `bright`, `soft`, `firm`.
- `EmotionSlider` with min `0`, max `1`, step `0.05`, default `0.7`.

Mount the dock for novel chapters in `ReaderShell`. Keep manga controls hidden until manga text regions exist.

- [ ] **Step 5: Run focused UI tests**

```powershell
pnpm.cmd test -- tests/audio-dock.test.tsx tests/karaoke-text.test.tsx tests/reader-data.test.tsx tests/novel-reader.test.tsx
```

Expected: reader audio UI tests pass without breaking existing reader tests.

- [ ] **Step 6: Commit**

```powershell
git add src\components\reader src\components\reader\ReaderShell.tsx src\components\reader\NovelReader.tsx tests\audio-dock.test.tsx tests\karaoke-text.test.tsx
git commit -m "feat: add fake TTS reader controls" -m "Context:
- Phase 3 UI should prove playback controls before real audio integration.

Changes:
- Added AudioDock controls, voice menu, emotion slider, and karaoke highlighting.
- Mounted controls for novel chapters.

Tests:
- pnpm.cmd test -- tests/audio-dock.test.tsx tests/karaoke-text.test.tsx tests/reader-data.test.tsx tests/novel-reader.test.tsx"
```

---

### Task 7: End-To-End Fake Audio Checkpoint

**Files:**
- Modify: `.github/workflows/ci.yml`
- Optional create: `tests/audio-contract.test.ts`

- [ ] **Step 1: Add fake-audio gates to CI**

Update CI to run the focused Rust audio tests and frontend TTS tests as part of the normal quality gate. Do not require model downloads or sound devices.

- [ ] **Step 2: Run full local verification**

```powershell
pnpm.cmd run check
$env:PATH="$env:USERPROFILE\.cargo\bin;$env:PATH"
cargo test --manifest-path src-tauri\Cargo.toml --locked
cargo clippy --manifest-path src-tauri\Cargo.toml --all-targets --all-features --locked -- -D warnings
git diff --check
```

Expected: all commands pass.

- [ ] **Step 3: Manual smoke**

Run the desktop app, open a NovelFire or generic novel chapter, press Play, then verify:

- State changes to playing.
- Word highlight advances.
- Pause freezes progress.
- Resume continues from the same session.
- Seek moves the scrubber and current word.
- Stop returns to stopped without navigating away.

- [ ] **Step 4: Commit**

```powershell
git add .github\workflows\ci.yml
git commit -m "test: gate fake TTS audio" -m "Context:
- Fake audio is now the contract real audio must preserve.

Changes:
- Added model-free audio tests to the normal quality gate.

Tests:
- pnpm.cmd run check
- cargo test --manifest-path src-tauri\Cargo.toml --locked
- cargo clippy --manifest-path src-tauri\Cargo.toml --all-targets --all-features --locked -- -D warnings
- git diff --check"
```

---

### Task 8: Real Playback Adapter With `rodio`

**Files:**
- Modify: `src-tauri/Cargo.toml`
- Create: `src-tauri/src/audio/rodio_driver.rs`
- Modify: `src-tauri/src/audio/mod.rs`
- Modify: `src-tauri/src/audio/session.rs`
- Create: `src-tauri/tests/audio_driver_selection_tests.rs`

- [ ] **Step 1: Write failing driver selection tests**

Create tests proving default CI uses fake driver and an explicit runtime option can select real playback only when enabled.

- [ ] **Step 2: Add `rodio` behind a feature flag**

Add a feature such as:

```toml
[features]
default = []
real-audio = ["dep:rodio"]

[dependencies]
rodio = { version = "0.20", optional = true }
```

If the current ecosystem has moved, verify the latest compatible `rodio` version before implementing this task.

- [ ] **Step 3: Implement `RodioAudioDriver`**

Implement the same `AudioDriver` trait. Start with a generated sine/silence source for prepared fake PCM so this task verifies sink lifecycle before Kokoro synthesis exists.

- [ ] **Step 4: Run feature-gated tests**

```powershell
$env:PATH="$env:USERPROFILE\.cargo\bin;$env:PATH"
cargo test --manifest-path src-tauri\Cargo.toml --locked
cargo test --manifest-path src-tauri\Cargo.toml --features real-audio --test audio_driver_selection_tests
```

Expected: normal tests pass without real audio; feature-gated driver selection tests pass locally.

- [ ] **Step 5: Commit**

```powershell
git add src-tauri\Cargo.toml src-tauri\Cargo.lock src-tauri\src\audio src-tauri\tests\audio_driver_selection_tests.rs
git commit -m "feat: add rodio playback adapter" -m "Context:
- The fake driver contract is stable and ready for real playback behind a feature gate.

Changes:
- Added optional rodio dependency and driver selection.
- Added real playback adapter without changing frontend IPC.

Tests:
- cargo test --manifest-path src-tauri\Cargo.toml --locked
- cargo test --manifest-path src-tauri\Cargo.toml --features real-audio --test audio_driver_selection_tests"
```

---

### Task 9: Kokoro ONNX Adapter

**Files:**
- Modify: `src-tauri/Cargo.toml`
- Create: `src-tauri/src/audio/kokoro.rs`
- Modify: `src-tauri/src/audio/rodio_driver.rs`
- Create: `src-tauri/tests/kokoro_contract_tests.rs`

- [ ] **Step 1: Write model-free Kokoro contract tests**

Write tests for tokenizer input normalization, voice ID validation, even-distribution fallback word timing, and error behavior when the model path is missing. These tests must not download or load the real model.

- [ ] **Step 2: Add `ort` behind a feature flag**

Use a feature such as:

```toml
[features]
real-audio = ["dep:rodio"]
kokoro-onnx = ["real-audio", "dep:ort"]

[dependencies]
ort = { version = "2", optional = true }
```

Before implementation, check the current official `ort` crate guidance and DirectML support. CPU fallback is required; DirectML is an optimization.

- [ ] **Step 3: Implement the adapter boundary**

Implement `KokoroSynthesizer` so it accepts chunk text, voice ID, speed, and emotion intensity, and returns PCM plus word timings. First pass may use even word timing if phoneme alignment is unavailable.

- [ ] **Step 4: Run model-free tests**

```powershell
$env:PATH="$env:USERPROFILE\.cargo\bin;$env:PATH"
cargo test --manifest-path src-tauri\Cargo.toml --test kokoro_contract_tests
cargo test --manifest-path src-tauri\Cargo.toml --features kokoro-onnx --test kokoro_contract_tests
```

Expected: tests pass without requiring model files.

- [ ] **Step 5: Commit**

```powershell
git add src-tauri\Cargo.toml src-tauri\Cargo.lock src-tauri\src\audio src-tauri\tests\kokoro_contract_tests.rs
git commit -m "feat: add Kokoro synthesis boundary" -m "Context:
- Real TTS needs Kokoro ONNX behind the existing fake-driver contract.

Changes:
- Added optional ort feature and Kokoro adapter boundary.
- Added model-free tests for validation and fallback timing.

Tests:
- cargo test --manifest-path src-tauri\Cargo.toml --test kokoro_contract_tests
- cargo test --manifest-path src-tauri\Cargo.toml --features kokoro-onnx --test kokoro_contract_tests"
```

---

### Task 10: Model Download, Cache, And Verification

**Files:**
- Create: `src-tauri/src/models/mod.rs`
- Modify: `src-tauri/src/commands.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src/types.ts`
- Create: `src/ipc/models.ts`
- Create: `src/stores/useModelCache.ts`
- Create: `src-tauri/tests/model_cache_tests.rs`
- Create: `tests/model-cache.test.ts`

- [ ] **Step 1: Write failing model cache tests**

Rust tests must cover:

- Cache path is under the app data directory, not the repo.
- Manifest includes model filename, expected size, checksum, and license URL.
- Corrupt file fails verification.
- Valid fixture file passes verification.
- Missing model reports `missing`, not `corrupt`.

Frontend tests must cover:

- Settings can display missing/downloading/ready/corrupt states.
- Re-download command is available only for missing or corrupt models.

- [ ] **Step 2: Run failing tests**

```powershell
$env:PATH="$env:USERPROFILE\.cargo\bin;$env:PATH"
cargo test --manifest-path src-tauri\Cargo.toml --test model_cache_tests
pnpm.cmd test -- tests/model-cache.test.ts
```

Expected: both fail because model cache modules do not exist.

- [ ] **Step 3: Implement cache and command layer**

Implement:

- `model_status()`
- `model_verify()`
- `model_download()`
- `model_clear()`

Do not bundle Kokoro files in the repo. Download code must stream to a temporary file, verify checksum, then atomically move into the cache path.

- [ ] **Step 4: Run model cache tests**

```powershell
$env:PATH="$env:USERPROFILE\.cargo\bin;$env:PATH"
cargo test --manifest-path src-tauri\Cargo.toml --test model_cache_tests
pnpm.cmd test -- tests/model-cache.test.ts
```

Expected: tests pass without contacting the network by using fixture data and mocked frontend IPC.

- [ ] **Step 5: Commit**

```powershell
git add src-tauri\src\models src-tauri\src\commands.rs src-tauri\src\lib.rs src-tauri\tests\model_cache_tests.rs src\types.ts src\ipc\models.ts src\stores\useModelCache.ts tests\model-cache.test.ts
git commit -m "feat: add TTS model cache verification" -m "Context:
- Kokoro must be downloaded and verified outside the source tree before release builds use it.

Changes:
- Added model manifest, cache status, verification, download, and clear commands.
- Added frontend model cache state.

Tests:
- cargo test --manifest-path src-tauri\Cargo.toml --test model_cache_tests
- pnpm.cmd test -- tests/model-cache.test.ts"
```

---

### Task 11: Release Constraints And Packaging Checks

**Files:**
- Create: `scripts/check-audio-release.ps1`
- Modify: `package.json`
- Modify: `.github/workflows/ci.yml`
- Optional modify: `docs/ANDROID.md`

- [ ] **Step 1: Add release-check tests or dry run**

The release check must assert:

- Kokoro model files are not accidentally committed under `src-tauri`, `src`, or `docs`.
- Release builds either have a model download URL configured or explicitly run in fake-audio mode.
- Bundled artifacts stay below the chosen size threshold.
- Android build docs mention that background audio and native media controls are not guaranteed in this Tauri pass.

- [ ] **Step 2: Implement the PowerShell check**

Create `scripts/check-audio-release.ps1` with non-destructive checks only. It should exit non-zero on committed model files, missing release configuration, or oversized artifacts.

- [ ] **Step 3: Wire script into package commands and CI**

Add a package script such as:

```json
"check:audio-release": "powershell -ExecutionPolicy Bypass -File scripts/check-audio-release.ps1"
```

Run it in CI after normal tests.

- [ ] **Step 4: Run release checks**

```powershell
pnpm.cmd run check:audio-release
pnpm.cmd run check
$env:PATH="$env:USERPROFILE\.cargo\bin;$env:PATH"
cargo test --manifest-path src-tauri\Cargo.toml --locked
```

Expected: release check, frontend check, and Rust tests pass.

- [ ] **Step 5: Commit**

```powershell
git add scripts\check-audio-release.ps1 package.json .github\workflows\ci.yml docs\ANDROID.md
git commit -m "chore: add audio release checks" -m "Context:
- Real TTS introduces large model and packaging risks that should fail before release.

Changes:
- Added audio release validation script and CI gate.
- Documented mobile audio limitations if Android docs changed.

Tests:
- pnpm.cmd run check:audio-release
- pnpm.cmd run check
- cargo test --manifest-path src-tauri\Cargo.toml --locked"
```

---

### Task 12: Full Phase 3 Verification

**Files:**
- Read only: all changed files in the branch

- [ ] **Step 1: Run all automated gates**

```powershell
pnpm.cmd run check
pnpm.cmd run check:audio-release
$env:PATH="$env:USERPROFILE\.cargo\bin;$env:PATH"
cargo test --manifest-path src-tauri\Cargo.toml --locked
cargo clippy --manifest-path src-tauri\Cargo.toml --all-targets --all-features --locked -- -D warnings
git diff --check
```

Expected: all commands pass.

- [ ] **Step 2: Run feature-gated local audio checks**

```powershell
$env:PATH="$env:USERPROFILE\.cargo\bin;$env:PATH"
cargo test --manifest-path src-tauri\Cargo.toml --features real-audio --test audio_driver_selection_tests
cargo test --manifest-path src-tauri\Cargo.toml --features kokoro-onnx --test kokoro_contract_tests
```

Expected: feature-gated tests pass on a machine with the required local dependencies. If skipped, record the missing dependency in the final handoff.

- [ ] **Step 3: Desktop manual smoke**

Verify in the running app:

- Novel chapter fake playback starts within 2 seconds.
- Real playback starts when the model cache is valid and the real-audio feature is enabled.
- Play, pause, resume, stop, seek, speed, voice, and emotion controls update state.
- Karaoke highlighting follows word events.
- Missing or corrupt model shows a clear recovery path.
- No network is required for fake-driver playback.

- [ ] **Step 4: Android smoke if packaging changed**

```powershell
pnpm.cmd run android:build:windows-copy
```

Expected: APK packaging still completes or fails with a known environment prerequisite. Manual smoke should verify the reader still opens and fake audio UI does not break mobile navigation.

- [ ] **Step 5: Final review**

Review the diff for:

- Accidental model files.
- Frontend/backend payload mismatches.
- Tests that depend on timing sleeps instead of deterministic reducers.
- Audio commands that can panic on illegal state.
- New dependencies not behind features.

Expected: no blocking findings remain.

## Execution Notes

- Keep fake audio and real audio commits separate. The fake-driver contract is the checkpoint that protects the rest of Phase 3.
- Prefer deterministic event reducers over timer-heavy UI tests.
- Do not update README, roadmap, or broad product docs unless a later user request explicitly asks for docs sync.
- If `rodio` or `ort` versions changed since this plan was written, verify current official docs before implementation and record the chosen versions in the implementing commit body.
- If mobile background audio or native media controls become required, split them into a separate native-shell plan instead of widening this one.
