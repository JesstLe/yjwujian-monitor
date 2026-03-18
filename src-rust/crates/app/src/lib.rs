//! Tauri app library: registers commands and initializes the app.

pub mod commands;

pub use std::option::Option;

use data::connection::init_database;
use tracing::info;

pub use commands::search;
pub use commands::watchlist;
pub use commands::settings;
pub use commands::monitor;

pub fn init() {
    tracing_subscriber::fmt()
        .with_env_filter("info")
        .init();

    let db_path = data::connection::default_db_path();
    if let Some(parent) = db_path.parent() {
        std::fs::create_dir_all(parent).ok();
    }
    init_database(db_path).expect("Failed to initialize database");

    info!("App initialized");
}

pub fn run() {
    init();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            crate::commands::search::search_items,
            crate::commands::watchlist::get_watchlist,
            crate::commands::watchlist::add_to_watchlist,
            crate::commands::watchlist::remove_from_watchlist,
            crate::commands::watchlist::update_target_price,
            crate::commands::settings::get_settings,
            crate::commands::settings::save_settings,
            crate::commands::monitor::start_monitor,
            crate::commands::monitor::stop_monitor,
            crate::commands::monitor::check_now,
            crate::commands::monitor::get_status,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
