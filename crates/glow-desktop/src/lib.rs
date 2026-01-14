//! # Glow Desktop
//!
//! Tauri desktop application backend for Glow.

mod commands;
mod storage;

use tauri::Manager;

/// Runs the Tauri application.
///
/// # Errors
///
/// Returns an error if the application fails to start.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() -> Result<(), tauri::Error> {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            #[cfg(debug_assertions)]
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_documents,
            commands::get_document,
            commands::create_document,
            commands::update_document,
            commands::delete_document,
        ])
        .run(tauri::generate_context!())
}
