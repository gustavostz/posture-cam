use tauri::Manager;
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::menu::{Menu, MenuItem};
use tauri_plugin_sql::{Builder as SqlBuilder, Migration, MigrationKind};
use std::fs;
use std::path::PathBuf;

/// Save a base64-encoded JPEG screenshot to the app data directory.
/// Returns the absolute file path for use in OS notifications.
#[tauri::command]
fn save_screenshot(app: tauri::AppHandle, base64_data: String) -> Result<String, String> {
    // Strip the data URL prefix if present (e.g. "data:image/jpeg;base64,")
    let raw_base64 = if let Some(pos) = base64_data.find(",") {
        &base64_data[pos + 1..]
    } else {
        &base64_data
    };

    let bytes = base64_decode(raw_base64).map_err(|e| format!("Base64 decode failed: {}", e))?;

    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Could not resolve app data dir: {}", e))?;

    fs::create_dir_all(&app_data_dir)
        .map_err(|e| format!("Could not create app data dir: {}", e))?;

    let file_path: PathBuf = app_data_dir.join("notification-screenshot.jpg");
    fs::write(&file_path, bytes).map_err(|e| format!("Could not write file: {}", e))?;

    Ok(file_path.to_string_lossy().to_string())
}

/// Send a Windows notification with an image attachment.
/// Falls back to text-only if image fails.
#[tauri::command]
fn send_notification_with_image(
    title: String,
    body: String,
    image_path: Option<String>,
) -> Result<(), String> {
    use notify_rust::Notification;

    let mut notif = Notification::new();
    notif.summary(&title).body(&body).appname("Posture Monitor");

    if let Some(path) = image_path {
        notif.image_path(&path);
    }

    notif.show().map_err(|e| format!("Notification failed: {}", e))?;
    Ok(())
}

fn base64_decode(input: &str) -> Result<Vec<u8>, String> {
    // Simple base64 decoder without pulling in extra crates
    let table = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut buf: Vec<u8> = Vec::with_capacity(input.len() * 3 / 4);
    let mut acc: u32 = 0;
    let mut bits: u32 = 0;

    for &byte in input.as_bytes() {
        if byte == b'=' || byte == b'\n' || byte == b'\r' || byte == b' ' {
            continue;
        }
        let val = table.iter().position(|&c| c == byte)
            .ok_or_else(|| format!("Invalid base64 character: {}", byte as char))? as u32;
        acc = (acc << 6) | val;
        bits += 6;
        if bits >= 8 {
            bits -= 8;
            buf.push((acc >> bits) as u8);
            acc &= (1 << bits) - 1;
        }
    }
    Ok(buf)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create_initial_tables",
            sql: "CREATE TABLE IF NOT EXISTS sessions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    start_time TEXT NOT NULL,
                    end_time TEXT,
                    avg_score REAL DEFAULT 0,
                    good_posture_seconds INTEGER DEFAULT 0,
                    bad_posture_seconds INTEGER DEFAULT 0
                );

                CREATE TABLE IF NOT EXISTS score_snapshots (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id INTEGER NOT NULL,
                    timestamp TEXT NOT NULL,
                    score REAL NOT NULL,
                    shoulder_angle REAL NOT NULL,
                    head_forward_ratio REAL NOT NULL,
                    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS settings (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL
                );

                INSERT OR IGNORE INTO settings (key, value) VALUES ('strictness', '4');
                INSERT OR IGNORE INTO settings (key, value) VALUES ('notifications_enabled', 'true');
                INSERT OR IGNORE INTO settings (key, value) VALUES ('notification_cooldown_sec', '30');
                INSERT OR IGNORE INTO settings (key, value) VALUES ('bad_posture_threshold', '60');
                INSERT OR IGNORE INTO settings (key, value) VALUES ('calibration_data', '');

                CREATE INDEX IF NOT EXISTS idx_snapshots_session ON score_snapshots(session_id);
                CREATE INDEX IF NOT EXISTS idx_snapshots_timestamp ON score_snapshots(timestamp);",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "rename_settings_keys",
            sql: "INSERT OR REPLACE INTO settings (key, value) VALUES ('sensitivity', '3');
                INSERT OR REPLACE INTO settings (key, value) VALUES ('score_threshold', '90');
                DELETE FROM settings WHERE key = 'strictness';
                DELETE FROM settings WHERE key = 'bad_posture_threshold';",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "add_screenshot_setting",
            sql: "INSERT OR IGNORE INTO settings (key, value) VALUES ('show_screenshot_in_alert', 'true');",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "update_default_score_threshold",
            sql: "UPDATE settings SET value = '80' WHERE key = 'score_threshold' AND value = '90';",
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(
            SqlBuilder::default()
                .add_migrations("sqlite:posture-monitor.db", migrations)
                .build(),
        )
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // System tray: hide to tray on close, exit via tray menu
            let show_i = MenuItem::with_id(app, "show", "Show Window", true, None::<&str>)?;
            let quit_i = MenuItem::with_id(app, "quit", "Exit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_i, &quit_i])?;

            TrayIconBuilder::new()
                .tooltip("Posture Monitor")
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .on_menu_event(|app, event| {
                    match event.id().as_ref() {
                        "show" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            // Hide window instead of closing — app stays in system tray
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .invoke_handler(tauri::generate_handler![save_screenshot, send_notification_with_image])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|_app_handle, event| {
            // macOS: restore window when dock icon is clicked
            match event {
                #[cfg(target_os = "macos")]
                tauri::RunEvent::Reopen { has_visible_windows, .. } => {
                    if !has_visible_windows {
                        if let Some(window) = _app_handle.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                }
                _ => {}
            }
        });
}
