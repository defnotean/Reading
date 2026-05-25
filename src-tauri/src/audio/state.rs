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

    pub fn apply(
        &mut self,
        command: PlaybackCommand,
    ) -> Result<TtsPlaybackState, InvalidTransition> {
        let next = match (self.state, command) {
            (TtsPlaybackState::Idle, PlaybackCommand::Load) => TtsPlaybackState::Loading,
            (TtsPlaybackState::Loading, PlaybackCommand::Start) => TtsPlaybackState::Playing,
            (TtsPlaybackState::Playing, PlaybackCommand::Pause) => TtsPlaybackState::Paused,
            (TtsPlaybackState::Paused, PlaybackCommand::Resume) => TtsPlaybackState::Playing,
            (
                TtsPlaybackState::Loading | TtsPlaybackState::Playing | TtsPlaybackState::Paused,
                PlaybackCommand::Stop,
            ) => TtsPlaybackState::Stopped,
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
