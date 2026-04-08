use tauri::Manager;
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
    ];

    tauri::Builder::default()
        .plugin(
            SqlBuilder::default()
                .add_migrations("sqlite:posture-monitor.db", migrations)
                .build(),
        )
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![save_screenshot, send_notification_with_image])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
