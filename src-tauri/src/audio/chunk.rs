use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct TtsWord {
    pub idx: usize,
    pub w: String,
    pub t0: u64,
    pub t1: u64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TtsChunk {
    pub idx: usize,
    pub paragraph_idx: usize,
    pub region_idx: usize,
    pub text: String,
    pub words: Vec<TtsWord>,
}

pub fn plan_novel_chunks(text: &str, ms_per_sentence: u64) -> Vec<TtsChunk> {
    let mut chunks = Vec::new();
    let mut elapsed_ms = 0;

    for (paragraph_idx, paragraph) in text
        .split('\n')
        .map(str::trim)
        .filter(|paragraph| !paragraph.is_empty())
        .enumerate()
    {
        for sentence in split_sentences(paragraph) {
            let words = plan_words(&sentence, ms_per_sentence, elapsed_ms);
            chunks.push(TtsChunk {
                idx: chunks.len(),
                paragraph_idx,
                region_idx: 0,
                text: sentence,
                words,
            });
            elapsed_ms = elapsed_ms.saturating_add(ms_per_sentence);
        }
    }

    chunks
}

pub fn word_at_elapsed(chunks: &[TtsChunk], elapsed_ms: u64) -> Option<&TtsWord> {
    chunks
        .iter()
        .flat_map(|chunk| chunk.words.iter())
        .find(|word| elapsed_ms >= word.t0 && elapsed_ms < word.t1)
}

fn split_sentences(paragraph: &str) -> Vec<String> {
    let mut out = Vec::new();
    let mut start = 0;

    for (idx, ch) in paragraph.char_indices() {
        if matches!(ch, '.' | '!' | '?') {
            let end = idx + ch.len_utf8();
            let sentence = paragraph[start..end].trim();
            if !sentence.is_empty() {
                out.push(sentence.to_string());
            }
            start = end;
        }
    }

    let tail = paragraph[start..].trim();
    if !tail.is_empty() {
        out.push(tail.to_string());
    }

    out
}

fn plan_words(sentence: &str, ms_per_sentence: u64, offset_ms: u64) -> Vec<TtsWord> {
    let words: Vec<String> = sentence.split_whitespace().filter_map(clean_word).collect();
    if words.is_empty() {
        return Vec::new();
    }

    let total = words.len() as u64;
    let mut out = Vec::with_capacity(words.len());
    for (idx, word) in words.into_iter().enumerate() {
        let word_idx = idx as u64;
        let t0 = offset_ms.saturating_add(ms_per_sentence.saturating_mul(word_idx) / total);
        let t1 = offset_ms.saturating_add(ms_per_sentence.saturating_mul(word_idx + 1) / total);
        out.push(TtsWord {
            idx,
            w: word,
            t0,
            t1,
        });
    }
    out
}

fn clean_word(raw: &str) -> Option<String> {
    let trimmed =
        raw.trim_matches(|ch: char| !ch.is_alphanumeric() && ch != '\'' && ch != '-' && ch != '_');
    if trimmed.is_empty() {
        None
    } else {
        Some(trimmed.to_string())
    }
}
