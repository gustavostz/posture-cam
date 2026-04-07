use tauri_plugin_sql::{Builder as SqlBuilder, Migration, MigrationKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![Migration {
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
    }];

    tauri::Builder::default()
        .plugin(
            SqlBuilder::default()
                .add_migrations("sqlite:posture-monitor.db", migrations)
                .build(),
        )
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
