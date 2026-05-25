use serde::{Deserialize, Serialize};

use crate::audio::chunk::{plan_novel_chunks, TtsChunk};

pub trait AudioDriver: Send + Sync + 'static {
    fn prepare(&self, request: TtsRequest) -> Result<PreparedAudio, AudioError>;
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TtsRequest {
    pub session_id: String,
    pub chapter_id: String,
    pub text: String,
    pub speed: f32,
    pub voice_id: String,
    pub emotion_intensity: f32,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PreparedAudio {
    pub session_id: String,
    pub chapter_id: String,
    pub chunks: Vec<TtsChunk>,
    pub duration_ms: u64,
    pub audio_bytes: Vec<u8>,
}

#[derive(Debug, Clone, PartialEq, Eq, thiserror::Error)]
pub enum AudioError {
    #[error("TTS request did not produce any readable chunks")]
    EmptyText,
}

#[derive(Debug, Default, Clone)]
pub struct FakeAudioDriver;

impl AudioDriver for FakeAudioDriver {
    fn prepare(&self, request: TtsRequest) -> Result<PreparedAudio, AudioError> {
        let chunks = plan_novel_chunks(&request.text, 1_000);
        if chunks.is_empty() {
            return Err(AudioError::EmptyText);
        }
        let duration_ms = chunks
            .iter()
            .flat_map(|chunk| chunk.words.iter())
            .map(|word| word.t1)
            .max()
            .unwrap_or(0);

        Ok(PreparedAudio {
            session_id: request.session_id,
            chapter_id: request.chapter_id,
            chunks,
            duration_ms,
            audio_bytes: Vec::new(),
        })
    }
}
