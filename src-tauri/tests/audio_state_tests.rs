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
