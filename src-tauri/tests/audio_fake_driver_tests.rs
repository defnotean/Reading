use reading_lib::audio::chunk::{plan_novel_chunks, word_at_elapsed};
use reading_lib::audio::driver::{AudioDriver, FakeAudioDriver, TtsRequest};

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
