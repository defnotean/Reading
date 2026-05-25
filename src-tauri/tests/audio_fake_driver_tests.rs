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
