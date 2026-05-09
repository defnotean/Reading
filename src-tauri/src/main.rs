#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;

fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .init();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let state = reading_lib::commands::AppState::new(&app.handle())
                .expect("AppState init");
            app.manage(state);
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                tracing::info!("close requested for {}", window.label());
                // SQLite WAL is already flushed on each commit; no extra work needed.
                // No tray, no minimize-on-close — let the OS exit normally.
            }
        })
        .invoke_handler(tauri::generate_handler![
            reading_lib::commands::browse,
            reading_lib::commands::search,
            reading_lib::commands::get_title,
            reading_lib::commands::get_chapter,
            reading_lib::commands::library_list,
            reading_lib::commands::library_set_starred,
            reading_lib::commands::library_is_starred,
            reading_lib::commands::continue_reading,
            reading_lib::commands::record_progress,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
