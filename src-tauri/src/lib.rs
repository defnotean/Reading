pub mod cache;
pub mod commands;
pub mod db;
pub mod error;
pub mod http;
pub mod library;
pub mod sources;

use tauri::Manager;

pub use error::{AppError, AppResult};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .init();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let state = commands::AppState::new(app.handle()).expect("AppState init");
            app.manage(state);
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                tracing::info!("close requested for {}", window.label());
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::browse,
            commands::search,
            commands::get_title,
            commands::get_chapter,
            commands::library_list,
            commands::library_set_starred,
            commands::library_is_starred,
            commands::continue_reading,
            commands::record_progress,
            commands::from_url,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
