//! Tauri application library for Glow.

/// Runs the Tauri application.
///
/// # Panics
///
/// Panics if the application fails to start.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    glow_desktop::run().expect("Failed to run Glow");
}
